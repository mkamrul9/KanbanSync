"use client";

import { useState } from 'react';
import InviteMemberModal from './InviteMemberModal';
import type { Board } from '../../../generated/prisma/client';

interface BoardHeaderProps {
    board: Board;
    userRole?: string | null;
}

export default function BoardHeader({ board, userRole }: BoardHeaderProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    return (
        <header className="flex justify-between items-center p-6 bg-white border-b">
            <h1 className="text-2xl font-bold">{board.title}</h1>

            <div className="flex items-center gap-4">
                {/* Show avatars of current members here later */}

                {/* GUARD: Only show button to Leaders */}
                {userRole === 'LEADER' && (
                    <button
                        onClick={() => setIsInviteOpen(true)}
                        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
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
