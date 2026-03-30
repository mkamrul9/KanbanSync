// src/actions/member-actions.ts
'use server';

import { prisma } from '../lib/db';
import { getUserRole } from '../lib/permission';
import { BoardRole } from '../generated/prisma/client';
import { revalidatePath } from 'next/cache';
import { pusherServer } from '../lib/pusher-server';
import { auth } from '../../auth';
import { canPerformBoardAction } from '../lib/permissionsMatrix';

/**
 * NOTE: This function was updated to create a pending invite and notify the user
 * instead of instantly adding them as a member. It expects a `BoardInvite` DB
 * model (and optionally a `Notification` model) to exist in Prisma schema. You
 * must run a Prisma migration after adding those models.
 */
export async function inviteMember(boardId: string, email: string, role: BoardRole) {
    // 1. GUARD: Only Leaders can invite people
    const currentRole = await getUserRole(boardId);
    if (!canPerformBoardAction(currentRole, 'INVITE_MEMBER')) {
        return { success: false, error: 'Unauthorized: Only Leaders can invite members.' };
    }

    const session = await auth();
    const inviterId = session?.user?.id ?? null;

    try {
        // 2. Look up the user by their email
        const userToInvite = await prisma.user.findUnique({ where: { email } });

        if (!userToInvite) {
            return { success: false, error: 'User not found. They must log into KanbanSync first.' };
        }

        // 3. Check if they are already on the board
        const existingMember = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: userToInvite.id } },
        });

        if (existingMember) {
            return { success: false, error: 'User is already a member of this board.' };
        }

        // 4. Try to create a pending invite record. If the `BoardInvite` model
        // doesn't exist (e.g., dev hasn't run the migration), fall back to
        // adding the user directly to the board so the invite still works.
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const invite = await (prisma as any).boardInvite.create({
                data: {
                    boardId,
                    userId: userToInvite.id,
                    invitedEmail: userToInvite.email ?? undefined,
                    role,
                    inviterId: inviterId || undefined,
                },
            });

            // 5. Notify the invited user via Pusher (user-scoped channel)
            const board = await prisma.board.findUnique({ where: { id: boardId } });
            const inviter = inviterId ? await prisma.user.findUnique({ where: { id: inviterId } }) : null;

            await pusherServer.trigger(`user-${userToInvite.id}`, 'invite-received', {
                type: 'board-invite',
                boardId,
                inviteId: invite.id,
                boardTitle: board?.title ?? 'A board',
                role,
                inviterName: inviter?.name ?? null,
            });

            revalidatePath(`/board/${boardId}`);
            return { success: true, inviteId: invite.id };
        } catch (innerErr) {
            console.warn('BoardInvite model missing or create failed, falling back to direct add:', innerErr);

            // Fallback: directly add as member (legacy behavior)
            await prisma.boardMember.create({ data: { boardId, userId: userToInvite.id, role } });
            // Notify the user they were added. Include inviter name and board title for clarity.
            const board = await prisma.board.findUnique({ where: { id: boardId } });
            const inviter = inviterId ? await prisma.user.findUnique({ where: { id: inviterId } }) : null;
            await pusherServer.trigger(`user-${userToInvite.id}`, 'notification', {
                type: 'added-to-board',
                boardId,
                boardTitle: board?.title ?? null,
                inviterName: inviter?.name ?? null,
                from: inviterId,
                role,
            });

            revalidatePath(`/board/${boardId}`);
            return { success: true, addedDirectly: true };
        }
    } catch (error) {
        console.error('Failed to invite member:', error);
        return { success: false, error: 'Something went wrong.' };
    }
}