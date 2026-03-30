'use client';

import { useState } from 'react';

interface PinnedBoardsProps {
    userId: string;
    boards: { id: string; title: string; description: string | null }[];
}

export function usePinnedBoards(userId: string, boards: PinnedBoardsProps['boards']) {
    const [pinned, setPinned] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set();
        const pinnedKey = `pinned-boards-${userId}`;
        return new Set(JSON.parse(localStorage.getItem(pinnedKey) || '[]'));
    });

    const pinnedBoards = boards.filter((b) => pinned.has(b.id));
    const unpinnedBoards = boards.filter((b) => !pinned.has(b.id));

    const togglePin = (boardId: string) => {
        const isPinned = pinned.has(boardId);
        setPinned((prev) => {
            const next = new Set(prev);
            if (isPinned) {
                next.delete(boardId);
            } else {
                next.add(boardId);
            }
            return next;
        });

        // Persist to localStorage
        const pinnedKey = `pinned-boards-${userId}`;
        const updatedPinned = new Set(pinned);
        if (isPinned) {
            updatedPinned.delete(boardId);
        } else {
            updatedPinned.add(boardId);
        }
        localStorage.setItem(pinnedKey, JSON.stringify(Array.from(updatedPinned)));
    };

    return {
        pinnedBoards,
        unpinnedBoards,
        togglePin,
        isPinned: (boardId: string) => pinned.has(boardId),
    };
}
