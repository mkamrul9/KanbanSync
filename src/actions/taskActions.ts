'use server'; // Run on the server, not the client

import { prisma } from '../lib/db';
import { revalidatePath } from 'next/cache';
import { TaskStatus, TaskCategory, Priority } from '../generated/prisma/client';
// import { auth } from '../../auth';
import { pusherServer } from '../lib/pusher-server';
import { getUserRole } from '../lib/permission';
import { BoardRole } from '../generated/prisma/client';
import { auth } from '../../auth';
import { notifyAssignedUser } from './notificationActions';

export async function moveTask(
    taskId: string,
    newColumnId: string,
    newOrder: number,
    boardId: string
) {
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

        const targetType = targetColumn.title.toLowerCase();
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
    tags?: string[]
) {
    const role = await getUserRole(boardId);
    if (role !== BoardRole.LEADER) {
        return { success: false, error: 'Unauthorized: Only Leaders can create tasks.' };
    }

    // const session = await auth();
    // if (!session?.user) return { success: false, error: 'Unauthorized' };

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
            },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Task created' });

        // Notify the assignee (if someone was assigned and it's not the creator)
        if (assigneeId) {
            const session = await auth();
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
    try {
        await prisma.task.delete({
            where: { id: taskId },
        });

        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete task:", error);
        return { success: false, error: 'Failed to delete task' };
    }
}

export async function updateTask(
    taskId: string,
    boardId: string,
    title: string,
    category: string,
    priority?: string,
    tags?: string[]
) {
    try {
        await prisma.task.update({
            where: { id: taskId },
            data: {
                title,
                category: category as TaskCategory,
                ...(priority !== undefined ? { priority: priority as Priority } : {}),
                ...(tags !== undefined ? { tags } : {}),
            },
        });

        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update task:", error);
        return { success: false, error: 'Failed to update task' };
    }
}