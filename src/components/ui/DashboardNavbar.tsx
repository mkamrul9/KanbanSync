'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import NotificationsBell from './NotificationsBell';
import CreateBoardModal from './CreateBoardModal';
import KanbanSyncLogo from './KanbanSyncLogo';
import ThemeToggle from './ThemeToggle';

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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const desktopMenuRef = useRef<HTMLDivElement>(null);
    const mobileUserMenuRef = useRef<HTMLDivElement>(null);
    const mobileDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            const desktopMenuInside = desktopMenuRef.current?.contains(target);
            const mobileUserMenuInside = mobileUserMenuRef.current?.contains(target);
            const mobileDropdownInside = mobileDropdownRef.current?.contains(target);

            if (!desktopMenuInside && !mobileUserMenuInside) {
                setUserMenuOpen(false);
            }
            if (!mobileDropdownInside) {
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const initials = userName
        ? userName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    return (
        <nav className="sticky top-0 z-40 w-full bg-[--ks-bg-elevated]/90 backdrop-blur-md border-b border-[--ks-border] shadow-[--ks-shadow]">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">

                {/* ── Brand ────────────────────────────── */}
                <KanbanSyncLogo />

                {/* ── Middle stats ─────────────────────── */}
                <div className="hidden md:flex items-center gap-1 bg-[--ks-bg-card] border border-[--ks-border] rounded-full px-4 py-1.5 text-sm text-[--ks-text-muted] shadow-xs">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 mr-1 text-[--ks-primary]" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                        <rect x="14" y="3" width="7" height="5" rx="1.5" fill="currentColor" />
                        <rect x="14" y="12" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                        <rect x="3" y="16" width="7" height="5" rx="1.5" fill="currentColor" />
                    </svg>
                    <span className="font-medium text-[--ks-text-primary]">{boardCount}</span>
                    <span className="ml-1">{boardCount === 1 ? 'board' : 'boards'}</span>
                </div>

                {/* ── Right actions ────────────────────── */}
                <div className="hidden md:flex items-center gap-2 ml-auto">

                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('ks-open-dashboard-tour'))}
                        className="flex items-center gap-1.5 border border-[--ks-border] hover:bg-[--ks-bg-overlay] text-[--ks-text-secondary] hover:text-[--ks-text-primary] text-sm font-medium px-3 py-2 rounded-xl transition-colors"
                        aria-label="Start dashboard tutorial"
                    >
                        <svg className="w-4 h-4 text-[--ks-primary]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 3l8.5 4.5v9L12 21 3.5 16.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                            <path d="M12 8.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <circle cx="12" cy="15.8" r="1" fill="currentColor" />
                        </svg>
                        <span className="hidden sm:inline">Tutorial</span>
                    </button>

                    {/* Create Board */}
                    <CreateBoardModal />

                    {/* Divider */}
                    <div className="w-px h-6 bg-[--ks-border] mx-1" />

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Divider */}
                    <div className="w-px h-6 bg-[--ks-border] mx-1" />

                    {/* Notifications */}
                    <NotificationsBell userId={userId} />

                    {/* Divider */}
                    <div className="w-px h-6 bg-[--ks-border] mx-1" />

                    {/* User avatar + dropdown */}
                    <div className="relative" ref={desktopMenuRef}>
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
                            <span className="hidden sm:block text-sm font-medium text-[--ks-text-secondary] max-w-30 truncate">
                                {userName ?? userEmail}
                            </span>
                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[--ks-text-muted] hidden sm:block" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {userMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-[--ks-bg-elevated] rounded-xl border border-[--ks-border] shadow-[--ks-shadow-lg] py-1 z-50 animate-ks-dropdown">
                                {/* User info */}
                                <div className="px-4 py-3 border-b border-[--ks-border]">
                                    <p className="text-sm font-semibold text-[--ks-text-primary] truncate">{userName}</p>
                                    <p className="text-xs text-[--ks-text-muted] truncate">{userEmail}</p>
                                </div>

                                <Link
                                    href="/help"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[--ks-text-muted]" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 18h.01M10.5 8.5a1.5 1.5 0 113 0c0 1-1.5 1.5-1.5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    Help
                                </Link>

                                <Link
                                    href="/about"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[--ks-text-muted]" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                        <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    About Us
                                </Link>

                                <Link
                                    href="/contact"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[--ks-text-muted]" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
                                        <path d="M4 8l8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Contact Us
                                </Link>

                                {/* Menu items */}
                                <form action={signOutAction}>
                                    <button
                                        type="submit"
                                        className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-[--ks-danger-subtle] transition-colors"
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

                {/* ── Mobile actions ───────────────────── */}
                <div className="md:hidden flex items-center gap-2 ml-auto">
                    <div className="relative" ref={mobileDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((v) => !v)}
                            className="inline-flex items-center justify-center rounded-xl border border-[--ks-border] bg-[--ks-bg-elevated] px-3 py-2 text-sm font-medium text-[--ks-text-secondary] hover:bg-[--ks-bg-overlay] hover:text-[--ks-text-primary]"
                            aria-label="Open mobile menu"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                            </svg>
                        </button>

                        {mobileMenuOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-[--ks-bg-elevated] rounded-xl border border-[--ks-border] shadow-[--ks-shadow-lg] p-2 z-50 animate-ks-dropdown">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.dispatchEvent(new Event('ks-open-dashboard-tour'));
                                            setMobileMenuOpen(false);
                                        }}
                                        className="flex items-center justify-center gap-1.5 border border-[--ks-border] hover:bg-[--ks-bg-overlay] text-[--ks-text-secondary] text-sm font-medium px-3 py-2 rounded-xl transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-[--ks-primary]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 3l8.5 4.5v9L12 21 3.5 16.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                            <path d="M12 8.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                            <circle cx="12" cy="15.8" r="1" fill="currentColor" />
                                        </svg>
                                        Tutorial
                                    </button>
                                    <div className="[&>button]:w-full [&>button]:justify-center">
                                        <CreateBoardModal />
                                    </div>
                                </div>

                                <div className="px-1 py-2 border-t border-[--ks-border] text-xs text-[--ks-text-muted]">
                                    {boardCount} {boardCount === 1 ? 'board' : 'boards'}
                                </div>

                                <div className="px-1 pb-2 border-b border-[--ks-border]">
                                    <NotificationsBell userId={userId} />
                                </div>

                                <div className="px-2 py-2 flex items-center justify-between border-b border-[--ks-border]">
                                    <span className="text-xs text-[--ks-text-muted] font-medium">Appearance</span>
                                    <ThemeToggle />
                                </div>

                                <div className="pt-2 space-y-1">
                                    <Link href="/help" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay]">Help</Link>
                                    <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay]">About Us</Link>
                                    <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay]">Contact Us</Link>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={mobileUserMenuRef}>
                        <button
                            onClick={() => setUserMenuOpen((v) => !v)}
                            className="flex items-center gap-2 rounded-full hover:bg-[--ks-bg-overlay] transition-colors px-1 py-1"
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
                        </button>

                        {userMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-[--ks-bg-elevated] rounded-xl border border-[--ks-border] shadow-[--ks-shadow-lg] py-1 z-50 animate-ks-dropdown">
                                <div className="px-4 py-3 border-b border-[--ks-border]">
                                    <p className="text-sm font-semibold text-[--ks-text-primary] truncate">{userName}</p>
                                    <p className="text-xs text-[--ks-text-muted] truncate">{userEmail}</p>
                                </div>
                                <form action={signOutAction}>
                                    <button
                                        type="submit"
                                        className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-[--ks-danger-subtle] transition-colors"
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
