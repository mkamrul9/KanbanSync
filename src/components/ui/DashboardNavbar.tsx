'use client';

import { useState, useRef, useEffect } from 'react';
import NotificationsBell from './NotificationsBell';
import CreateBoardModal from './CreateBoardModal';
import KanbanSyncLogo from './KanbanSyncLogo';

type Props = {
    userId: string;
    userName: string | null | undefined;
    userEmail: string | null | undefined;
    userImage?: string | null;
    boardCount: number;
    signOutAction: () => Promise<void>;
};

export default function DashboardNavbar({
    userId, userName, userEmail, userImage, boardCount, signOutAction,
}: Props) {
    const [userMenuOpen, setUserMenuOpen] = useState(false);
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

    return (
        <nav className="sticky top-0 z-40 w-full bg-white/92 backdrop-blur-md border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

                {/* ── Brand ────────────────────────────── */}
                <KanbanSyncLogo />

                {/* ── Middle stats ─────────────────────── */}
                <div className="hidden md:flex items-center gap-1 bg-white border border-slate-200 rounded-full px-4 py-1.5 text-sm text-slate-500 shadow-xs">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 mr-1 text-blue-500" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                        <rect x="14" y="3" width="7" height="5" rx="1.5" fill="currentColor" />
                        <rect x="14" y="12" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                        <rect x="3" y="16" width="7" height="5" rx="1.5" fill="currentColor" />
                    </svg>
                    <span className="font-medium text-gray-700">{boardCount}</span>
                    <span className="ml-1">{boardCount === 1 ? 'board' : 'boards'}</span>
                </div>

                {/* ── Right actions ────────────────────── */}
                <div className="flex items-center gap-2 ml-auto">

                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('ks-open-dashboard-tour'))}
                        className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
                        aria-label="Start dashboard tutorial"
                    >
                        <svg className="w-4 h-4 text-cyan-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 3l8.5 4.5v9L12 21 3.5 16.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                            <path d="M12 8.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <circle cx="12" cy="15.8" r="1" fill="currentColor" />
                        </svg>
                        <span className="hidden sm:inline">Tutorial</span>
                    </button>

                    {/* Create Board */}
                    <CreateBoardModal />

                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    {/* Notifications */}
                    <NotificationsBell userId={userId} />

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
                            <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-30 truncate">
                                {userName ?? userEmail}
                            </span>
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

                                {/* Menu items */}
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
    );
}
