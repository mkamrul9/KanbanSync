'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import NotificationsBell from './NotificationsBell';
import InviteMemberModal from '../features/board/InviteMemberModal';
import type { BoardWithColumnsAndTasks } from '../../types/board';
import { parseBoardArchive } from '../../lib/archiveMarkers';

type Props = {
    board: BoardWithColumnsAndTasks;
    userRole?: string | null;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    userImage?: string | null;
    signOutAction: () => Promise<void>;
};

export default function BoardNavbar({
    board, userRole, userId, userName, userEmail, userImage, signOutAction,
}: Props) {
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const initials = userName
        ? userName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    const totalTasks = board.columns.reduce((sum, col) => sum + col.tasks.length, 0);
    const doneTasks = board.columns
        .filter((col) => col.title.toLowerCase().includes('done'))
        .reduce((sum, col) => sum + col.tasks.length, 0);
    const visibleBoardDescription = parseBoardArchive(board.description).original;

    return (
        <>
            <nav data-tour="board-navbar" className="sticky top-0 z-40 w-full bg-white/92 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <div className="px-4 sm:px-6 h-16 flex items-center gap-3">

                    {/* ── Brand / back link ──────────────────────────── */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 shrink-0 hover:opacity-75 transition-opacity"
                        title="Back to Dashboard"
                    >
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow">
                            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                                <rect x="14" y="3" width="7" height="5" rx="1.5" fill="currentColor" />
                                <rect x="14" y="12" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                                <rect x="3" y="16" width="7" height="5" rx="1.5" fill="currentColor" />
                            </svg>
                        </div>
                        <span className="hidden sm:block text-sm font-semibold text-gray-400 tracking-tight">KanbanSync</span>
                    </Link>

                    {/* Breadcrumb chevron */}
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-gray-300 shrink-0 hidden sm:block" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    {/* ── Board title + description ───────────────────── */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold text-gray-900 truncate leading-tight">{board.title}</h1>
                        {visibleBoardDescription && (
                            <p className="text-xs text-gray-400 truncate hidden md:block leading-tight mt-0.5">{visibleBoardDescription}</p>
                        )}
                    </div>

                    {/* ── Stats pills ─────────────────────────────────── */}
                    <div className="hidden lg:flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs px-3 py-1 text-gray-500 font-medium">
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-blue-500" xmlns="http://www.w3.org/2000/svg">
                                <rect x="4" y="4" width="4" height="16" rx="1" fill="currentColor" />
                                <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" opacity="0.7" />
                                <rect x="16" y="6" width="4" height="14" rx="1" fill="currentColor" opacity="0.5" />
                            </svg>
                            {board.columns.length} {board.columns.length === 1 ? 'column' : 'columns'}
                        </span>
                        <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs px-3 py-1 text-gray-500 font-medium">
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-indigo-500" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
                        </span>
                        {doneTasks > 0 && (
                            <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full text-xs px-3 py-1 text-green-700 font-medium">
                                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {doneTasks} done
                            </span>
                        )}
                    </div>

                    {/* ── Right actions ───────────────────────────────── */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto">

                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new Event('ks-open-board-tour'))}
                            data-tour="board-tutorial-button"
                            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors text-gray-700"
                            aria-label="Start board tutorial"
                        >
                            <svg className="w-4 h-4 text-cyan-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 3l8.5 4.5v9L12 21 3.5 16.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                <path d="M12 8.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <circle cx="12" cy="15.8" r="1" fill="currentColor" />
                            </svg>
                            <span className="hidden sm:inline">Tutorial</span>
                        </button>

                        {/* Invite button — LEADER only */}
                        {userRole === 'LEADER' && (
                            <button
                                onClick={() => setIsInviteOpen(true)}
                                data-tour="board-invite-button"
                                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors text-gray-700"
                            >
                                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-blue-500" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="hidden sm:inline">Invite</span>
                            </button>
                        )}

                        {/* Divider */}
                        <div className="w-px h-6 bg-gray-200 mx-1" />

                        {/* Notifications */}
                        <div data-tour="board-notifications">
                            <NotificationsBell userId={userId} />
                        </div>

                        {/* Divider */}
                        <div className="w-px h-6 bg-gray-200 mx-1" />

                        {/* User avatar + dropdown */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setUserMenuOpen((v) => !v)}
                                className="flex items-center gap-2 rounded-full hover:bg-gray-100 transition-colors px-2 py-1"
                                aria-label="User menu"
                            >
                                {userImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={userImage} alt={userName ?? 'User'} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center">
                                        {initials}
                                    </span>
                                )}
                                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-gray-400 hidden sm:block" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 app-bg rounded-xl border border-slate-200 shadow-xl py-1 z-50">
                                    {/* User info */}
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
                                        <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                                    </div>

                                    {/* Dashboard link */}
                                    <Link
                                        href="/"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Dashboard
                                    </Link>

                                    {/* Sign out */}
                                    <form action={signOutAction}>
                                        <button
                                            type="submit"
                                            className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Sign out
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <InviteMemberModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
                boardId={board.id}
            />
        </>
    );
}
