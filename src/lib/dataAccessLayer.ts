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

    // Fetch the board AND verify ownership simultaneously
    const board = await prisma.board.findFirst({
        where: {
            id: boardId,
            // SECURITY: Ensure the user is EITHER the creator OR in the members array
            OR: [
                { userId: dbUser.id },
                { members: { some: { userId: dbUser.id } } }
            ]
        },
        include: {
            // Include the members so we can check their roles in the UI later
            members: {
                include: { user: true }
            },
            columns: {
                orderBy: { order: 'asc' },
                include: {
                    tasks: {
                        orderBy: { order: 'asc' },
                        // Include assignees and comments for the new UI
                        include: {
                            assignee: true,
                            comments: { include: { user: true } },
                            subtasks: { orderBy: { order: 'asc' } },
                            attachments: { orderBy: { createdAt: 'desc' } },
                        }
                    },
                },
            },
        },
    });

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