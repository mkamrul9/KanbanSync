'use server';

import { prisma } from '../lib/db';
import { auth } from '../../auth'; // Adjust path to root auth.ts
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { BoardRole } from '../generated/prisma/client';
import {
    isArchiveExpired,
    isColumnArchived,
    markBoardArchived,
    markColumnArchived,
    parseBoardArchive,
    parseColumnArchive,
} from '../lib/archiveMarkers';

const ARCHIVE_RETENTION_DAYS = 30;

/**
 * Pre-defined column layouts for different types of Kanban boards.
 * Maps a template key to an array of column configurations.
 */
const BOARD_TEMPLATE_COLUMNS: Record<string, Array<{ title: string; order: number; wipLimit?: number }>> = {
    DEFAULT: [
        { title: 'Backlog', order: 0 },
        { title: 'To Do', order: 1 },
        { title: 'In Progress', order: 2, wipLimit: 3 },
        { title: 'Review', order: 3 },
        { title: 'Done', order: 4 },
    ],
    SPRINT: [
        { title: 'Sprint Backlog', order: 0 },
        { title: 'In Progress', order: 1, wipLimit: 5 },
        { title: 'Code Review', order: 2 },
        { title: 'QA', order: 3 },
        { title: 'Done', order: 4 },
    ],
    BUG_TRIAGE: [
        { title: 'Reported', order: 0 },
        { title: 'Triage', order: 1, wipLimit: 8 },
        { title: 'Fix In Progress', order: 2, wipLimit: 4 },
        { title: 'Verify Fix', order: 3 },
        { title: 'Closed', order: 4 },
    ],
    CONTENT: [
        { title: 'Ideas', order: 0 },
        { title: 'Drafting', order: 1, wipLimit: 6 },
        { title: 'Editing', order: 2, wipLimit: 4 },
        { title: 'Scheduled', order: 3 },
        { title: 'Published', order: 4 },
    ],
    HIRING: [
        { title: 'Open Roles', order: 0 },
        { title: 'Screening', order: 1, wipLimit: 10 },
        { title: 'Interview Loop', order: 2, wipLimit: 6 },
        { title: 'Offer', order: 3 },
        { title: 'Hired', order: 4 },
    ],
};

/**
 * Creates a new Kanban board from form data.
 * Validates the user session, parses custom columns or template selections,
 * creates the board with its columns, and automatically sets the creator as LEADER.
 * Optionally invites other members by email.
 * 
 * @param {FormData} formData - Form data containing 'title', 'description', 'template', 'columns', and 'members'.
 * @throws {Error} Will redirect on validation failures or server errors.
 * @returns {Promise<void>} Redirects to the newly created board on success.
 */
export async function createBoard(formData: FormData) {
    try {
        // Verify Authentication
        const session = await auth();
        if (!session?.user?.email) {
            redirect('/login');
        }

        const title = (formData.get('title') as string)?.trim();
        const description = ((formData.get('description') as string) ?? '').trim() || null;
        const template = ((formData.get('template') as string) ?? 'DEFAULT').trim().toUpperCase();
        const columnsRaw = (formData.get('columns') as string) ?? '';
        const membersRaw = (formData.get('members') as string) ?? '';

        if (!title) {
            redirect('/?createBoardError=title');
        }

        // Ensure user exists even if DB was reset after an auth session was issued.
        const dbUser = await prisma.user.upsert({
            where: { email: session.user.email },
            update: {
                name: session.user.name ?? undefined,
                image: session.user.image ?? undefined,
            },
            create: {
                email: session.user.email,
                name: session.user.name,
                image: session.user.image,
            },
        });

        // Parse custom columns (comma-separated) or fallback to selected preset template.
        const columnTitles = columnsRaw.split(',').map(s => s.trim()).filter(Boolean);
        const presetColumns = BOARD_TEMPLATE_COLUMNS[template] ?? BOARD_TEMPLATE_COLUMNS.DEFAULT;
        const columnsToCreate = columnTitles.length > 0
            ? columnTitles.map((t, i) => ({ title: t, order: i }))
            : presetColumns;

        // Create the Board WITH columns
        const board = await prisma.board.create({
            data: {
                title,
                description,
                userId: dbUser.id,
                columns: {
                    create: [...columnsToCreate],
                },
            },
        });

        // Ensure creator is a member/leader of the board.
        await prisma.boardMember.upsert({
            where: {
                boardId_userId: {
                    boardId: board.id,
                    userId: dbUser.id,
                },
            },
            update: { role: BoardRole.LEADER },
            create: {
                boardId: board.id,
                userId: dbUser.id,
                role: BoardRole.LEADER,
            },
        });

        // Invite any optional members (comma-separated emails)
        const memberEmails = membersRaw.split(',').map(s => s.trim()).filter(Boolean);
        if (memberEmails.length > 0) {
            const { inviteMember } = await import('./memberActions');
            for (const email of memberEmails) {
                try {
                    // Invite with default MEMBER role
                    await inviteMember(board.id, email, BoardRole.MEMBER);
                } catch (err) {
                    console.warn('Failed to invite member during board creation', email, err);
                }
            }
        }

        revalidatePath('/');
        // Send the user straight to their new board
        redirect(`/board/${board.id}`);
    } catch (error) {
        console.error('createBoard failed:', error);
        redirect('/?createBoardError=server');
    }
}

/**
 * Retrieves the current authenticated user session and resolves their database ID.
 * Returns null if the user is unauthenticated or not found in the database.
 * 
 * @returns {Promise<{session: any, userId: string} | null>} The session and corresponding database user ID.
 */
async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.email) {
        return null;
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    if (!dbUser) return null;
    return { session, userId: dbUser.id };
}

/**
 * Looks up the specific role (LEADER, REVIEWER, MEMBER) a user has on a given board.
 * 
 * @param {string} boardId - The ID of the board.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<BoardRole | null>} The role of the user, or null if they are not a member.
 */
async function getBoardRoleForUser(boardId: string, userId: string) {
    const membership = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId } },
        select: { role: true },
    });
    return membership?.role ?? null;
}

/**
 * Archives a board by appending an archival marker to its description.
 * Only board leaders or the original creator can archive the board.
 * 
 * @param {string} boardId - The ID of the board to archive.
 * @returns {Promise<{success: boolean, error?: string, alreadyArchived?: boolean}>} Result of the archive operation.
 */
export async function archiveBoard(boardId: string) {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return { success: false, error: 'Unauthorized' };

        const board = await prisma.board.findUnique({
            where: { id: boardId },
            select: { id: true, userId: true, description: true },
        });

        if (!board) return { success: false, error: 'Board not found' };

        const role = await getBoardRoleForUser(boardId, sessionUser.userId);
        const canArchive = board.userId === sessionUser.userId || role === BoardRole.LEADER;
        if (!canArchive) return { success: false, error: 'Only board leaders can archive boards.' };

        if (parseBoardArchive(board.description).archived) {
            return { success: true, alreadyArchived: true };
        }

        await prisma.board.update({
            where: { id: boardId },
            data: { description: markBoardArchived(board.description) },
        });

        revalidatePath('/');
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('archiveBoard failed:', error);
        return { success: false, error: 'Failed to archive board.' };
    }
}

/**
 * Restores a previously archived board by removing the archival marker.
 * Fails if the archive retention period has expired.
 * 
 * @param {string} boardId - The ID of the board to restore.
 * @returns {Promise<{success: boolean, error?: string, alreadyActive?: boolean}>} Result of the restore operation.
 */
export async function restoreBoard(boardId: string) {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return { success: false, error: 'Unauthorized' };

        const board = await prisma.board.findUnique({
            where: { id: boardId },
            select: { id: true, userId: true, description: true },
        });

        if (!board) return { success: false, error: 'Board not found' };

        const role = await getBoardRoleForUser(boardId, sessionUser.userId);
        const canRestore = board.userId === sessionUser.userId || role === BoardRole.LEADER;
        if (!canRestore) return { success: false, error: 'Only board leaders can restore boards.' };

        const archive = parseBoardArchive(board.description);
        if (!archive.archived) return { success: true, alreadyActive: true };
        if (isArchiveExpired(archive.archivedAt, ARCHIVE_RETENTION_DAYS)) {
            return { success: false, error: `Restore window expired (${ARCHIVE_RETENTION_DAYS} days).` };
        }

        await prisma.board.update({
            where: { id: boardId },
            data: { description: archive.original || null },
        });

        revalidatePath('/');
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('restoreBoard failed:', error);
        return { success: false, error: 'Failed to restore board.' };
    }
}

/**
 * Hard deletes any archived boards that have exceeded the retention period (ARCHIVE_RETENTION_DAYS).
 * Scans all boards owned or led by the current user.
 * 
 * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>} The number of deleted boards or an error.
 */
export async function purgeExpiredArchivedBoards() {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return { success: false, error: 'Unauthorized' };

        const membershipBoards = await prisma.boardMember.findMany({
            where: { userId: sessionUser.userId, role: BoardRole.LEADER },
            select: { boardId: true },
        });

        const boardIds = new Set<string>(membershipBoards.map((m) => m.boardId));
        const ownedBoards = await prisma.board.findMany({
            where: { userId: sessionUser.userId },
            select: { id: true },
        });
        for (const board of ownedBoards) boardIds.add(board.id);

        const candidates = await prisma.board.findMany({
            where: { id: { in: Array.from(boardIds) } },
            select: { id: true, description: true },
        });

        const expiredIds = candidates
            .filter((board) => {
                const archive = parseBoardArchive(board.description);
                return archive.archived && isArchiveExpired(archive.archivedAt, ARCHIVE_RETENTION_DAYS);
            })
            .map((board) => board.id);

        if (expiredIds.length > 0) {
            await prisma.board.deleteMany({ where: { id: { in: expiredIds } } });
        }

        revalidatePath('/');
        return { success: true, deletedCount: expiredIds.length };
    } catch (error) {
        console.error('purgeExpiredArchivedBoards failed:', error);
        return { success: false, error: 'Failed to purge archived boards.' };
    }
}

/**
 * Archives a specific column on a board by appending a marker to its title.
 * All non-archived tasks within this column are also marked as ARCHIVED.
 * Requires LEADER role.
 * 
 * @param {string} boardId - The ID of the board containing the column.
 * @param {string} columnId - The ID of the column to archive.
 * @returns {Promise<{success: boolean, error?: string, alreadyArchived?: boolean}>} Result of the archive operation.
 */
export async function archiveColumn(boardId: string, columnId: string) {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return { success: false, error: 'Unauthorized' };

        const role = await getBoardRoleForUser(boardId, sessionUser.userId);
        if (role !== BoardRole.LEADER) {
            return { success: false, error: 'Only board leaders can archive columns.' };
        }

        const column = await prisma.column.findFirst({
            where: { id: columnId, boardId },
            select: { id: true, title: true },
        });

        if (!column) return { success: false, error: 'Column not found' };
        if (parseColumnArchive(column.title).archived) {
            return { success: true, alreadyArchived: true };
        }

        await prisma.$transaction([
            prisma.column.update({
                where: { id: column.id },
                data: { title: markColumnArchived(column.title) },
            }),
            prisma.task.updateMany({
                where: { columnId: column.id, status: { not: 'ARCHIVED' } },
                data: { status: 'ARCHIVED' },
            }),
        ]);

        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('archiveColumn failed:', error);
        return { success: false, error: 'Failed to archive column.' };
    }
}

/**
 * Restores a previously archived column by removing the archival marker from its title.
 * Fails if the archive retention period has expired. Note: does not automatically restore tasks inside.
 * Requires LEADER role.
 * 
 * @param {string} boardId - The ID of the board containing the column.
 * @param {string} columnId - The ID of the column to restore.
 * @returns {Promise<{success: boolean, error?: string, alreadyActive?: boolean}>} Result of the restore operation.
 */
export async function restoreColumn(boardId: string, columnId: string) {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return { success: false, error: 'Unauthorized' };

        const role = await getBoardRoleForUser(boardId, sessionUser.userId);
        if (role !== BoardRole.LEADER) {
            return { success: false, error: 'Only board leaders can restore columns.' };
        }

        const column = await prisma.column.findFirst({
            where: { id: columnId, boardId },
            select: { id: true, title: true },
        });

        if (!column) return { success: false, error: 'Column not found' };

        const archive = parseColumnArchive(column.title);
        if (!archive.archived) return { success: true, alreadyActive: true };
        if (isArchiveExpired(archive.archivedAt, ARCHIVE_RETENTION_DAYS)) {
            return { success: false, error: `Restore window expired (${ARCHIVE_RETENTION_DAYS} days).` };
        }

        await prisma.column.update({
            where: { id: column.id },
            data: { title: archive.original },
        });

        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('restoreColumn failed:', error);
        return { success: false, error: 'Failed to restore column.' };
    }
}

export async function purgeExpiredArchivedColumns(boardId: string) {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return { success: false, error: 'Unauthorized' };

        const role = await getBoardRoleForUser(boardId, sessionUser.userId);
        if (role !== BoardRole.LEADER) {
            return { success: false, error: 'Only board leaders can purge columns.' };
        }

        const columns = await prisma.column.findMany({
            where: { boardId },
            select: { id: true, title: true },
        });

        const expiredIds = columns
            .filter((column) => {
                const archive = parseColumnArchive(column.title);
                return archive.archived && isArchiveExpired(archive.archivedAt, ARCHIVE_RETENTION_DAYS);
            })
            .map((column) => column.id);

        if (expiredIds.length > 0) {
            await prisma.column.deleteMany({ where: { id: { in: expiredIds } } });
        }

        revalidatePath(`/board/${boardId}`);
        return { success: true, deletedCount: expiredIds.length };
    } catch (error) {
        console.error('purgeExpiredArchivedColumns failed:', error);
        return { success: false, error: 'Failed to purge archived columns.' };
    }
}

type BoardColumnInput = {
    id?: string;
    title: string;
    wipLimit?: number | null;
};

/**
 * Updates the settings of an existing board including its title, description, and columns.
 * Supports adding, updating, and deleting columns, but blocks deletion of non-empty columns.
 * Validates against duplicate column titles.
 * Requires LEADER role.
 * 
 * @param {string} boardId - The ID of the board to update.
 * @param {Object} payload - The new settings payload.
 * @param {string} payload.title - The new board title.
 * @param {string|null} payload.description - The new board description.
 * @param {BoardColumnInput[]} payload.columns - The complete list of active columns.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the update operation.
 */
export async function updateBoardSettings(
    boardId: string,
    payload: {
        title: string;
        description: string | null;
        columns: BoardColumnInput[];
    }
) {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return { success: false, error: 'Unauthorized' };

        const role = await getBoardRoleForUser(boardId, sessionUser.userId);
        if (role !== BoardRole.LEADER) {
            return { success: false, error: 'Only board leaders can edit board settings.' };
        }

        const nextTitle = payload.title.trim();
        if (!nextTitle) {
            return { success: false, error: 'Board title is required.' };
        }

        const sanitizedColumns = payload.columns
            .map((column, index) => ({
                id: column.id,
                title: column.title.trim(),
                wipLimit: typeof column.wipLimit === 'number' && Number.isFinite(column.wipLimit)
                    ? Math.max(1, Math.round(column.wipLimit))
                    : null,
                order: index,
            }))
            .filter((column) => column.title.length > 0);

        if (sanitizedColumns.length === 0) {
            return { success: false, error: 'At least one active column is required.' };
        }

        const dupSet = new Set<string>();
        for (const column of sanitizedColumns) {
            const key = column.title.toLowerCase();
            if (dupSet.has(key)) {
                return { success: false, error: `Duplicate column title: ${column.title}` };
            }
            dupSet.add(key);
        }

        const existingColumns = await prisma.column.findMany({
            where: { boardId },
            select: { id: true, title: true },
        });

        const activeColumns = existingColumns.filter((column) => !isColumnArchived(column.title));
        const activeColumnMap = new Map(activeColumns.map((column) => [column.id, column]));
        const incomingIds = new Set(sanitizedColumns.map((column) => column.id).filter((id): id is string => !!id));

        for (const column of sanitizedColumns) {
            if (column.id && !activeColumnMap.has(column.id)) {
                return { success: false, error: 'Invalid column update request.' };
            }
        }

        const columnsToDelete = activeColumns.filter((column) => !incomingIds.has(column.id));
        if (columnsToDelete.length > 0) {
            const nonEmptyColumns = await Promise.all(columnsToDelete.map(async (column) => {
                const taskCount = await prisma.task.count({ where: { columnId: column.id } });
                return { column, taskCount };
            }));

            const blocked = nonEmptyColumns.filter((entry) => entry.taskCount > 0);
            if (blocked.length > 0) {
                return {
                    success: false,
                    error: `Cannot delete non-empty columns: ${blocked.map((entry) => entry.column.title).join(', ')}`,
                };
            }
        }

        await prisma.$transaction(async (tx) => {
            await tx.board.update({
                where: { id: boardId },
                data: {
                    title: nextTitle,
                    description: payload.description?.trim() ? payload.description.trim() : null,
                },
            });

            for (const column of columnsToDelete) {
                await tx.column.delete({ where: { id: column.id } });
            }

            for (const column of sanitizedColumns) {
                if (column.id) {
                    await tx.column.update({
                        where: { id: column.id },
                        data: {
                            title: column.title,
                            order: column.order,
                            wipLimit: column.wipLimit,
                        },
                    });
                } else {
                    await tx.column.create({
                        data: {
                            boardId,
                            title: column.title,
                            order: column.order,
                            wipLimit: column.wipLimit,
                        },
                    });
                }
            }
        });

        revalidatePath('/');
        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('updateBoardSettings failed:', error);
        return { success: false, error: 'Failed to update board settings.' };
    }
}