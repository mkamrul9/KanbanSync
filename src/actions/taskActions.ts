'use server'; // Run on the server, not the client

import { prisma } from '../lib/db';
import { revalidatePath } from 'next/cache';
import { TaskStatus, TaskCategory, Priority, TaskActivityType } from '../generated/prisma/client';
import { pusherServer } from '../lib/pusher-server';
import { getUserRole } from '../lib/permission';
import { BoardRole } from '../generated/prisma/client';
import { auth } from '../../auth';
import { notifyAssignedUser } from './notificationActions';
import { logTaskActivity } from '../lib/activity';
import { canPerformBoardAction } from '../lib/permissionsMatrix';

const ARCHIVE_RETENTION_DAYS = 30;

function archiveRetentionCutoff() {
    return new Date(Date.now() - ARCHIVE_RETENTION_DAYS * 86_400_000);
}

function addRecurringOffset(base: Date, recurrence: string) {
    const next = new Date(base);
    if (recurrence === 'DAILY') next.setDate(next.getDate() + 1);
    if (recurrence === 'WEEKLY') next.setDate(next.getDate() + 7);
    if (recurrence === 'MONTHLY') next.setMonth(next.getMonth() + 1);
    return next;
}

export async function moveTask(
    taskId: string,
    newColumnId: string,
    newOrder: number,
    boardId: string,
    options?: {
        overrideBlockedDependency?: boolean;
        overrideReason?: string;
    }
) {
    const session = await auth();
    const role = await getUserRole(boardId);
    if (!role) return { success: false, error: 'Unauthorized' };
    try {
        if (!taskId || !newColumnId || newOrder < 0) {
            return { success: false, error: 'Invalid input' };
        }
        // // Update the database
        // await prisma.$transaction([
        //     // Shift other tasks up
        //     prisma.task.updateMany({
        //         where: { columnId: newColumnId, order: { gte: newOrder }, id: { not: taskId } },
        //         data: { order: { increment: 1 } },
        //     }),

        // Find out which column they are dragging into
        const targetColumn = await prisma.column.findUnique({ where: { id: newColumnId } });
        if (!targetColumn) throw new Error("Column not found");

        // Load current task so we can check the source column and set timestamps
        const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (!existingTask) throw new Error('Task not found');

        // Fetch source column to know if the task is currently in Done
        const sourceColumn = await prisma.column.findUnique({ where: { id: existingTask.columnId } });
        const sourceIsDone = /done|complete/i.test(sourceColumn?.title ?? '');
        const targetType = targetColumn.title.toLowerCase();
        const movingIntoDone = !sourceIsDone && (targetType.includes('done') || targetType.includes('complete') || targetType.includes('completed'));

        if (movingIntoDone) {
            const dependencies = await prisma.taskDependency.findMany({
                where: { taskId },
                include: {
                    dependsOn: {
                        include: {
                            column: {
                                select: { title: true },
                            },
                        },
                    },
                },
            });

            const openBlockers = dependencies.filter((dep) => {
                const blockerStatus = (dep.dependsOn.status ?? '').toLowerCase();
                const blockerColumn = (dep.dependsOn.column?.title ?? '').toLowerCase();
                const blockerCompleted = blockerStatus.includes('done') || blockerStatus.includes('complete') || blockerColumn.includes('done') || blockerColumn.includes('complete');
                return !blockerCompleted;
            });

            if (openBlockers.length > 0) {
                const canOverride = role === BoardRole.LEADER || role === BoardRole.REVIEWER;
                const requestedOverride = !!options?.overrideBlockedDependency;

                if (!requestedOverride || !canOverride) {
                    return {
                        success: false,
                        code: 'BLOCKED_TASK',
                        error: 'Task has unfinished dependencies and cannot be moved to Done.',
                        blockers: openBlockers.map((dep) => dep.dependsOn.title),
                        canOverride,
                    };
                }

                if (!options?.overrideReason || !options.overrideReason.trim()) {
                    return {
                        success: false,
                        code: 'OVERRIDE_REASON_REQUIRED',
                        error: 'Override reason is required to move a blocked task to Done.',
                    };
                }
            }
        }

        if (movingIntoDone && !canPerformBoardAction(role, 'MOVE_TO_DONE')) {
            return { success: false, error: 'Unauthorized: insufficient role to move tasks to Done.' };
        }

        // GUARD: MEMBERs can't move tasks INTO Done, and can't move tasks OUT of Done
        if (role === BoardRole.MEMBER) {
            if (/done|complete/i.test(targetColumn.title) && !sourceIsDone) {
                return { success: false, error: 'Unauthorized: Only Reviewers and Leaders can approve tasks to Done.' };
            }
            if (sourceIsDone && !/done|complete/i.test(targetColumn.title)) {
                return { success: false, error: 'Unauthorized: Only Reviewers and Leaders can move tasks out of Done.' };
            }
        }

        // Prepare update payload and set workflow timestamps
        const updateData: {
            columnId: string;
            order: number;
            status: string;
            startedAt?: Date | null;
            completedAt?: Date | null;
        } = {
            columnId: newColumnId,
            order: newOrder,
            status: targetColumn.title,
        };

        // Use source column classification — not completedAt — so tasks moved to Done
        // before the timestamp migration was run are also handled correctly.
        const wasDone = sourceIsDone;

        // If moving into a 'In Progress' column and we don't have startedAt, set it
        if (targetType.includes('in progress') || targetType.includes('in_progress') || targetType.includes('progress') || targetType.includes('doing')) {
            if (!existingTask.startedAt) updateData.startedAt = new Date();
            // moving out of Done -> always clear completedAt
            if (wasDone) updateData.completedAt = null;
        }

        // If moving into Done, set completedAt (and ensure startedAt exists)
        if (targetType.includes('done') || targetType.includes('complete') || targetType.includes('completed')) {
            if (!existingTask.startedAt) updateData.startedAt = existingTask.createdAt ?? new Date();
            updateData.completedAt = new Date();
        }

        // If moving back to backlog/todo, clear ALL timestamps
        if (targetType.includes('todo') || targetType.includes('backlog')) {
            updateData.startedAt = null;
            updateData.completedAt = null;
        }

        // Catch-all: if the task was in Done and is moving to ANY non-Done column,
        // always clear completedAt (handles Review, QA, or any custom column name)
        if (wasDone && !targetType.includes('done') && !targetType.includes('complete')) {
            updateData.completedAt = null;
        }

        const appliedDependencyOverride = movingIntoDone && !!options?.overrideBlockedDependency && !!options?.overrideReason?.trim();

        try {
            await prisma.task.update({ where: { id: taskId }, data: updateData });
        } catch (err) {
            // If the Prisma client or DB doesn't have the new timestamp fields yet,
            // fall back to a minimal update so dragging still works.
            console.warn('Timestamp update failed, falling back to minimal update:', err);
            await prisma.task.update({
                where: { id: taskId },
                data: { columnId: newColumnId, order: newOrder, status: targetColumn.title },
            });
        }

        await logTaskActivity({
            taskId,
            action: TaskActivityType.MOVED,
            actorId: session?.user?.id,
            message: appliedDependencyOverride
                ? `Moved task from ${sourceColumn?.title ?? 'Unknown'} to ${targetColumn.title} with dependency override`
                : `Moved task from ${sourceColumn?.title ?? 'Unknown'} to ${targetColumn.title}`,
            meta: {
                from: sourceColumn?.title ?? null,
                to: targetColumn.title,
                dependencyOverrideReason: appliedDependencyOverride ? options?.overrideReason?.trim() : null,
            },
        });

        if (movingIntoDone && existingTask.recurrence && existingTask.recurrence !== 'NONE') {
            const boardColumns = await prisma.column.findMany({
                where: { boardId },
                orderBy: { order: 'asc' },
            });

            const resetColumn =
                boardColumns.find((c) => /todo|to do|to-do|backlog/i.test(c.title)) ??
                boardColumns[0] ??
                null;

            if (resetColumn) {
                const lastTaskInResetCol = await prisma.task.findFirst({
                    where: { columnId: resetColumn.id },
                    orderBy: { order: 'desc' },
                });

                const nextDueAt = existingTask.dueAt
                    ? addRecurringOffset(existingTask.dueAt, existingTask.recurrence)
                    : addRecurringOffset(new Date(), existingTask.recurrence);

                const nextReminderAt = existingTask.reminderAt
                    ? addRecurringOffset(existingTask.reminderAt, existingTask.recurrence)
                    : null;

                await prisma.task.create({
                    data: {
                        title: existingTask.title,
                        description: existingTask.description,
                        status: resetColumn.title,
                        category: existingTask.category,
                        recurrence: existingTask.recurrence,
                        order: (lastTaskInResetCol?.order ?? -1) + 1,
                        assigneeId: existingTask.assigneeId,
                        columnId: resetColumn.id,
                        priority: existingTask.priority,
                        tags: existingTask.tags,
                        dueAt: nextDueAt,
                        reminderAt: nextReminderAt,
                        reminderSentAt: null,
                    },
                });
            }
        }

        // Broadcast the change to the specific board's channel
        // Fire Pusher
        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Task moved' });
        revalidatePath(`/board/${boardId}`);

        // Revalidate the cache
        // This tells Next.js: "The data changed, throw away the cached HTML for the board page"
        revalidatePath(`/board/${boardId}`);
        return { success: true };

    } catch (error) {
        console.error("Failed to move task:", error);
        return { success: false, error: 'Failed to update task position' };
    }
}

export async function createTask(
    boardId: string,
    columnId: string,
    title: string,
    status: string,
    category: string,
    description?: string,
    assigneeId?: string,
    priority?: string,
    tags?: string[],
    dueAt?: string,
    reminderAt?: string,
    recurrence?: string,
) {
    const role = await getUserRole(boardId);
    if (!canPerformBoardAction(role, 'CREATE_TASK')) {
        return { success: false, error: 'Unauthorized: Only Leaders can create tasks.' };
    }

    try {
        // Enforce WIP limit server-side
        const column = await prisma.column.findUnique({
            where: { id: columnId },
            include: { _count: { select: { tasks: true } } },
        });
        if (column?.wipLimit !== null && column?.wipLimit !== undefined) {
            if (column._count.tasks >= column.wipLimit) {
                return { success: false, error: `WIP limit of ${column.wipLimit} reached for "${column.title}"` };
            }
        }

        // Get the highest order number in the column to place the new task at the bottom
        const lastTask = await prisma.task.findFirst({
            where: { columnId },
            orderBy: { order: 'desc' },
        });
        const newOrder = lastTask ? lastTask.order + 1 : 0;

        const task = await prisma.task.create({
            data: {
                title,
                status: status as TaskStatus,
                category: category as TaskCategory,
                priority: (priority as Priority) ?? Priority.NONE,
                tags: tags ?? [],
                order: newOrder,
                columnId,
                ...(description ? { description } : {}),
                ...(assigneeId ? { assigneeId } : {}),
                ...(dueAt ? { dueAt: new Date(dueAt) } : {}),
                ...(reminderAt ? { reminderAt: new Date(reminderAt), reminderSentAt: null } : {}),
                ...(recurrence ? { recurrence: recurrence as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' } : {}),
            },
        });

        const session = await auth();
        await logTaskActivity({
            taskId: task.id,
            action: TaskActivityType.CREATED,
            actorId: session?.user?.id,
            message: 'Created this task',
            meta: {
                status,
                category,
            },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Task created' });

        // Notify the assignee (if someone was assigned and it's not the creator)
        if (assigneeId) {
            const board = await prisma.board.findUnique({ where: { id: boardId }, select: { title: true } });
            await notifyAssignedUser(
                assigneeId,
                session?.user?.id ?? null,
                task.id,
                title,
                boardId,
                board?.title ?? null,
            );
        }

        revalidatePath(`/board/${boardId}`);
        return { success: true, task };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to create task:", message);
        return { success: false, error: message };
    }
}


export async function deleteTask(taskId: string, boardId: string) {
    return archiveTask(taskId, boardId);
}

export async function archiveTask(taskId: string, boardId: string) {
    try {
        const role = await getUserRole(boardId);
        if (!canPerformBoardAction(role, 'ARCHIVE_TASK')) {
            return { success: false, error: 'Unauthorized: Only Leaders and Reviewers can archive tasks.' };
        }
        const session = await auth();
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { title: true, status: true },
        });

        if (!task) {
            return { success: false, error: 'Task not found' };
        }

        if (task.status === 'ARCHIVED') {
            return { success: true };
        }

        await prisma.task.update({
            where: { id: taskId },
            data: { status: 'ARCHIVED' },
        });

        await logTaskActivity({
            taskId,
            action: TaskActivityType.UPDATED,
            actorId: session?.user?.id,
            message: `Archived task: ${task.title}`,
            meta: {
                previousStatus: task.status,
            },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Task archived' });
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to archive task:", error);
        return { success: false, error: 'Failed to archive task' };
    }
}

export async function restoreTask(taskId: string, boardId: string) {
    try {
        const role = await getUserRole(boardId);
        if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
            return { success: false, error: 'Unauthorized: Only Leaders and Reviewers can restore tasks.' };
        }

        const session = await auth();
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                title: true,
                status: true,
                updatedAt: true,
                column: { select: { title: true } },
            },
        });

        if (!task) {
            return { success: false, error: 'Task not found' };
        }

        if (task.status !== 'ARCHIVED') {
            return { success: false, error: 'Only archived tasks can be restored.' };
        }

        if (task.updatedAt < archiveRetentionCutoff()) {
            return {
                success: false,
                error: `Restore window expired. Archived tasks can only be restored within ${ARCHIVE_RETENTION_DAYS} days.`,
            };
        }

        const restoredStatus = task.column?.title ?? 'To Do';

        await prisma.task.update({
            where: { id: taskId },
            data: { status: restoredStatus },
        });

        await logTaskActivity({
            taskId,
            action: TaskActivityType.UPDATED,
            actorId: session?.user?.id,
            message: `Restored task: ${task.title}`,
            meta: {
                restoredStatus,
            },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Task restored' });
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to restore task:", error);
        return { success: false, error: 'Failed to restore task' };
    }
}

export async function updateTask(
    taskId: string,
    boardId: string,
    title: string,
    category: string,
    priority?: string,
    tags?: string[],
    dueAt?: string | null,
    reminderAt?: string | null,
    recurrence?: string,
) {
    try {
        const role = await getUserRole(boardId);
        const requiresPriorityPermission = priority !== undefined;
        if (requiresPriorityPermission && !canPerformBoardAction(role, 'PRIORITY_EDIT')) {
            return { success: false, error: 'Unauthorized: insufficient role to edit priority.' };
        }
        if (!role || (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER)) {
            return { success: false, error: 'Unauthorized: insufficient role' };
        }
        const session = await auth();
        await prisma.task.update({
            where: { id: taskId },
            data: {
                title,
                category: category as TaskCategory,
                ...(priority !== undefined ? { priority: priority as Priority } : {}),
                ...(tags !== undefined ? { tags } : {}),
                ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
                ...(reminderAt !== undefined ? { reminderAt: reminderAt ? new Date(reminderAt) : null, reminderSentAt: null } : {}),
                ...(recurrence !== undefined ? { recurrence: recurrence as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' } : {}),
            },
        });

        await logTaskActivity({
            taskId,
            action: TaskActivityType.UPDATED,
            actorId: session?.user?.id,
            message: 'Updated task properties',
            meta: {
                priority: priority ?? null,
                tags: tags ?? null,
                dueAt: dueAt ?? null,
                reminderAt: reminderAt ?? null,
                recurrence: recurrence ?? null,
            },
        });

        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update task:", error);
        return { success: false, error: 'Failed to update task' };
    }
}

export async function restoreArchivedTasks(boardId: string, taskIds?: string[]) {
    try {
        const role = await getUserRole(boardId);
        if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
            return { success: false, error: 'Unauthorized: Only Leaders and Reviewers can restore tasks.' };
        }

        const whereClause = {
            status: 'ARCHIVED',
            column: { boardId },
            ...(taskIds && taskIds.length > 0 ? { id: { in: taskIds } } : {}),
        };

        const archivedTasks = await prisma.task.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                updatedAt: true,
                column: { select: { title: true } },
            },
        });

        if (archivedTasks.length === 0) {
            return { success: true, restoredCount: 0 };
        }

        const cutoff = archiveRetentionCutoff();
        const restorableTasks = archivedTasks.filter((task) => task.updatedAt >= cutoff);

        if (restorableTasks.length === 0) {
            return {
                success: false,
                error: `No archived tasks are within the ${ARCHIVE_RETENTION_DAYS}-day restore window.`,
                restoredCount: 0,
                expiredCount: archivedTasks.length,
            };
        }

        const ids = restorableTasks.map((t) => t.id);
        const session = await auth();

        await prisma.$transaction([
            ...restorableTasks.map((task) =>
                prisma.task.update({
                    where: { id: task.id },
                    data: {
                        status: task.column?.title ?? 'To Do',
                    },
                })
            ),
            ...restorableTasks.map((task) =>
                prisma.taskActivity.create({
                    data: {
                        taskId: task.id,
                        action: TaskActivityType.UPDATED,
                        actorId: session?.user?.id ?? null,
                        message: `Restored task: ${task.title}`,
                        meta: {
                            restoredStatus: task.column?.title ?? 'To Do',
                            restoredFromBulk: true,
                        },
                    },
                })
            ),
        ]);

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Archived tasks restored' });
        revalidatePath(`/board/${boardId}`);
        return {
            success: true,
            restoredCount: ids.length,
            expiredCount: archivedTasks.length - restorableTasks.length,
            retentionDays: ARCHIVE_RETENTION_DAYS,
        };
    } catch (error) {
        console.error('Failed to restore archived tasks:', error);
        return { success: false, error: 'Failed to restore archived tasks' };
    }
}

export async function purgeExpiredArchivedTasks(boardId: string) {
    try {
        const role = await getUserRole(boardId);
        if (role !== BoardRole.LEADER) {
            return { success: false, error: 'Unauthorized: Only Leaders can purge archived tasks.' };
        }

        const cutoff = archiveRetentionCutoff();
        const expiredTasks = await prisma.task.findMany({
            where: {
                status: 'ARCHIVED',
                column: { boardId },
                updatedAt: { lt: cutoff },
            },
            select: { id: true },
        });

        if (expiredTasks.length === 0) {
            return { success: true, deletedCount: 0, retentionDays: ARCHIVE_RETENTION_DAYS };
        }

        await prisma.task.deleteMany({
            where: { id: { in: expiredTasks.map((t) => t.id) } },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Expired archived tasks purged' });
        revalidatePath(`/board/${boardId}`);

        return {
            success: true,
            deletedCount: expiredTasks.length,
            retentionDays: ARCHIVE_RETENTION_DAYS,
        };
    } catch (error) {
        console.error('Failed to purge expired archived tasks:', error);
        return { success: false, error: 'Failed to purge expired archived tasks' };
    }
}