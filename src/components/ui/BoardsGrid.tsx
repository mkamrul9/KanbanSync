'use client';

import { type MouseEvent, useMemo, useState, useTransition, useEffect, useRef } from 'react';
import Link from 'next/link';
import { archiveBoard, purgeExpiredArchivedBoards, restoreBoard } from '../../actions/boardActions';
import { isArchiveExpired, parseBoardArchive } from '../../lib/archiveMarkers';
import { useToast } from './ToastContainer';
import Tooltip from './Tooltip';

type Board = {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
};

const PAGE_SIZE = 6;
const ARCHIVE_RETENTION_DAYS = 30;

export default function BoardsGrid({ boards, userId }: { boards: Board[]; userId?: string }) {
    const [showAll, setShowAll] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [pinnedBoardIds, setPinnedBoardIds] = useState<Set<string>>(new Set());
    const { success, error } = useToast();
    const hydratedRef = useRef(false);

    // Load pinned boards from localStorage on mount
    useEffect(() => {
        if (!userId || hydratedRef.current) return;
        hydratedRef.current = true;
        const pinnedKey = `pinned-boards-${userId}`;
        try {
            const pinned = JSON.parse(localStorage.getItem(pinnedKey) || '[]');
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPinnedBoardIds(new Set(pinned));
        } catch (e) {
            console.error('Failed to load pinned boards:', e);
        }
    }, [userId]);

    const { activeBoards, archivedBoards, expiredArchivedCount } = useMemo(() => {
        const active: Board[] = [];
        const archived: Array<Board & { archivedAt: Date | null; originalDescription: string }> = [];

        for (const board of boards) {
            const parsed = parseBoardArchive(board.description);
            if (parsed.archived) {
                archived.push({
                    ...board,
                    archivedAt: parsed.archivedAt,
                    originalDescription: parsed.original,
                });
            } else {
                active.push(board);
            }
        }

        const expiredCount = archived.filter((board) => isArchiveExpired(board.archivedAt, ARCHIVE_RETENTION_DAYS)).length;
        return { activeBoards: active, archivedBoards: archived, expiredArchivedCount: expiredCount };
    }, [boards]);

    const pinnedBoards = activeBoards.filter((b) => pinnedBoardIds.has(b.id));
    const unpinnedBoards = activeBoards.filter((b) => !pinnedBoardIds.has(b.id));
    const visibleUnpinned = showAll ? unpinnedBoards : unpinnedBoards.slice(0, PAGE_SIZE);
    const hiddenCount = unpinnedBoards.length - PAGE_SIZE;

    const togglePin = (boardId: string, boardTitle: string) => {
        const isPinned = pinnedBoardIds.has(boardId);
        const newPinned = new Set(pinnedBoardIds);

        if (isPinned) {
            newPinned.delete(boardId);
            success(`"${boardTitle}" unpinned`);
        } else {
            newPinned.add(boardId);
            success(`"${boardTitle}" pinned to top`);
        }

        setPinnedBoardIds(newPinned);
        if (userId) {
            const pinnedKey = `pinned-boards-${userId}`;
            localStorage.setItem(pinnedKey, JSON.stringify(Array.from(newPinned)));
        }
    };

    const onArchiveBoard = (e: MouseEvent, boardId: string, boardTitle: string) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
            const result = await archiveBoard(boardId);
            if (result?.success) {
                success(`"${boardTitle}" archived`);
            } else {
                error(result?.error ?? 'Failed to archive board');
            }
        });
    };

    const onRestoreBoard = (boardId: string, boardTitle: string) => {
        startTransition(async () => {
            const result = await restoreBoard(boardId);
            if (result?.success) {
                success(`"${boardTitle}" restored`);
            } else {
                error(result?.error ?? 'Failed to restore board');
            }
        });
    };

    const onPurgeExpired = () => {
        startTransition(async () => {
            const result = await purgeExpiredArchivedBoards();
            if (result?.success) {
                success(`Purged ${result.deletedCount ?? 0} expired archived board${(result.deletedCount ?? 0) === 1 ? '' : 's'}`);
            } else {
                error(result?.error ?? 'Failed to purge archived boards');
            }
        });
    };

    const renderBoardCard = (board: Board) => (
        <Link
            href={`/board/${board.id}`}
            key={board.id}
            data-tour={board.id === pinnedBoards[0]?.id ? 'open-board-card' : undefined}
            className="relative app-surface p-6 rounded-2xl shadow-sm border border-slate-200/70 hover:shadow-md hover:border-cyan-300 transition-all group h-36 flex flex-col justify-between"
        >
            <div className="absolute top-3 right-3 flex items-center gap-2">
                <Tooltip text={pinnedBoardIds.has(board.id) ? 'Unpin board' : 'Pin board to top'} position="left">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePin(board.id, board.title);
                        }}
                        className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={pinnedBoardIds.has(board.id) ? 'Unpin board' : 'Pin board'}
                    >
                        {pinnedBoardIds.has(board.id) ? (
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2v20M2 12h20" />
                            </svg>
                        )}
                    </button>
                </Tooltip>
                <Tooltip text="Archive board" position="left">
                    <button
                        type="button"
                        onClick={(e) => onArchiveBoard(e, board.id, board.title)}
                        disabled={isPending}
                        className="p-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                        aria-label="Archive board"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8M8 6v8M12 6v8M16 6v8M3 18h18" />
                        </svg>
                    </button>
                </Tooltip>
            </div>
            <div>
                <h2 className="text-xl font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors line-clamp-1 tracking-tight">
                    {board.title}
                </h2>
                {board.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{board.description}</p>
                )}
            </div>
            <span className="text-sm text-slate-500 group-hover:text-cyan-700 transition-colors">Open board &rarr;</span>
        </Link>
    );

    return (
        <>
            {pinnedBoards.length > 0 && (
                <div className="mb-8">
                    <Tooltip text="Pinned boards appear at the top for quick access" position="right">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Pinned Boards</h2>
                    </Tooltip>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {pinnedBoards.map((board) => renderBoardCard(board))}
                    </div>
                </div>
            )}

            <div>
                {unpinnedBoards.length > 0 && (
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Other Boards</h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {visibleUnpinned.map((board) => renderBoardCard(board))}
                </div>

                {/* Show-more / show-less spanning full row */}
                {unpinnedBoards.length > PAGE_SIZE && (
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={() => setShowAll((v) => !v)}
                            className="text-sm text-cyan-700 hover:underline font-medium"
                        >
                            {showAll
                                ? 'Show fewer boards ↑'
                                : `See ${hiddenCount} more board${hiddenCount !== 1 ? 's' : ''} ↓`}
                        </button>
                    </div>
                )}
            </div>

            {archivedBoards.length > 0 && (
                <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <Tooltip text="View archived boards from previous 30 days">
                            <button
                                type="button"
                                onClick={() => setShowArchived((v) => !v)}
                                className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                            >
                                Archived Boards ({archivedBoards.length})
                            </button>
                        </Tooltip>
                        <Tooltip text={`Remove boards archived for more than ${ARCHIVE_RETENTION_DAYS} days`} position="left">
                            <button
                                type="button"
                                onClick={onPurgeExpired}
                                disabled={expiredArchivedCount === 0 || isPending}
                                className="text-xs px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60 transition-colors"
                            >
                                Purge expired ({expiredArchivedCount})
                            </button>
                        </Tooltip>
                    </div>

                    {showArchived && (
                        <div className="space-y-2">
                            {archivedBoards.map((board) => {
                                const expired = isArchiveExpired(board.archivedAt, ARCHIVE_RETENTION_DAYS);
                                return (
                                    <div key={board.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{board.title}</p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {board.originalDescription || 'No description'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRestoreBoard(board.id, board.title)}
                                            disabled={expired || isPending}
                                            className="text-xs px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 transition-colors"
                                        >
                                            {expired ? 'Expired' : 'Restore'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
