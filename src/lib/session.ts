import { auth } from '../../auth';
import { prisma } from './db';

/**
 * Retrieves the current session user's database ID.
 * Returns null if the user is not authenticated or not found in the DB.
 * 
 * @returns {Promise<string | null>} The database user ID or null.
 */
export async function getSessionUserId(): Promise<string | null> {
    const session = await auth();
    if (!session?.user?.email) return null;

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    return dbUser?.id ?? null;
}
