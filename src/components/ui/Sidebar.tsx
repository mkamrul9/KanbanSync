'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    Home,
    Layout,
    Archive,
    Settings,
    HelpCircle,
    Compass,
    X,
} from 'lucide-react';

interface SidebarItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
    badge?: number | string;
    isActive?: boolean;
    onSelect?: () => void;
}

function SidebarItem({ icon: Icon, label, href, badge, isActive, onSelect }: SidebarItemProps) {
    const handleClick = (e: React.MouseEvent) => {
        if (onSelect) {
            e.preventDefault();
            onSelect();
        }
    };

    return (
        <Link
            href={href}
            onClick={handleClick}
            className={`
                group flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium
                transition-colors duration-150 select-none
                ${isActive
                    ? 'bg-[--ks-primary-subtle] text-[--ks-primary]'
                    : 'text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay]'
                }
            `}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                        isActive ? 'text-[--ks-primary]' : 'text-[--ks-text-muted] group-hover:text-[--ks-text-secondary]'
                    }`}
                />
                <span className="truncate">{label}</span>
            </div>

            {badge !== undefined && (
                <span
                    className={`
                        text-[11px] px-1.5 py-0.5 rounded-full shrink-0
                        ${isActive
                            ? 'bg-[--ks-primary]/15 text-[--ks-primary] font-semibold'
                            : 'bg-[--ks-bg-card] border border-[--ks-border] text-[--ks-text-muted]'
                        }
                    `}
                >
                    {badge}
                </span>
            )}
        </Link>
    );
}

export default function Sidebar({
    boardCount,
    archiveCount,
    activeTab,
    onSelectTab,
}: {
    boardCount?: number;
    archiveCount?: number;
    activeTab?: string;
    onSelectTab?: (tab: string) => void;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab');
    const [mobileOpen, setMobileOpen] = useState(false);

    const closeMobileDrawer = () => {
        setMobileOpen(false);
        window.dispatchEvent(new Event('ks-close-mobile-sidebar'));
    };

    useEffect(() => {
        const toggleHandler = () => setMobileOpen((prev) => !prev);
        const closeHandler = () => setMobileOpen(false);

        window.addEventListener('ks-toggle-mobile-sidebar', toggleHandler);
        window.addEventListener('ks-close-mobile-sidebar', closeHandler);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeMobileDrawer();
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('ks-toggle-mobile-sidebar', toggleHandler);
            window.removeEventListener('ks-close-mobile-sidebar', closeHandler);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Close mobile drawer when route or tab changes
    useEffect(() => {
        closeMobileDrawer();
    }, [pathname, searchParams]);

    const isDashboard = pathname === '/dashboard';
    const isSettings = pathname === '/settings';

    // Route / Tab matching
    const effectiveTab = activeTab !== undefined ? activeTab : (currentTab || 'boards');
    const isHomeActive = isDashboard && effectiveTab === 'overview';
    const isArchiveActive = isDashboard && effectiveTab === 'archive';
    const isBoardsActive = isDashboard && (effectiveTab === 'boards' || (!isHomeActive && !isArchiveActive));

    const startTour = () => {
        window.dispatchEvent(new Event('ks-open-dashboard-tour'));
    };

    const renderNavItems = (isMobile = false) => (
        <>
            <SidebarItem
                icon={Home}
                label="Home"
                href="/dashboard?tab=overview"
                isActive={isHomeActive}
                onSelect={() => {
                    if (isDashboard && onSelectTab) onSelectTab('overview');
                    if (isMobile) closeMobileDrawer();
                }}
            />

            <SidebarItem
                icon={Layout}
                label="My Boards"
                href="/dashboard"
                badge={boardCount}
                isActive={isBoardsActive}
                onSelect={() => {
                    if (isDashboard && onSelectTab) onSelectTab('boards');
                    if (isMobile) closeMobileDrawer();
                }}
            />

            <SidebarItem
                icon={Archive}
                label="Archive"
                href="/dashboard?tab=archive"
                badge={archiveCount && archiveCount > 0 ? archiveCount : undefined}
                isActive={isArchiveActive}
                onSelect={() => {
                    if (isDashboard && onSelectTab) onSelectTab('archive');
                    if (isMobile) closeMobileDrawer();
                }}
            />

            <SidebarItem
                icon={Settings}
                label="Settings"
                href="/settings"
                isActive={isSettings}
                onSelect={isMobile ? closeMobileDrawer : undefined}
            />
        </>
    );

    const renderBottomSection = (isMobile = false) => (
        <div className="flex flex-col gap-1 pt-3 border-t border-[--ks-border]">
            <button
                type="button"
                onClick={() => {
                    startTour();
                    if (isMobile) closeMobileDrawer();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[--ks-text-secondary] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors duration-150"
            >
                <Compass className="w-4 h-4 shrink-0 text-[--ks-primary]" />
                <span className="truncate">Quick Tour</span>
            </button>

            <SidebarItem
                icon={HelpCircle}
                label="Help Center"
                href="/help"
                isActive={pathname === '/help'}
                onSelect={isMobile ? closeMobileDrawer : undefined}
            />
        </div>
    );

    return (
        <>
            {/* Desktop Sticky Sidebar — Visible on md: and above */}
            <aside
                style={{
                    backgroundColor: 'var(--ks-bg-elevated)',
                    borderRightColor: 'var(--ks-border)',
                }}
                className="hidden md:flex flex-col w-[220px] shrink-0 h-[calc(100vh-56px)] sticky top-14
                           border-r pt-4 pb-6 gap-1 px-2 select-none justify-between"
            >
                <div className="flex flex-col gap-1">
                    <div className="px-3 py-1 mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[--ks-text-muted]">
                            Navigation
                        </span>
                    </div>

                    {renderNavItems(false)}
                </div>

                {renderBottomSection(false)}
            </aside>

            {/* Mobile Off-Canvas Drawer — Pinned under top-14 navbar, solid opaque surface, clean crisp backdrop */}
            {mobileOpen && (
                <div className="fixed inset-0 top-14 z-40 md:hidden">
                    {/* Clean Backdrop Overlay — subtle dim, NO blur */}
                    <div
                        className="fixed inset-0 top-14 bg-black/40 transition-opacity animate-fade-in"
                        onClick={closeMobileDrawer}
                        aria-hidden="true"
                    />

                    {/* Drawer Content — 100% opaque elevated background */}
                    <aside
                        style={{
                            backgroundColor: 'var(--ks-bg-elevated)',
                            borderRightColor: 'var(--ks-border)',
                        }}
                        className="fixed top-14 bottom-0 left-0 w-64 max-w-[80vw] border-r shadow-2xl flex flex-col justify-between p-3.5 z-10 animate-ks-slide-in-right select-none"
                    >
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-[--ks-border]">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--ks-text-muted]">
                                    Navigation
                                </span>
                                <button
                                    type="button"
                                    onClick={closeMobileDrawer}
                                    className="p-1 rounded-md text-[--ks-text-muted] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors"
                                    aria-label="Close navigation menu"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {renderNavItems(true)}
                        </div>

                        {renderBottomSection(true)}
                    </aside>
                </div>
            )}
        </>
    );
}
