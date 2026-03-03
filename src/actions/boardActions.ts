'use server';

import { prisma } from '../lib/db';
import { auth } from '../../auth'; // Adjust path to root auth.ts
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { BoardRole } from '../generated/prisma/client';

export async function createBoard(formData: FormData) {
    // Verify Authentication
    const session = await auth();
    if (!session?.user?.email) throw new Error('Unauthorized');

    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) ?? null;
    const columnsRaw = (formData.get('columns') as string) ?? '';
    const membersRaw = (formData.get('members') as string) ?? '';

    if (!title) throw new Error('Title is required');

    // Look up the user by email so we always use the current DB id,
    // even if the JWT was issued before a DB reset (stale session.user.id).
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) throw new Error('User record not found – please sign out and sign back in.');

    // Parse custom columns (comma-separated) or fallback to defaults
    const columnTitles = columnsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const columnsToCreate = columnTitles.length > 0 ? columnTitles.map((t, i) => ({ title: t, order: i })) : [
        { title: 'Backlog', order: 0 },
        { title: 'To Do', order: 1 },
        { title: 'In Progress', order: 2, wipLimit: 3 },
        { title: 'Review', order: 3 },
        { title: 'Done', order: 4 },
    ];

    // Create the Board WITH columns
    // NOTE: some Prisma client versions or generated clients may not expose
    // nested relation writes for `members`. Create the board first, then
    // create the BoardMember as a separate step to avoid Prisma validation errors.
    const board = await prisma.board.create({
        data: {
            title,
            description: description || null,
            userId: dbUser.id,
            columns: {
                create: [...columnsToCreate],
            },
        },
    });

    // Ensure creator is a member/leader of the board.
    await prisma.boardMember.create({
        data: {
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
}