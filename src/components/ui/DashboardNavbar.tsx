'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import NotificationsBell from './NotificationsBell';
import KanbanSyncLogo from './KanbanSyncLogo';
import ThemeToggle from './ThemeToggle';

type Props = {
    userId: string;
    userName: string | null | undefined;
    userEmail: string | null | undefined;
    userImage?: string | null;
    boardCount?: number;
    signOutAction: () => Promise<void>;
};

export default function DashboardNavbar({
    userId,
    userName,
    userEmail,
    userImage,
    signOutAction,
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
        : (userEmail?.[0]?.toUpperCase() ?? '?');

    return (
        <nav className="sticky top-0 z-40 w-full h-14 bg-[--ks-bg-elevated] border-b border-[--ks-border]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3 sm:gap-4">
                {/* ── Brand + Breadcrumb ────────────────────────────── */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 shrink-0 transition-opacity duration-[150ms] hover:opacity-85"
                        title="KanbanSync Dashboard"
                    >
                        <KanbanSyncLogo />
                    </Link>

                    {/* Breadcrumb — hidden below sm: */}
                    <div className="hidden sm:flex items-center gap-2 text-sm text-[--ks-text-muted] min-w-0">
                        <span className="text-[--ks-text-muted]/60 select-none">›</span>
                        <span className="text-[--ks-text-primary] font-medium truncate">
                            Dashboard
                        </span>
                    </div>
                </div>

                {/* ── Right cluster ─────────────────────────────────── */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <ThemeToggle />

                    <NotificationsBell userId={userId} />

                    {/* User avatar (32px circle) + dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setUserMenuOpen((v) => !v)}
                            className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-[--ks-primary]/30 transition-all duration-[150ms] p-0.5 focus:outline-none"
                            aria-label="User menu"
                            aria-expanded={userMenuOpen}
                        >
                            {userImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={userImage}
                                    alt={userName ?? 'User'}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            ) : (
                                <span className="w-8 h-8 rounded-full bg-[--ks-primary] text-white text-xs font-semibold flex items-center justify-center shadow-xs">
                                    {initials}
                                </span>
                            )}
                        </button>

                        {userMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-[--ks-bg-elevated] rounded-xl border border-[--ks-border] shadow-[--ks-shadow-lg] py-1.5 z-50 animate-ks-dropdown">
                                {/* User info */}
                                <div className="px-4 py-2.5 border-b border-[--ks-border]">
                                    <p className="text-sm font-semibold text-[--ks-text-primary] truncate">
                                        {userName ?? 'User'}
                                    </p>
                                    <p className="text-xs text-[--ks-text-muted] truncate mt-0.5">
                                        {userEmail}
                                    </p>
                                </div>

                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.dispatchEvent(new Event('ks-open-dashboard-tour'));
                                            setUserMenuOpen(false);
                                        }}
                                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors duration-[150ms]"
                                    >
                                        <svg className="w-4 h-4 text-[--ks-primary]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 3l8.5 4.5v9L12 21 3.5 16.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                            <path d="M12 8.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                            <circle cx="12" cy="15.8" r="1" fill="currentColor" />
                                        </svg>
                                        Tutorial
                                    </button>

                                    <Link
                                        href="/help"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors duration-[150ms]"
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
                                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors duration-[150ms]"
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
                                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors duration-[150ms]"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[--ks-text-muted]" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
                                            <path d="M4 8l8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Contact Us
                                    </Link>
                                </div>

                                <form action={signOutAction} className="border-t border-[--ks-border] pt-1">
                                    <button
                                        type="submit"
                                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-[--ks-danger] hover:bg-[--ks-danger-subtle] transition-colors duration-[150ms]"
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
