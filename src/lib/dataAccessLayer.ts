import { prisma } from './db';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '../../auth';
import { BoardWithColumnsAndTasks } from '../types/board';


// 'cache' memoizes the result for the duration of the server request
export const getBoardData = cache(async (boardId: string): Promise<BoardWithColumnsAndTasks> => {
    if (!boardId) notFound(); // guard before any DB call

    // 1. Get the current user session
    const session = await auth();
    if (!session?.user?.email) throw new Error('Unauthorized');

    // Look up user by email so ownership check works even with a stale JWT
    // (e.g. after a DB reset, where session.user.id no longer matches the DB row)
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) throw new Error('User record not found – please sign out and sign back in.');

    // 2. Fetch the board AND verify ownership simultaneously
    const board = await prisma.board.findFirst({
        where: {
            id: boardId,
            userId: dbUser.id, // Security checkpoint!
        },
        include: {
            columns: {
                orderBy: { order: 'asc' },
                include: {
                    tasks: {
                        orderBy: { order: 'asc' },
                    },
                },
            },
        },
    });

    if (!board) notFound(); //triggers not-found.tsx (404 page)

    return board;
});


// TODO:
// 5. DAL is incomplete — only one function exists
// A real DAL should cover all data fetching needs:
// export const getUserBoards = cache(async (userId: string) => {...});
// export const getColumnById = cache(async (columnId: string) => {...});
// export const getTaskById   = cache(async (taskId: string) => {...});

// Right now if another component needs user boards, it'll bypass the DAL and write raw Prisma queries inline.