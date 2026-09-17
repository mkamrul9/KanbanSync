import { prisma } from './db';
import { TaskActivityType } from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';

type ActivityInput = {
    taskId: string;
    action: TaskActivityType;
    message: string;
    actorId?: string | null;
    meta?: Prisma.InputJsonValue;
};

/**
 * Asynchronously logs a task-related activity event into the database.
 * If the database insertion fails, it logs a warning instead of throwing an error,
 * ensuring that activity tracking does not break core application flows.
 * 
 * @param {ActivityInput} input - The activity details.
 * @returns {Promise<void>}
 */
export async function logTaskActivity(input: ActivityInput) {
    try {
        await prisma.taskActivity.create({
            data: {
                taskId: input.taskId,
                action: input.action,
                message: input.message,
                actorId: input.actorId ?? null,
                ...(input.meta !== undefined ? { meta: input.meta } : {}),
            },
        });
    } catch (error) {
        // Activity logging should never block the main user flow.
        console.warn('Task activity logging skipped:', error);
    }
}
