'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    Home,
    Layout,
    Archive,
    Settings,
    HelpCircle,
    Compass,
} from 'lucide-react';

interface SidebarItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
    badge?: number | string;
    isActive?: boolean;
    onClick?: () => void;
}

function SidebarItem({ icon: Icon, label, href, badge, isActive, onClick }: SidebarItemProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
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
}: {
    boardCount?: number;
    archiveCount?: number;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab');

    const isDashboard = pathname === '/dashboard';
    const isSettings = pathname === '/settings';

    // Route / Tab matching
    const isHomeActive = isDashboard && currentTab === 'overview';
    const isArchiveActive = isDashboard && currentTab === 'archive';
    const isBoardsActive = isDashboard && !isHomeActive && !isArchiveActive;

    const startTour = () => {
        window.dispatchEvent(new Event('ks-open-dashboard-tour'));
    };

    return (
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

                <SidebarItem
                    icon={Home}
                    label="Home"
                    href="/dashboard?tab=overview"
                    isActive={isHomeActive}
                />

                <SidebarItem
                    icon={Layout}
                    label="My Boards"
                    href="/dashboard"
                    badge={boardCount}
                    isActive={isBoardsActive}
                />

                <SidebarItem
                    icon={Archive}
                    label="Archive"
                    href="/dashboard?tab=archive"
                    badge={archiveCount && archiveCount > 0 ? archiveCount : undefined}
                    isActive={isArchiveActive}
                />

                <SidebarItem
                    icon={Settings}
                    label="Settings"
                    href="/settings"
                    isActive={isSettings}
                />
            </div>

            {/* Bottom Support Section */}
            <div className="flex flex-col gap-1 pt-3 border-t border-[--ks-border]">
                <button
                    type="button"
                    onClick={startTour}
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
                />
            </div>
        </aside>
    );
}
