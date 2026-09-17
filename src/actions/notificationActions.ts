// src/actions/notificationActions.ts
'use server';

import { prisma } from '../lib/db';
import { pusherServer } from '../lib/pusher-server';
import { revalidatePath } from 'next/cache';
import { auth } from '../../auth';
import { sendDigestEmail } from '../lib/emailDigest';
import { getSessionUserId } from '../lib/session';
/**
 * Dispatches a mention notification to a list of users.
 * Persists the notification to the DB and triggers a real-time Pusher event on each user's private channel.
 * 
 * @param {string} boardId - The ID of the board.
 * @param {string} taskId - The ID of the task where the mention occurred.
 * @param {string[]} mentionUserIds - The array of user IDs to notify.
 * @param {string} authorId - The ID of the user who made the mention.
 * @param {string} [excerpt] - A short snippet of the text containing the mention.
 * @returns {Promise<void>}
 */
export async function notifyMentionedUsers(boardId: string, taskId: string, mentionUserIds: string[], authorId: string, excerpt?: string) {
    if (mentionUserIds.length === 0) return;

    // 1. Persist notifications to the DB
    await Promise.all(mentionUserIds.map(userId =>
        prisma.notification.create({
            data: {
                userId,
                type: 'mention',
                data: { boardId, taskId, from: authorId, excerpt },
            }
        })
    ));

    // 2. Trigger real-time push events concurrently
    await Promise.all(mentionUserIds.map(userId =>
        pusherServer.trigger(`user-${userId}`, 'notification', {
            type: 'mention', boardId, taskId, from: authorId, excerpt,
        })
    ));
}

/**
 * Accepts a pending board invite.
 * Creates a BoardMember record, deletes the pending invite, and notifies both the board and the invitee.
 * 
 * @param {string} inviteId - The ID of the pending invite.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the acceptance operation.
 */
export async function acceptInvite(inviteId: string) {
    const invite = await prisma.boardInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return { success: false, error: 'Invite not found' };

    try {
        if (!invite.userId) return { success: false, error: 'User ID missing on invite' };

        await prisma.boardMember.create({ data: { boardId: invite.boardId, userId: invite.userId, role: invite.role } });
        await prisma.boardInvite.delete({ where: { id: inviteId } });

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
 * Dispatches a real-time notification to a user alerting them that they were assigned to a task.
 * Also persists this notification to the DB.
 * 
 * @param {string} assigneeId - The user ID of the assignee.
 * @param {string|null} assignedById - The user ID of the person making the assignment.
 * @param {string} taskId - The ID of the task.
 * @param {string} taskTitle - The title of the task.
 * @param {string} boardId - The ID of the board.
 * @param {string|null} boardTitle - The title of the board.
 * @returns {Promise<void>}
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

    const dataPayload = {
        taskId,
        boardId,
        boardTitle,
        taskTitle,
        fromName: assigner?.name ?? null,
    };

    // 1. Persist notification
    await prisma.notification.create({
        data: {
            userId: assigneeId,
            type: 'task-assigned',
            data: dataPayload,
        }
    });

    // 2. Trigger real-time event
    await pusherServer.trigger(`user-${assigneeId}`, 'notification', {
        type: 'task-assigned',
        ...dataPayload
    });
}

/**
 * Declines a pending board invite.
 * Deletes the pending invite record and notifies the original inviter.
 * 
 * @param {string} inviteId - The ID of the pending invite.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the decline operation.
 */
export async function declineInvite(inviteId: string) {
    const invite = await prisma.boardInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return { success: false, error: 'Invite not found' };

    try {
        // delete the pending invite
        await prisma.boardInvite.delete({ where: { id: inviteId } });

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

/**
 * Retrieves the most recent notifications for a user (up to 20).
 * Validates that the requesting session matches the target user ID.
 * 
 * @param {string} userId - The user ID to fetch notifications for.
 * @returns {Promise<Array<any>>} The formatted array of recent notifications.
 */
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

/**
 * Marks a specific notification as read.
 * Validates that the notification belongs to the requesting user.
 * 
 * @param {string} notificationId - The ID of the notification.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the operation.
 */
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

/**
 * Marks all unread notifications for a user as read.
 * 
 * @param {string} userId - The user ID.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the operation.
 */
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

/**
 * Aggregates all unread notifications within a time window and sends an email digest.
 * Calculates unread items based on the provided window hours (default: 24h).
 * 
 * @param {number} [windowHours=24] - The lookback window in hours.
 * @returns {Promise<{success: boolean, message?: string, error?: string}>} Result of the digest dispatch.
 */
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
