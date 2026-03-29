// src/actions/detail-actions.ts
'use server';

import { prisma } from '../lib/db';
import { auth } from '../../auth';
import { revalidatePath } from 'next/cache';
import { pusherServer } from '../lib/pusher-server';
import { TaskActivityType } from '../generated/prisma/client';
import { logTaskActivity } from '../lib/activity';
import { getUserRole } from '../lib/permission';
import { BoardRole } from '../generated/prisma/enums';

export async function addComment(taskId: string, boardId: string, text: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const comment = await prisma.comment.create({
            data: {
                text,
                taskId,
                userId: session.user.id,
            },
            include: { user: true } // Return user info so UI updates instantly
        });

        await logTaskActivity({
            taskId,
            action: TaskActivityType.COMMENTED,
            actorId: session.user.id,
            message: 'Added a comment',
            meta: { commentId: comment.id },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'New comment' });

        // Detect mentions: @alice@example.com or @username
        // Use /@(\S+)/g so the entire token including the inner @ is captured
        const mentionRegex = /@(\S+)/g;
        const mentions = new Set<string>();
        let mm: RegExpExecArray | null;
        while ((mm = mentionRegex.exec(text)) !== null) {
            mentions.add(mm[1].replace(/[.,!?;]+$/, '')); // strip trailing punctuation
        }

        if (mentions.size > 0) {
            const terms = Array.from(mentions);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const orClauses: any[] = [];
            const emails: string[] = [];
            for (const t of terms) {
                if (t.includes('@')) {
                    emails.push(t);           // full email like alice@example.com
                } else {
                    orClauses.push({ name: { contains: t, mode: 'insensitive' } });
                }
            }
            if (emails.length > 0) orClauses.push({ email: { in: emails } });

            if (orClauses.length > 0) {
                const [users, board, author] = await Promise.all([
                    prisma.user.findMany({ where: { OR: orClauses } }),
                    prisma.board.findUnique({ where: { id: boardId } }),
                    prisma.user.findUnique({ where: { id: session.user.id } }),
                ]);

                for (const u of users) {
                    if (u.id === session.user.id) continue; // don't notify yourself
                    await pusherServer.trigger(`user-${u.id}`, 'notification', {
                        type: 'mention',
                        boardId,
                        taskId,
                        from: session.user.id,
                        fromName: author?.name ?? null,
                        boardTitle: board?.title ?? null,
                        excerpt: text.slice(0, 200),
                    });
                }
            }
        }

        revalidatePath(`/board/${boardId}`);
        return { success: true, comment };
    } catch (error) {
        console.error('Failed to add comment:', error);
        return { success: false, error: 'Failed to add comment' };
    }
}

export async function updateTaskDescription(taskId: string, boardId: string, description: string) {
    try {
        const role = await getUserRole(boardId);
        if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
            return { success: false, error: 'Unauthorized: insufficient role' };
        }
        const session = await auth();
        await prisma.task.update({
            where: { id: taskId },
            data: { description },
        });

        await logTaskActivity({
            taskId,
            action: TaskActivityType.UPDATED,
            actorId: session?.user?.id,
            message: 'Updated task description',
        });
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to update description:', error);
        return { success: false, error: 'Failed to update description' };
    }
}

export async function assignTask(taskId: string, boardId: string, assigneeId: string) {
    try {
        const role = await getUserRole(boardId);
        if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
            return { success: false, error: 'Unauthorized: insufficient role' };
        }
        const session = await auth();
        const [task, board] = await Promise.all([
            prisma.task.findUnique({ where: { id: taskId }, select: { title: true } }),
            prisma.board.findUnique({ where: { id: boardId }, select: { title: true } }),
        ]);

        await prisma.task.update({
            where: { id: taskId },
            data: { assigneeId },
        });

        await logTaskActivity({
            taskId,
            action: TaskActivityType.ASSIGNED,
            actorId: session?.user?.id,
            message: 'Changed assignee',
            meta: { assigneeId },
        });
        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Task assigned' });

        // Notify the newly assigned user
        const { notifyAssignedUser } = await import('./notificationActions');
        await notifyAssignedUser(
            assigneeId,
            session?.user?.id ?? null,
            taskId,
            task?.title ?? 'A task',
            boardId,
            board?.title ?? null,
        );

        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to assign task:', error);
        return { success: false, error: 'Failed to assign task' };
    }
}

export async function addSubtask(taskId: string, boardId: string, title: string) {
    if (!title.trim()) return { success: false, error: 'Title is required' };
    try {
        const role = await getUserRole(boardId);
        if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
            return { success: false, error: 'Unauthorized: insufficient role' };
        }
        const last = await prisma.subtask.findFirst({
            where: { taskId },
            orderBy: { order: 'desc' },
        });

        const subtask = await prisma.subtask.create({
            data: {
                taskId,
                title: title.trim(),
                order: (last?.order ?? -1) + 1,
            },
        });

        const session = await auth();
        await logTaskActivity({
            taskId,
            action: TaskActivityType.SUBTASK_ADDED,
            actorId: session?.user?.id,
            message: `Added checklist item: ${subtask.title}`,
            meta: { subtaskId: subtask.id },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Subtask added' });
        revalidatePath(`/board/${boardId}`);
        return { success: true, subtask };
    } catch (error) {
        console.error('Failed to add subtask:', error);
        return { success: false, error: 'Failed to add subtask' };
    }
}

export async function toggleSubtask(subtaskId: string, boardId: string, done: boolean) {
    try {
        const subtask = await prisma.subtask.update({
            where: { id: subtaskId },
            data: { done },
        });

        const session = await auth();
        await logTaskActivity({
            taskId: subtask.taskId,
            action: TaskActivityType.SUBTASK_TOGGLED,
            actorId: session?.user?.id,
            message: `${done ? 'Completed' : 'Reopened'} checklist item: ${subtask.title}`,
            meta: { subtaskId: subtask.id, done },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Subtask updated' });
        revalidatePath(`/board/${boardId}`);
        return { success: true, subtask };
    } catch (error) {
        console.error('Failed to toggle subtask:', error);
        return { success: false, error: 'Failed to toggle subtask' };
    }
}

export async function deleteSubtask(subtaskId: string, boardId: string) {
    try {
        const role = await getUserRole(boardId);
        if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
            return { success: false, error: 'Unauthorized: insufficient role' };
        }
        const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
        await prisma.subtask.delete({ where: { id: subtaskId } });

        if (subtask) {
            const session = await auth();
            await logTaskActivity({
                taskId: subtask.taskId,
                action: TaskActivityType.SUBTASK_DELETED,
                actorId: session?.user?.id,
                message: `Deleted checklist item: ${subtask.title}`,
                meta: { subtaskId },
            });
        }
        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Subtask deleted' });
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to delete subtask:', error);
        return { success: false, error: 'Failed to delete subtask' };
    }
}

export async function addTaskAttachment(taskId: string, boardId: string, name: string, url: string) {
    if (!name.trim() || !url.trim()) return { success: false, error: 'Name and URL are required' };
    try {
        const role = await getUserRole(boardId);
        if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
            return { success: false, error: 'Unauthorized: insufficient role' };
        }
        const attachment = await prisma.attachment.create({
            data: {
                taskId,
                name: name.trim(),
                url: url.trim(),
            },
        });

        const session = await auth();
        await logTaskActivity({
            taskId,
            action: TaskActivityType.ATTACHMENT_ADDED,
            actorId: session?.user?.id,
            message: `Added attachment: ${attachment.name}`,
            meta: { attachmentId: attachment.id },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Attachment added' });
        revalidatePath(`/board/${boardId}`);
        return { success: true, attachment };
    } catch (error) {
        console.error('Failed to add attachment:', error);
        return { success: false, error: 'Failed to add attachment' };
    }
}

export async function deleteTaskAttachment(attachmentId: string, boardId: string) {
    try {
        const role = await getUserRole(boardId);
        if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
            return { success: false, error: 'Unauthorized: insufficient role' };
        }
        const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
        await prisma.attachment.delete({ where: { id: attachmentId } });

        if (attachment) {
            const session = await auth();
            await logTaskActivity({
                taskId: attachment.taskId,
                action: TaskActivityType.ATTACHMENT_DELETED,
                actorId: session?.user?.id,
                message: `Removed attachment: ${attachment.name}`,
                meta: { attachmentId },
            });
        }
        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Attachment deleted' });
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to delete attachment:', error);
        return { success: false, error: 'Failed to delete attachment' };
    }
}

export async function saveTaskAsTemplate(taskId: string, boardId: string, name: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
    if (!name.trim()) return { success: false, error: 'Template name is required' };

    try {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) return { success: false, error: 'Task not found' };

        const template = await prisma.taskTemplate.create({
            data: {
                boardId,
                createdById: session.user.id,
                name: name.trim(),
                title: task.title,
                description: task.description,
                category: task.category,
                priority: task.priority,
                tags: task.tags,
                recurrence: task.recurrence,
            },
        });

        await logTaskActivity({
            taskId,
            action: TaskActivityType.TEMPLATE_SAVED,
            actorId: session.user.id,
            message: `Saved template: ${template.name}`,
            meta: { templateId: template.id },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Template saved' });
        revalidatePath(`/board/${boardId}`);
        return { success: true, template };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save template';
        if (message.toLowerCase().includes('unique')) {
            return { success: false, error: 'Template name already exists on this board' };
        }
        console.error('Failed to save template:', error);
        return { success: false, error: 'Failed to save template' };
    }
}

export async function addTaskDependency(taskId: string, dependsOnTaskId: string, boardId: string) {
    const role = await getUserRole(boardId);
    if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
        return { success: false, error: 'Unauthorized: insufficient role' };
    }

    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
    if (!taskId || !dependsOnTaskId || taskId === dependsOnTaskId) {
        return { success: false, error: 'Invalid dependency selection' };
    }

    try {
        const dependency = await prisma.taskDependency.create({
            data: {
                taskId,
                dependsOnTaskId,
                createdById: session.user.id,
            },
            include: {
                dependsOn: true,
            },
        });

        await logTaskActivity({
            taskId,
            action: TaskActivityType.DEPENDENCY_ADDED,
            actorId: session.user.id,
            message: `Added dependency: blocked by ${dependency.dependsOn.title}`,
            meta: { dependsOnTaskId },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Dependency added' });
        revalidatePath(`/board/${boardId}`);
        return { success: true, dependency };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add dependency';
        if (message.toLowerCase().includes('unique')) {
            return { success: false, error: 'Dependency already exists' };
        }
        console.error('Failed to add dependency:', error);
        return { success: false, error: 'Failed to add dependency' };
    }
}

export async function removeTaskDependency(dependencyId: string, boardId: string) {
    const role = await getUserRole(boardId);
    if (role !== BoardRole.LEADER && role !== BoardRole.REVIEWER) {
        return { success: false, error: 'Unauthorized: insufficient role' };
    }

    const session = await auth();

    try {
        const dependency = await prisma.taskDependency.findUnique({
            where: { id: dependencyId },
            include: { dependsOn: true },
        });

        if (!dependency) return { success: false, error: 'Dependency not found' };

        await prisma.taskDependency.delete({ where: { id: dependencyId } });

        await logTaskActivity({
            taskId: dependency.taskId,
            action: TaskActivityType.DEPENDENCY_REMOVED,
            actorId: session?.user?.id,
            message: `Removed dependency on ${dependency.dependsOn.title}`,
            meta: { dependencyId },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Dependency removed' });
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to remove dependency:', error);
        return { success: false, error: 'Failed to remove dependency' };
    }
}

export async function addTaskTimeEntry(taskId: string, boardId: string, minutes: number, note?: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return { success: false, error: 'Minutes must be greater than zero' };
    }

    try {
        const timeEntry = await prisma.timeEntry.create({
            data: {
                taskId,
                userId: session.user.id,
                minutes: Math.round(minutes),
                ...(note?.trim() ? { note: note.trim() } : {}),
            },
            include: { user: true },
        });

        await logTaskActivity({
            taskId,
            action: TaskActivityType.TIME_LOGGED,
            actorId: session.user.id,
            message: `Logged ${timeEntry.minutes} minutes`,
            meta: { timeEntryId: timeEntry.id },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Time logged' });
        revalidatePath(`/board/${boardId}`);
        return { success: true, timeEntry };
    } catch (error) {
        console.error('Failed to add time entry:', error);
        return { success: false, error: 'Failed to add time entry' };
    }
}

export async function deleteTaskTimeEntry(timeEntryId: string, boardId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const entry = await prisma.timeEntry.findUnique({ where: { id: timeEntryId } });
        if (!entry) return { success: false, error: 'Time entry not found' };

        const role = await getUserRole(boardId);
        const canDelete = entry.userId === session.user.id || role === BoardRole.LEADER || role === BoardRole.REVIEWER;
        if (!canDelete) {
            return { success: false, error: 'Unauthorized: cannot delete this time entry' };
        }

        await prisma.timeEntry.delete({ where: { id: timeEntryId } });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Time entry deleted' });
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to delete time entry:', error);
        return { success: false, error: 'Failed to delete time entry' };
    }
}