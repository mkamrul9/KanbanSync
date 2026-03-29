import { prisma } from './db';
import { pusherServer } from './pusher-server';

export async function dispatchPendingTaskRemindersForUser(userId: string, boardId: string) {
    if (!userId) return;

    const now = new Date();

    try {
        const dueTasks = await prisma.task.findMany({
            where: {
                assigneeId: userId,
                dueAt: { lte: now },
                completedAt: null,
                column: { boardId },
            },
            select: {
                id: true,
                title: true,
                dueAt: true,
                column: { select: { board: { select: { id: true, title: true } } } },
            },
        });

        for (const task of dueTasks) {
            await pusherServer.trigger(`user-${userId}`, 'notification', {
                type: 'task-overdue',
                taskId: task.id,
                boardId: task.column.board.id,
                boardTitle: task.column.board.title,
                taskTitle: task.title,
                dueAt: task.dueAt,
            });
        }

        const reminderTasks = await prisma.task.findMany({
            where: {
                assigneeId: userId,
                reminderAt: { lte: now },
                completedAt: null,
                column: { boardId },
                reminderSentAt: null,
            },
            select: {
                id: true,
                title: true,
                reminderAt: true,
                column: { select: { board: { select: { id: true, title: true } } } },
            },
        });

        if (reminderTasks.length === 0) return;

        for (const task of reminderTasks) {
            await pusherServer.trigger(`user-${userId}`, 'notification', {
                type: 'task-reminder',
                taskId: task.id,
                boardId: task.column.board.id,
                boardTitle: task.column.board.title,
                taskTitle: task.title,
                reminderAt: task.reminderAt,
            });
        }

        await prisma.task.updateMany({
            where: { id: { in: reminderTasks.map((t) => t.id) } },
            data: { reminderSentAt: now },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // In dev, a stale Next.js server process can hold an old Prisma client shape.
        // We skip reminders instead of crashing the entire board page.
        if (message.includes('Unknown argument `dueAt`') || message.includes('Unknown argument `reminderAt`')) {
            console.warn('Skipping reminders due to stale Prisma client in running dev server. Restart next dev to apply latest schema.');
            return;
        }
        throw error;
    }
}
