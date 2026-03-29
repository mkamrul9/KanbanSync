import type { Prisma } from '../generated/prisma/client';

// Plain const — safe to import in Client Components (no Prisma runtime)
export const TaskStatus = {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE',
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export type BoardWithColumnsAndTasks = Prisma.BoardGetPayload<{
    include: {
        members: {
            include: { user: true };
        };
        columns: {
            include: {
                tasks: {
                    include: {
                        assignee: true;
                        comments: { include: { user: true } };
                        subtasks: true;
                        attachments: true;
                    };
                };
            };
        };
    };
}>;