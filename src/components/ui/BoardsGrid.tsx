'use client';

import { type MouseEvent, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { archiveBoard, purgeExpiredArchivedBoards, restoreBoard } from '../../actions/boardActions';
import { isArchiveExpired, parseBoardArchive } from '../../lib/archiveMarkers';

type Board = {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
};

const PAGE_SIZE = 6;
const ARCHIVE_RETENTION_DAYS = 30;

export default function BoardsGrid({ boards }: { boards: Board[] }) {
    const [showAll, setShowAll] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

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

    const visible = showAll ? activeBoards : activeBoards.slice(0, PAGE_SIZE);
    const hidden = activeBoards.length - PAGE_SIZE;

    const onArchiveBoard = (e: MouseEvent, boardId: string) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
            const result = await archiveBoard(boardId);
            setFeedback(result?.success ? 'Board archived.' : (result?.error ?? 'Failed to archive board.'));
        });
    };

    const onRestoreBoard = (boardId: string) => {
        startTransition(async () => {
            const result = await restoreBoard(boardId);
            setFeedback(result?.success ? 'Board restored.' : (result?.error ?? 'Failed to restore board.'));
        });
    };

    const onPurgeExpired = () => {
        startTransition(async () => {
            const result = await purgeExpiredArchivedBoards();
            if (result?.success) {
                setFeedback(`Purged ${result.deletedCount ?? 0} expired archived board${(result.deletedCount ?? 0) === 1 ? '' : 's'}.`);
            } else {
                setFeedback(result?.error ?? 'Failed to purge archived boards.');
            }
        });
    };

    return (
        <>
            {feedback && (
                <div className="col-span-1 sm:col-span-2 md:col-span-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
                    {feedback}
                </div>
            )}

            {visible.map((board) => (
                <Link
                    href={`/board/${board.id}`}
                    key={board.id}
                    data-tour={board.id === visible[0]?.id ? 'open-board-card' : undefined}
                    className="relative app-surface p-6 rounded-2xl shadow-sm border border-slate-200/70 hover:shadow-md hover:border-cyan-300 transition-all group h-36 flex flex-col justify-between"
                >
                    <button
                        type="button"
                        onClick={(e) => onArchiveBoard(e, board.id)}
                        disabled={isPending}
                        className="absolute top-3 right-3 text-[11px] px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                    >
                        Archive
                    </button>
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
            ))}

            {/* Show-more / show-less spanning full row */}
            {activeBoards.length > PAGE_SIZE && (
                <div className="col-span-1 md:col-span-3 flex justify-center">
                    <button
                        onClick={() => setShowAll((v) => !v)}
                        className="text-sm text-cyan-700 hover:underline font-medium"
                    >
                        {showAll
                            ? 'Show fewer boards ↑'
                            : `See ${hidden} previous board${hidden !== 1 ? 's' : ''} ↓`}
                    </button>
                </div>
            )}

            {archivedBoards.length > 0 && (
                <div className="col-span-1 sm:col-span-2 md:col-span-3 rounded-2xl border border-slate-200/80 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <button
                            type="button"
                            onClick={() => setShowArchived((v) => !v)}
                            className="text-sm font-semibold text-slate-700"
                        >
                            Archived Boards ({archivedBoards.length})
                        </button>
                        <button
                            type="button"
                            onClick={onPurgeExpired}
                            disabled={expiredArchivedCount === 0 || isPending}
                            className="text-xs px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                        >
                            Purge expired ({expiredArchivedCount})
                        </button>
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
                                            onClick={() => onRestoreBoard(board.id)}
                                            disabled={expired || isPending}
                                            className="text-xs px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
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
