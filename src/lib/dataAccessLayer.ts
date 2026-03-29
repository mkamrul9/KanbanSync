import { prisma } from './db';
import { cache } from 'react';
import { auth } from '../../auth';
import { BoardWithColumnsAndTasks } from '../types/board';


// 'cache' memoizes the result for the duration of the server request
export const getBoardData = cache(async (boardId: string): Promise<BoardWithColumnsAndTasks | null> => {
    if (!boardId) return null; // guard before any DB call

    // Get the current user session
    const session = await auth();
    if (!session?.user?.email) return null;

    // Look up user by email so ownership check works even with a stale JWT
    // after a DB reset, where session.user.id no longer matches the DB row
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) return null;

    const whereClause = {
        id: boardId,
        // SECURITY: Ensure the user is EITHER the creator OR in the members array
        OR: [
            { userId: dbUser.id },
            { members: { some: { userId: dbUser.id } } }
        ]
    };

    // Fetch the board with extended task relations.
    // If the running dev server has a stale Prisma client, fall back gracefully.
    let board: BoardWithColumnsAndTasks | null = null;
    try {
        board = await prisma.board.findFirst({
            where: whereClause,
            include: {
                taskTemplates: {
                    orderBy: { updatedAt: 'desc' },
                },
                members: {
                    include: { user: true }
                },
                columns: {
                    orderBy: { order: 'asc' },
                    include: {
                        tasks: {
                            orderBy: { order: 'asc' },
                            include: {
                                assignee: true,
                                comments: { include: { user: true } },
                                activities: {
                                    orderBy: { createdAt: 'desc' },
                                    include: { actor: true },
                                },
                                blocking: {
                                    include: {
                                        dependsOn: true,
                                    },
                                },
                                blockedBy: {
                                    include: {
                                        task: true,
                                    },
                                },
                                timeEntries: {
                                    orderBy: { createdAt: 'desc' },
                                    include: { user: true },
                                },
                                subtasks: { orderBy: { order: 'asc' } },
                                attachments: { orderBy: { createdAt: 'desc' } },
                            }
                        },
                    },
                },
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isStaleClient =
            message.includes('Unknown argument `subtasks`') ||
            message.includes('Unknown argument `attachments`') ||
            message.includes('Unknown argument `activities`') ||
            message.includes('Unknown argument `taskTemplates`') ||
            message.includes('Unknown argument `blocking`') ||
            message.includes('Unknown argument `blockedBy`') ||
            message.includes('Unknown argument `timeEntries`') ||
            message.includes('task_templates') ||
            message.includes('task_activities') ||
            message.includes('task_dependencies') ||
            message.includes('time_entries');

        if (!isStaleClient) throw error;

        const fallbackBoard = await prisma.board.findFirst({
            where: whereClause,
            include: {
                members: {
                    include: { user: true }
                },
                columns: {
                    orderBy: { order: 'asc' },
                    include: {
                        tasks: {
                            orderBy: { order: 'asc' },
                            include: {
                                assignee: true,
                                comments: { include: { user: true } },
                            }
                        },
                    },
                },
            },
        });

        // Normalize missing relations so UI components can render safely.
        board = fallbackBoard
            ? {
                ...fallbackBoard,
                taskTemplates: [],
                columns: fallbackBoard.columns.map((c) => ({
                    ...c,
                    tasks: c.tasks.map((t) => ({
                        ...t,
                        activities: [],
                            blocking: [],
                            blockedBy: [],
                            timeEntries: [],
                        subtasks: [],
                        attachments: [],
                    })),
                })),
            } as BoardWithColumnsAndTasks
            : null;
    }

    if (!board) return null;

    return board;
});


// TODO:
// 5. DAL is incomplete — only one function exists
// A real DAL should cover all data fetching needs:
// export const getUserBoards = cache(async (userId: string) => {...});
// export const getColumnById = cache(async (columnId: string) => {...});
// export const getTaskById   = cache(async (taskId: string) => {...});

// Right now if another component needs user boards, it'll bypass the DAL and write raw Prisma queries inline.