"use client";

import { useState } from 'react';
import InviteMemberModal from './InviteMemberModal';
import NotificationsBell from '../../ui/NotificationsBell';
import type { Board } from '../../../generated/prisma/client';

interface BoardHeaderProps {
    board: Board;
    userRole?: string | null;
    userId?: string | null;
}

export default function BoardHeader({ board, userRole, userId }: BoardHeaderProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    return (
        <header className="flex justify-between items-center p-6 bg-[--ks-bg-elevated] text-[--ks-text-primary] border-b border-[--ks-border]">
            <h1 className="text-xl font-semibold">{board.title}</h1>

            <div className="flex items-center gap-4">
                {/* Show avatars of current members here later */}

                <NotificationsBell userId={userId ?? ''} />

                {/* GUARD: Only show button to Leaders */}
                {userRole === 'LEADER' && (
                    <button
                        onClick={() => setIsInviteOpen(true)}
                        className="px-4 py-2 bg-[--ks-primary] text-white text-sm font-medium rounded-md hover:bg-[--ks-primary-hover] transition-colors"
                    >
                        + Invite Team
                    </button>
                )}
            </div>

            <InviteMemberModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
                boardId={board.id}
            />
        </header>
    );
}
