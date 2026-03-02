'use server';

import { prisma } from '../lib/db';
import { auth } from '../../auth'; // Adjust path to root auth.ts
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createBoard(formData: FormData) {
    // Verify Authentication
    const session = await auth();
    if (!session?.user?.email) throw new Error('Unauthorized');

    const title = formData.get('title') as string;
    if (!title) throw new Error('Title is required');

    // Look up the user by email so we always use the current DB id,
    // even if the JWT was issued before a DB reset (stale session.user.id).
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) throw new Error('User record not found – please sign out and sign back in.');

    // Create the Board WITH default columns in a single transaction
    const board = await prisma.board.create({
        data: {
            title,
            userId: dbUser.id,
            columns: {
                create: [
                    { title: 'To Do', order: 0 },
                    { title: 'In Progress', order: 1, wipLimit: 3 }, // Strict WIP Limit applied!
                    { title: 'Done', order: 2 },
                ],
            },
        },
    });

    revalidatePath('/');
    // Send the user straight to their new board
    redirect(`/board/${board.id}`);
}