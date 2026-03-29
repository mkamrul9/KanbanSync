// src/actions/notificationActions.ts
'use server';

import { prisma } from '../lib/db';
import { pusherServer } from '../lib/pusher-server';
import { revalidatePath } from 'next/cache';
import { auth } from '../../auth';

/**
 * Create a mention notification for a list of userIds.
 * This inserts an optional Notification row (if you add the model) and triggers
 * a Pusher event on each user's channel.
 */
export async function notifyMentionedUsers(boardId: string, taskId: string, mentionUserIds: string[], authorId: string, excerpt?: string) {
    // If you have a Notification table, you can create rows here. For now we just trigger Pusher events.
    for (const userId of mentionUserIds) {
        await pusherServer.trigger(`user-${userId}`, 'notification', {
            type: 'mention', boardId, taskId, from: authorId, excerpt,
        });
    }
}

/**
 * Accept a pending invite: create BoardMember, delete invite, notify board and invitee
 */
export async function acceptInvite(inviteId: string) {
    // Requires Prisma models: BoardInvite and BoardMember
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invite = await (prisma as any).boardInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return { success: false, error: 'Invite not found' };

    try {
        await prisma.boardMember.create({ data: { boardId: invite.boardId, userId: invite.userId, role: invite.role } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).boardInvite.delete({ where: { id: inviteId } });

        // Notify the board channel that membership changed
        await pusherServer.trigger(`board-${invite.boardId}`, 'board-updated', { message: 'Member accepted invite' });
        revalidatePath(`/board/${invite.boardId}`);
        // Notify the user (they already know) and optionally the inviter
        await pusherServer.trigger(`user-${invite.userId}`, 'invite-accepted', { boardId: invite.boardId });

        return { success: true };
    } catch (error) {
        console.error('Failed to accept invite:', error);
        return { success: false, error: 'Failed to accept invite' };
    }
}

/**
 * Notify a user that they have been assigned to a task.
 */
export async function notifyAssignedUser(
    assigneeId: string,
    assignedById: string | null,
    taskId: string,
    taskTitle: string,
    boardId: string,
    boardTitle: string | null,
) {
    if (!assigneeId) return;
    if (assigneeId === assignedById) return; // don't ping yourself

    const assigner = assignedById
        ? await prisma.user.findUnique({ where: { id: assignedById }, select: { name: true } })
        : null;

    await pusherServer.trigger(`user-${assigneeId}`, 'notification', {
        type: 'task-assigned',
        taskId,
        boardId,
        boardTitle,
        taskTitle,
        fromName: assigner?.name ?? null,
    });
}

export async function declineInvite(inviteId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invite = await (prisma as any).boardInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return { success: false, error: 'Invite not found' };

    try {
        // delete the pending invite
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).boardInvite.delete({ where: { id: inviteId } });

        // notify the inviter that the invite was declined
        if (invite.inviterId) {
            await pusherServer.trigger(`user-${invite.inviterId}`, 'invite-declined', {
                type: 'invite-declined',
                inviteId,
                boardId: invite.boardId,
                declinedBy: invite.userId || null,
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to decline invite:', error);
        return { success: false, error: 'Failed to decline invite' };
    }
}

export async function getRecentNotifications(userId: string) {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) return [];

    const rows = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
            id: true,
            type: true,
            data: true,
            createdAt: true,
        },
    });

    return rows.map((row) => {
        const data = (row.data ?? {}) as Record<string, unknown>;
        return {
            id: row.id,
            type: row.type,
            boardId: typeof data.boardId === 'string' ? data.boardId : undefined,
            taskId: typeof data.taskId === 'string' ? data.taskId : undefined,
            from: typeof data.from === 'string' ? data.from : undefined,
            fromName: typeof data.fromName === 'string' ? data.fromName : null,
            excerpt: typeof data.excerpt === 'string' ? data.excerpt : undefined,
            inviteId: typeof data.inviteId === 'string' ? data.inviteId : undefined,
            boardTitle: typeof data.boardTitle === 'string' ? data.boardTitle : undefined,
            taskTitle: typeof data.taskTitle === 'string' ? data.taskTitle : undefined,
            inviterName: typeof data.inviterName === 'string' ? data.inviterName : null,
            role: typeof data.role === 'string' ? data.role : null,
            createdAt: row.createdAt.toISOString(),
        };
    });
}
