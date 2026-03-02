// src/actions/member-actions.ts
'use server';

import { prisma } from '../lib/db';
import { getUserRole } from '../lib/permission';
import { BoardRole } from '../generated/prisma/client';
import { revalidatePath } from 'next/cache';

export async function inviteMember(boardId: string, email: string, role: BoardRole) {
    // 1. GUARD: Only Leaders can invite people
    const currentRole = await getUserRole(boardId);
    if (currentRole !== BoardRole.LEADER) {
        return { success: false, error: 'Unauthorized: Only Leaders can invite members.' };
    }

    try {
        // 2. Look up the user by their email
        const userToInvite = await prisma.user.findUnique({
            where: { email },
        })

        if (!userToInvite) {
            return { success: false, error: 'User not found. They must log into KanbanSync first.' };
        }

        // 3. Check if they are already on the board
        const existingMember = await prisma.boardMember.findUnique({
            where: {
                boardId_userId: { boardId, userId: userToInvite.id },
            },
        });

        if (existingMember) {
            return { success: false, error: 'User is already a member of this board.' };
        }

        // 4. Add them to the team
        await prisma.boardMember.create({
            data: {
                boardId,
                userId: userToInvite.id,
                role,
            },
        });

        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to invite member:', error);
        return { success: false, error: 'Something went wrong.' };
    }
}