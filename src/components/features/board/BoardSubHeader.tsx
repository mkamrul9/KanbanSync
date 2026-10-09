'use client';

import { useState } from 'react';
import Link from 'next/link';
import InviteMemberModal from './InviteMemberModal';
import BoardSettingsModal from './BoardSettingsModal';
import type { BoardWithColumnsAndTasks } from '../../../types/board';
import { isColumnArchived, parseBoardArchive } from '../../../lib/archiveMarkers';

interface BoardSubHeaderProps {
    board: BoardWithColumnsAndTasks;
    userRole?: string | null;
}

export default function BoardSubHeader({ board, userRole }: BoardSubHeaderProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isBoardSettingsOpen, setIsBoardSettingsOpen] = useState(false);
    const [boardSettingsSeed, setBoardSettingsSeed] = useState(0);

    const totalTasks = board.columns.reduce((sum, col) => sum + col.tasks.length, 0);
    const doneTasks = board.columns
        .filter((col) => col.title.toLowerCase().includes('done'))
        .reduce((sum, col) => sum + col.tasks.length, 0);
    const visibleBoardDescription = parseBoardArchive(board.description).original;
    const editableColumns = board.columns.filter((col) => !isColumnArchived(col.title));

    return (
        <div className="app-surface border-b border-[--ks-border]">
            <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                {/* ── Left: Back link + progress pill (moved from navbar) ─── */}
                <div className="flex items-center gap-3 flex-wrap">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1.5 text-sm font-medium text-[--ks-text-muted] hover:text-[--ks-text-primary] transition-colors duration-[150ms] shrink-0 group"
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Back to Boards
                    </Link>

                    <div className="hidden sm:block w-px h-4 bg-[--ks-border]" />

                    {/* Progress pill showing done / total tasks */}
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 bg-[--ks-bg-card] border border-[--ks-border] rounded-full text-xs px-2.5 py-1 text-[--ks-text-muted] font-medium">
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-indigo-500" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
                        </span>
                        {doneTasks > 0 && (
                            <span className="flex items-center gap-1.5 bg-[--ks-success-subtle] border border-green-500/20 rounded-full text-xs px-2.5 py-1 text-[--ks-success] font-medium">
                                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {doneTasks} done
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Right: Board actions (Tutorial, Settings, Invite) ─── */}
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('ks-open-board-tour'))}
                        data-tour="board-tutorial-button"
                        className="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-[--ks-border] hover:bg-[--ks-bg-overlay] text-[--ks-text-secondary] hover:text-[--ks-text-primary] transition-colors duration-[150ms]"
                        aria-label="Start board tutorial"
                    >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[--ks-primary]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 3l8.5 4.5v9L12 21 3.5 16.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                            <path d="M12 8.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <circle cx="12" cy="15.8" r="1" fill="currentColor" />
                        </svg>
                        <span className="hidden sm:inline">Tutorial</span>
                    </button>

                    {/* Settings button — LEADER only */}
                    {userRole === 'LEADER' && (
                        <button
                            type="button"
                            onClick={() => {
                                setBoardSettingsSeed((prev) => prev + 1);
                                setIsBoardSettingsOpen(true);
                            }}
                            data-tour="board-settings-button"
                            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-[--ks-border] hover:bg-[--ks-bg-overlay] text-[--ks-text-secondary] hover:text-[--ks-text-primary] transition-colors duration-[150ms]"
                        >
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span className="hidden sm:inline">Settings</span>
                        </button>
                    )}

                    {/* Invite button — LEADER only */}
                    {userRole === 'LEADER' && (
                        <button
                            type="button"
                            onClick={() => setIsInviteOpen(true)}
                            data-tour="board-invite-button"
                            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-[--ks-border] hover:bg-[--ks-bg-overlay] text-[--ks-text-secondary] hover:text-[--ks-text-primary] transition-colors duration-[150ms]"
                        >
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[--ks-primary]" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="hidden sm:inline">Invite</span>
                        </button>
                    )}
                </div>
            </div>

            <InviteMemberModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
                boardId={board.id}
            />

            <BoardSettingsModal
                key={`board-settings-${board.id}-${boardSettingsSeed}`}
                isOpen={isBoardSettingsOpen}
                onClose={() => setIsBoardSettingsOpen(false)}
                boardId={board.id}
                initialTitle={board.title}
                initialDescription={visibleBoardDescription}
                initialColumns={editableColumns.map((column) => ({
                    id: column.id,
                    title: column.title,
                    wipLimit: column.wipLimit,
                }))}
            />
        </div>
    );
}
