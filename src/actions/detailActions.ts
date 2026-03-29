// src/actions/detail-actions.ts
'use server';

import { prisma } from '../lib/db';
import { auth } from '../../auth';
import { revalidatePath } from 'next/cache';
import { pusherServer } from '../lib/pusher-server';

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
        await prisma.task.update({
            where: { id: taskId },
            data: { description },
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
        const session = await auth();
        const [task, board] = await Promise.all([
            prisma.task.findUnique({ where: { id: taskId }, select: { title: true } }),
            prisma.board.findUnique({ where: { id: boardId }, select: { title: true } }),
        ]);

        await prisma.task.update({
            where: { id: taskId },
            data: { assigneeId },
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
        await prisma.subtask.delete({ where: { id: subtaskId } });
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
        const attachment = await prisma.attachment.create({
            data: {
                taskId,
                name: name.trim(),
                url: url.trim(),
            },
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
        await prisma.attachment.delete({ where: { id: attachmentId } });
        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Attachment deleted' });
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to delete attachment:', error);
        return { success: false, error: 'Failed to delete attachment' };
    }
}