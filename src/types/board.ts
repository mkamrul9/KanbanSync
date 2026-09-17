import type { Prisma } from '../generated/prisma/client';

/**
 * Convenience const-enum for task status values.
 * Safe to import in Client Components as it has no Prisma runtime dependency.
 *
 * @example
 * if (task.status === TaskStatus.DONE) { ... }
 */
export const TaskStatus = {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE',
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

/**
 * The primary board type used throughout the application.
 *
 * This is a deeply-nested Prisma payload type that includes every relation
 * that the Kanban board UI requires: columns, tasks, members, comments,
 * activities, subtasks, attachments, time entries, and dependency links.
 *
 * Generated from `Prisma.BoardGetPayload<...>` so it stays in sync with the
 * database schema automatically after every `prisma generate`.
 *
 * @see `src/lib/dataAccessLayer.ts` — for the query that fetches this shape.
 */
export type BoardWithColumnsAndTasks = Prisma.BoardGetPayload<{
    include: {
        taskTemplates: true;
        members: {
            include: { user: true };
        };
        columns: {
            include: {
                tasks: {
                    include: {
                        assignee: true;
                        comments: { include: { user: true } };
                        activities: { include: { actor: true } };
                        blocking: { include: { dependsOn: true } };
                        blockedBy: { include: { task: true } };
                        timeEntries: { include: { user: true } };
                        subtasks: true;
                        attachments: true;
                    };
                };
            };
        };
    };
}>;