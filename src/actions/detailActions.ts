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