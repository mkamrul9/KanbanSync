import { prisma } from './db';
import { auth } from '../../auth';
import { BoardRole } from '../generated/prisma/client';

/**
 * Retrieves the board role for the currently authenticated user.
 * Queries the BoardMember table.
 * 
 * @param {string} boardId - The ID of the board to check.
 * @returns {Promise<BoardRole | null>} The user's role (LEADER, REVIEWER, MEMBER) or null if not a member.
 */
export async function getUserRole(boardId: string): Promise<BoardRole | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const member = await prisma.boardMember.findUnique({
        where: {
            boardId_userId: {
                boardId,
                userId: session.user.id
            }
        }
    });

    return member?.role || null;
}