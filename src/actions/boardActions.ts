'use server';

import { prisma } from '../lib/db';
import { auth } from '../../auth'; // Adjust path to root auth.ts
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { BoardRole } from '../generated/prisma/client';

const BOARD_TEMPLATE_COLUMNS: Record<string, Array<{ title: string; order: number; wipLimit?: number }>> = {
    DEFAULT: [
        { title: 'Backlog', order: 0 },
        { title: 'To Do', order: 1 },
        { title: 'In Progress', order: 2, wipLimit: 3 },
        { title: 'Review', order: 3 },
        { title: 'Done', order: 4 },
    ],
    PRODUCT: [
        { title: 'Ideas', order: 0 },
        { title: 'Discovery', order: 1 },
        { title: 'Delivery', order: 2, wipLimit: 4 },
        { title: 'Release Prep', order: 3 },
        { title: 'Shipped', order: 4 },
    ],
    ENGINEERING: [
        { title: 'Backlog', order: 0 },
        { title: 'Ready', order: 1 },
        { title: 'In Development', order: 2, wipLimit: 3 },
        { title: 'Code Review', order: 3 },
        { title: 'QA', order: 4 },
        { title: 'Done', order: 5 },
    ],
    SUPPORT: [
        { title: 'New', order: 0 },
        { title: 'Triage', order: 1 },
        { title: 'Investigating', order: 2, wipLimit: 6 },
        { title: 'Waiting on Customer', order: 3 },
        { title: 'Resolved', order: 4 },
    ],
};

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