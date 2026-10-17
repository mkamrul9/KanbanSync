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
import KanbanSyncLogo from './KanbanSyncLogo';

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

    useEffect(() => {
        const toggleHandler = () => setMobileOpen((prev) => !prev);
        const closeHandler = () => setMobileOpen(false);

        window.addEventListener('ks-toggle-mobile-sidebar', toggleHandler);
        window.addEventListener('ks-close-mobile-sidebar', closeHandler);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileOpen(false);
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
        setMobileOpen(false);
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
                    if (isMobile) setMobileOpen(false);
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
                    if (isMobile) setMobileOpen(false);
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
                    if (isMobile) setMobileOpen(false);
                }}
            />

            <SidebarItem
                icon={Settings}
                label="Settings"
                href="/settings"
                isActive={isSettings}
                onSelect={isMobile ? () => setMobileOpen(false) : undefined}
            />
        </>
    );

    const renderBottomSection = (isMobile = false) => (
        <div className="flex flex-col gap-1 pt-3 border-t border-[--ks-border]">
            <button
                type="button"
                onClick={() => {
                    startTour();
                    if (isMobile) setMobileOpen(false);
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
                onSelect={isMobile ? () => setMobileOpen(false) : undefined}
            />
        </div>
    );

    return (
        <>
            {/* Desktop Sticky Sidebar — Visible on md: and above */}
            <aside
                className="hidden md:flex flex-col w-[220px] shrink-0 h-[calc(100vh-56px)] sticky top-14
                           bg-[--ks-bg-elevated] border-r border-[--ks-border] pt-4 pb-6 gap-1 px-2 select-none justify-between"
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

            {/* Mobile Off-Canvas Drawer — Visible on < md: when triggered via hamburger button */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop Overlay */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
                        onClick={() => setMobileOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Drawer Content */}
                    <aside
                        className="fixed inset-y-0 left-0 w-64 max-w-[85vw] bg-[--ks-bg-elevated] border-r border-[--ks-border] shadow-2xl flex flex-col justify-between p-4 z-10 animate-ks-slide-in-right"
                    >
                        <div className="flex flex-col gap-1">
                            {/* Drawer Header with Logo and Close Button */}
                            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[--ks-border]">
                                <KanbanSyncLogo />
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(false)}
                                    className="p-1 rounded-lg text-[--ks-text-muted] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] transition-colors"
                                    aria-label="Close navigation menu"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="px-2 py-1 mb-1">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--ks-text-muted]">
                                    Navigation
                                </span>
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
