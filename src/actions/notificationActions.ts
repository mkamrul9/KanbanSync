// src/actions/notificationActions.ts
'use server';

import { prisma } from '../lib/db';
import { pusherServer } from '../lib/pusher-server';
import { revalidatePath } from 'next/cache';
import { auth } from '../../auth';
import { sendDigestEmail } from '../lib/emailDigest';

async function getSessionUserId() {
    const session = await auth();
    if (!session?.user?.email) return null;

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    return dbUser?.id ?? null;
}

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
    const sessionUserId = await getSessionUserId();
    if (!sessionUserId || sessionUserId !== userId) return [];

    const rows = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
            id: true,
            type: true,
            data: true,
            read: true,
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
            read: row.read,
            createdAt: row.createdAt.toISOString(),
        };
    });
}

export async function markNotificationRead(notificationId: string) {
    const sessionUserId = await getSessionUserId();
    if (!sessionUserId) return { success: false, error: 'Unauthorized' };

    const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { userId: true },
    });

    if (!notification || notification.userId !== sessionUserId) {
        return { success: false, error: 'Notification not found' };
    }

    await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });

    return { success: true };
}

export async function markAllNotificationsRead(userId: string) {
    const sessionUserId = await getSessionUserId();
    if (!sessionUserId || sessionUserId !== userId) {
        return { success: false, error: 'Unauthorized' };
    }

    await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
    });

    return { success: true };
}

export async function sendNotificationDigestNow(windowHours = 24) {
    const session = await auth();
    if (!session?.user?.email) {
        return { success: false, error: 'Unauthorized' };
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, name: true },
    });

    if (!dbUser?.id || !dbUser.email) {
        return { success: false, error: 'User not found' };
    }

    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const rows = await prisma.notification.findMany({
        where: {
            userId: dbUser.id,
            read: false,
            createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
            type: true,
            createdAt: true,
            data: true,
        },
    });

    const items = rows.map((row) => {
        const data = (row.data ?? {}) as Record<string, unknown>;
        return {
            type: row.type,
            createdAt: row.createdAt,
            boardTitle: typeof data.boardTitle === 'string' ? data.boardTitle : undefined,
            taskTitle: typeof data.taskTitle === 'string' ? data.taskTitle : undefined,
        };
    });

    await sendDigestEmail({
        toEmail: dbUser.email,
        toName: dbUser.name ?? null,
        unreadCount: rows.length,
        windowHours,
        items,
    });

    await prisma.notification.create({
        data: {
            userId: dbUser.id,
            type: 'digest-sent',
            data: {
                windowHours,
                digestCount: rows.length,
            },
        },
    });

    await pusherServer.trigger(`user-${dbUser.id}`, 'notification', {
        type: 'digest-sent',
        read: false,
        createdAt: new Date().toISOString(),
        excerpt: rows.length > 0
            ? `Digest sent with ${rows.length} unread notification${rows.length === 1 ? '' : 's'}.`
            : 'Digest sent. No unread notifications in the selected window.',
    });

    revalidatePath('/');
    return { success: true, count: rows.length };
}
