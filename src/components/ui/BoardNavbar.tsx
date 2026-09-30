'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import NotificationsBell from './NotificationsBell';
import KanbanSyncLogo from './KanbanSyncLogo';
import ThemeToggle from './ThemeToggle';
import InviteMemberModal from '../features/board/InviteMemberModal';
import BoardSettingsModal from '../features/board/BoardSettingsModal';
import type { BoardWithColumnsAndTasks } from '../../types/board';
import { isColumnArchived, parseBoardArchive } from '../../lib/archiveMarkers';

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
    const [isBoardSettingsOpen, setIsBoardSettingsOpen] = useState(false);
    const [boardSettingsSeed, setBoardSettingsSeed] = useState(0);
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
    const editableColumns = board.columns.filter((col) => !isColumnArchived(col.title));

    return (
        <>
            <nav data-tour="board-navbar" className="sticky top-0 z-40 w-full bg-[--ks-bg-elevated]/90 backdrop-blur-md border-b border-[--ks-border] shadow-[--ks-shadow]">
                <div className="px-4 sm:px-6 h-16 flex items-center gap-3">

                    {/* ── Brand / back link ──────────────────────────── */}
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 shrink-0 hover:opacity-75 transition-opacity"
                        title="Back to Dashboard"
                    >
                        <KanbanSyncLogo showText={false} className="w-8 h-8" />
                        <span className="hidden sm:block text-sm font-semibold text-[--ks-text-muted] tracking-tight">KanbanSync</span>
                    </Link>

                    {/* Breadcrumb chevron */}
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[--ks-text-muted] shrink-0 hidden sm:block" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    {/* ── Board title + description ───────────────────── */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-[15px] font-semibold text-[--ks-text-primary] truncate leading-tight">{board.title}</h1>
                        {visibleBoardDescription && (
                            <p className="text-xs text-[--ks-text-muted] truncate hidden md:block leading-tight mt-0.5">{visibleBoardDescription}</p>
                        )}
                    </div>

                    {/* ── Stats pills ─────────────────────────────────── */}
                    <div className="hidden lg:flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 bg-[--ks-bg-card] border border-[--ks-border] rounded-full text-xs px-3 py-1 text-[--ks-text-muted] font-medium">
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-[--ks-primary]" xmlns="http://www.w3.org/2000/svg">
                                <rect x="4" y="4" width="4" height="16" rx="1" fill="currentColor" />
                                <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" opacity="0.7" />
                                <rect x="16" y="6" width="4" height="14" rx="1" fill="currentColor" opacity="0.5" />
                            </svg>
                            {board.columns.length} {board.columns.length === 1 ? 'column' : 'columns'}
                        </span>
                        <span className="flex items-center gap-1.5 bg-[--ks-bg-card] border border-[--ks-border] rounded-full text-xs px-3 py-1 text-[--ks-text-muted] font-medium">
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-indigo-500" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
                        </span>
                        {doneTasks > 0 && (
                            <span className="flex items-center gap-1.5 bg-[--ks-success-subtle] border border-green-500/20 rounded-full text-xs px-3 py-1 text-[--ks-success] font-medium">
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
                            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-[--ks-border] hover:bg-[--ks-bg-overlay] text-[--ks-text-secondary] hover:text-[--ks-text-primary] transition-colors"
                            aria-label="Start board tutorial"
                        >
                            <svg className="w-4 h-4 text-[--ks-primary]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 3l8.5 4.5v9L12 21 3.5 16.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                <path d="M12 8.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <circle cx="12" cy="15.8" r="1" fill="currentColor" />
                            </svg>
                            <span className="hidden sm:inline">Tutorial</span>
                        </button>

                        {/* Invite button — LEADER only */}
                        {userRole === 'LEADER' && (
                            <button
                                onClick={() => {
                                    setBoardSettingsSeed((prev) => prev + 1);
                                    setIsBoardSettingsOpen(true);
                                }}
                                data-tour="board-settings-button"
                                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-[--ks-border] hover:bg-[--ks-bg-overlay] text-[--ks-text-secondary] hover:text-[--ks-text-primary] transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span className="hidden sm:inline">Settings</span>
                            </button>
                        )}

                        {/* Invite button — LEADER only */}
                        {userRole === 'LEADER' && (
                            <button
                                onClick={() => setIsInviteOpen(true)}
                                data-tour="board-invite-button"
                                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-[--ks-border] hover:bg-[--ks-bg-overlay] text-[--ks-text-secondary] hover:text-[--ks-text-primary] transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[--ks-primary]" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="hidden sm:inline">Invite</span>
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <ThemeToggle />

                        {/* Divider */}
                        <div className="w-px h-6 bg-[--ks-border] mx-1" />

                        {/* Notifications */}
                        <div data-tour="board-notifications">
                            <NotificationsBell userId={userId} />
                        </div>

                        {/* Divider */}
                        <div className="w-px h-6 bg-[--ks-border] mx-1" />

                        {/* User avatar + dropdown */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setUserMenuOpen((v) => !v)}
                                className="flex items-center gap-2 rounded-full hover:bg-[--ks-bg-overlay] transition-colors px-2 py-1"
                                aria-label="User menu"
                            >
                                {userImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={userImage} alt={userName ?? 'User'} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <span className="w-8 h-8 rounded-full bg-[--ks-primary] text-white text-sm font-semibold flex items-center justify-center">
                                        {initials}
                                    </span>
                                )}
                                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[--ks-text-muted] hidden sm:block" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-60 bg-[var(--ks-bg-elevated)] rounded-2xl border border-[var(--ks-border)] shadow-[var(--ks-shadow-lg)] p-1.5 z-50 animate-ks-dropdown backdrop-blur-md">
                                    {/* User info */}
                                    <div className="px-3.5 py-3 border-b border-[var(--ks-border)] mb-1">
                                        <p className="text-sm font-semibold text-[var(--ks-text-primary)] truncate">{userName}</p>
                                        <p className="text-xs text-[var(--ks-text-muted)] truncate mt-0.5">{userEmail}</p>
                                    </div>

                                    <div className="space-y-0.5">
                                        {/* Dashboard link */}
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[var(--ks-text-secondary)] hover:text-[var(--ks-text-primary)] hover:bg-[var(--ks-bg-overlay)] transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[var(--ks-text-muted)]" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Dashboard
                                        </Link>

                                        <Link
                                            href="/help"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[var(--ks-text-secondary)] hover:text-[var(--ks-text-primary)] hover:bg-[var(--ks-bg-overlay)] transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[var(--ks-text-muted)]" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 18h.01M10.5 8.5a1.5 1.5 0 113 0c0 1-1.5 1.5-1.5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                            </svg>
                                            Help
                                        </Link>

                                        <Link
                                            href="/about"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[var(--ks-text-secondary)] hover:text-[var(--ks-text-primary)] hover:bg-[var(--ks-bg-overlay)] transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[var(--ks-text-muted)]" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                                <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                            About Us
                                        </Link>

                                        <Link
                                            href="/contact"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[var(--ks-text-secondary)] hover:text-[var(--ks-text-primary)] hover:bg-[var(--ks-bg-overlay)] transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[var(--ks-text-muted)]" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
                                                <path d="M4 8l8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Contact Us
                                        </Link>
                                    </div>

                                    {/* Sign out */}
                                    <form action={signOutAction} className="border-t border-[var(--ks-border)] mt-1.5 pt-1.5">
                                        <button
                                            type="submit"
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[var(--ks-danger)] hover:bg-[var(--ks-danger-subtle)] transition-colors"
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
        </>
    );
}
