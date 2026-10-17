'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BoardsGrid from './BoardsGrid';
import Sidebar from './Sidebar';
import CreateBoardModal from './CreateBoardModal';

type DueSoonTask = {
    id: string;
    title: string;
    dueAt: Date | null;
    priority: string;
    column: {
        board: {
            id: string;
            title: string;
        };
    };
};

type RecentActivity = {
    id: string;
    message: string;
    createdAt: Date;
    actor: {
        name: string | null;
        email: string | null;
        image: string | null;
    } | null;
    task: {
        title: string;
        column: {
            board: {
                id: string;
                title: string;
            };
        };
    };
};

type TeamMember = {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    assignedTasks: { id: string; status: string }[];
    timeEntries: { minutes: number }[];
    taskActivities: { id: string }[];
};

type BoardCard = {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    members?: Array<{
        user?: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        } | null;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    }>;
    taskCount?: number;
};

interface DashboardViewProps {
    userId: string;
    userName?: string | null;
    boards: BoardCard[];
    activeBoardCount: number;
    archivedBoardCount: number;
    assignedOpenTaskCount: number;
    overdueTaskCount: number;
    dueSoonTasks: DueSoonTask[];
    unreadNotificationCount: number;
    recentActivity: RecentActivity[];
    teamMembers: TeamMember[];
    initialTab?: string;
}

function formatDueDate(date: Date | null) {
    if (!date) return 'No due date';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date));
}

function priorityPill(priority: string) {
    if (priority === 'URGENT') return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (priority === 'HIGH') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (priority === 'MEDIUM') return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
    if (priority === 'LOW') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    return 'bg-[--ks-bg-card] text-[--ks-text-muted] border-[--ks-border]';
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
    if (name) {
        return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    }
    if (email) {
        return email[0].toUpperCase();
    }
    return '?';
}

export default function DashboardView({
    userId,
    userName,
    boards,
    activeBoardCount,
    archivedBoardCount,
    assignedOpenTaskCount,
    overdueTaskCount,
    dueSoonTasks,
    unreadNotificationCount,
    recentActivity,
    teamMembers,
    initialTab,
}: DashboardViewProps) {
    const resolvedInitialTab = initialTab === 'overview' ? 'overview' : initialTab === 'archive' ? 'archive' : 'boards';
    const [currentTab, setCurrentTab] = useState<'overview' | 'boards' | 'archive'>(resolvedInitialTab);

    // Sync tab when browser Back / Forward buttons are pressed
    useEffect(() => {
        const onPopState = () => {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam === 'overview') setCurrentTab('overview');
            else if (tabParam === 'archive') setCurrentTab('archive');
            else setCurrentTab('boards');
        };

        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    // Instant client-side tab selection without server round-trip
    const handleSelectTab = (tab: string) => {
        const nextTab = tab === 'overview' ? 'overview' : tab === 'archive' ? 'archive' : 'boards';
        setCurrentTab(nextTab);

        const newUrl = nextTab === 'boards' ? '/dashboard' : `/dashboard?tab=${nextTab}`;
        window.history.replaceState(null, '', newUrl);
    };

    return (
        <div className="flex-1 flex w-full">
            <Sidebar
                boardCount={activeBoardCount}
                archiveCount={archivedBoardCount}
                activeTab={currentTab}
                onSelectTab={handleSelectTab}
            />

            <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 w-full min-w-0">
                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-tour="dashboard-title">
                    <div>
                        <h1 className="text-2xl font-bold text-[--ks-text-primary] tracking-tight">
                            {currentTab === 'archive'
                                ? 'Archived Boards'
                                : currentTab === 'overview'
                                ? 'Dashboard Overview'
                                : 'My Boards'}
                        </h1>
                        <p className="text-xs text-[--ks-text-muted] mt-1">
                            {currentTab === 'archive'
                                ? 'Manage and restore boards archived within the 30-day retention window'
                                : currentTab === 'overview'
                                ? `Welcome back, ${userName ?? 'User'}`
                                : `${activeBoardCount} active board${activeBoardCount === 1 ? '' : 's'} available`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <CreateBoardModal />
                    </div>
                </div>

                {/* Mobile Segmented View Tabs — visible on mobile/tablet (< md:), hidden on desktop */}
                <div className="md:hidden flex items-center gap-1 p-1 rounded-xl bg-[--ks-bg-card] border border-[--ks-border] mb-6">
                    <button
                        type="button"
                        onClick={() => handleSelectTab('overview')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                            currentTab === 'overview'
                                ? 'bg-[--ks-primary] text-white shadow-xs'
                                : 'text-[--ks-text-secondary] hover:text-[--ks-text-primary]'
                        }`}
                    >
                        Home
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSelectTab('boards')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                            currentTab === 'boards'
                                ? 'bg-[--ks-primary] text-white shadow-xs'
                                : 'text-[--ks-text-secondary] hover:text-[--ks-text-primary]'
                        }`}
                    >
                        My Boards {activeBoardCount > 0 ? `(${activeBoardCount})` : ''}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSelectTab('archive')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                            currentTab === 'archive'
                                ? 'bg-[--ks-primary] text-white shadow-xs'
                                : 'text-[--ks-text-secondary] hover:text-[--ks-text-primary]'
                        }`}
                    >
                        Archive {archivedBoardCount > 0 ? `(${archivedBoardCount})` : ''}
                    </button>
                </div>

                {/* Overview View */}
                {currentTab === 'overview' ? (
                    <div className="space-y-8 animate-fade-in">
                        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="app-surface rounded-2xl border border-[--ks-success]/25 p-4 bg-[--ks-success-subtle]">
                                <p className="text-xs text-[--ks-success] font-semibold uppercase tracking-wide">Active Boards</p>
                                <p className="text-2xl font-bold text-[--ks-text-primary] mt-1">{activeBoardCount}</p>
                            </div>
                            <div className="app-surface rounded-2xl border border-[--ks-primary]/25 p-4 bg-[--ks-primary-subtle]">
                                <p className="text-xs text-[--ks-primary] font-semibold uppercase tracking-wide">My Open Tasks</p>
                                <p className="text-2xl font-bold text-[--ks-text-primary] mt-1">{assignedOpenTaskCount}</p>
                            </div>
                            <div className="app-surface rounded-2xl border border-[--ks-danger]/25 p-4 bg-[--ks-danger-subtle]">
                                <p className="text-xs text-[--ks-danger] font-semibold uppercase tracking-wide">Overdue Tasks</p>
                                <p className={`text-2xl font-bold mt-1 ${overdueTaskCount > 0 ? 'text-[--ks-danger]' : 'text-[--ks-text-primary]'}`}>{overdueTaskCount}</p>
                            </div>
                            <div className="app-surface rounded-2xl border border-[--ks-accent]/25 p-4 bg-[--ks-accent-subtle]">
                                <p className="text-xs text-[--ks-accent] font-semibold uppercase tracking-wide">Notifications</p>
                                <p className={`text-2xl font-bold mt-1 ${unreadNotificationCount > 0 ? 'text-[--ks-accent]' : 'text-[--ks-text-primary]'}`}>{unreadNotificationCount}</p>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                            <div className="app-surface rounded-2xl border border-[--ks-border] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-semibold text-[--ks-text-primary]">Due This Week</h2>
                                    <span className="text-xs text-[--ks-text-muted]">{dueSoonTasks.length} tasks</span>
                                </div>
                                {dueSoonTasks.length === 0 ? (
                                    <p className="text-xs text-[--ks-text-muted]">No assigned tasks due in the next 7 days.</p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {dueSoonTasks.map((task) => (
                                            <Link
                                                key={task.id}
                                                href={`/board/${task.column.board.id}`}
                                                className="block rounded-xl border border-[--ks-border] bg-[--ks-bg-card] p-3 hover:border-emerald-500/40 hover:bg-[--ks-bg-overlay] transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-[--ks-text-primary] truncate">{task.title}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityPill(task.priority)}`}>{task.priority}</span>
                                                </div>
                                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                                    <p className="text-xs text-[--ks-text-muted] truncate">{task.column.board.title}</p>
                                                    <p className="text-xs text-[--ks-text-muted]">Due {formatDueDate(task.dueAt)}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="app-surface rounded-2xl border border-[--ks-border] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-semibold text-[--ks-text-primary]">Recent Activity</h2>
                                    <span className="text-xs text-[--ks-text-muted]">Live board events</span>
                                </div>
                                {recentActivity.length === 0 ? (
                                    <p className="text-xs text-[--ks-text-muted]">No recent activity yet.</p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {recentActivity.map((activity) => {
                                            const actorName = activity.actor?.name ?? activity.actor?.email ?? 'System';
                                            const initials = getInitials(activity.actor?.name, activity.actor?.email);
                                            return (
                                                <Link
                                                    key={activity.id}
                                                    href={`/board/${activity.task.column.board.id}`}
                                                    className="block rounded-xl border border-[--ks-border] bg-[--ks-bg-card] p-3 hover:border-violet-500/40 hover:bg-[--ks-bg-overlay] transition-colors"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {activity.actor?.image ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={activity.actor.image} alt={actorName} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[--ks-primary] to-[--ks-accent] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                                {initials}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-[--ks-text-primary] line-clamp-2">{activity.message}</p>
                                                            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-[--ks-text-muted]">
                                                                <span className="truncate">{actorName} • {activity.task.column.board.title}</span>
                                                                <span>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(activity.createdAt))}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-semibold text-[--ks-text-primary]">Team Analytics</h2>
                                <p className="text-xs text-[--ks-text-muted]">Performance & contributions</p>
                            </div>

                            {teamMembers.length === 0 ? (
                                <div className="app-surface rounded-2xl border border-[--ks-border] p-6 text-center">
                                    <p className="text-xs text-[--ks-text-muted]">No team members yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {teamMembers.map((member) => {
                                        const assignedCount = member.assignedTasks.length;
                                        const completedCount = member.assignedTasks.filter((t) => t.status === 'DONE').length;
                                        const totalMinutesLogged = member.timeEntries.reduce((sum, te) => sum + te.minutes, 0);
                                        const hoursLogged = (totalMinutesLogged / 60).toFixed(1);
                                        const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
                                        const memberInitials = getInitials(member.name, member.email);

                                        return (
                                            <div key={member.id} className="app-surface rounded-2xl border border-[--ks-border] p-4 bg-[--ks-bg-card] hover:border-[--ks-border] transition-colors">
                                                <div className="flex items-center gap-3 mb-4">
                                                    {member.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={member.image} alt={member.name ?? member.email ?? 'User'} className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[--ks-primary] to-[--ks-accent] text-white text-sm font-bold flex items-center justify-center">
                                                            {memberInitials}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[--ks-text-primary] truncate">{member.name ?? member.email}</p>
                                                        <p className="text-xs text-[--ks-text-muted] truncate">{member.email}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-xs font-semibold text-[--ks-text-secondary] uppercase tracking-wide">Tasks</p>
                                                            <p className="text-xs font-bold text-[--ks-text-primary]">{completedCount}/{assignedCount}</p>
                                                        </div>
                                                        <div className="w-full h-1.5 rounded-full bg-[--ks-border] overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(completionRate, 100)}%` }} />
                                                        </div>
                                                        <p className="text-xs text-[--ks-text-muted] mt-1">{completionRate}% complete</p>
                                                    </div>

                                                    <div className="pt-2 border-t border-[--ks-border]">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-semibold text-[--ks-text-secondary] uppercase tracking-wide">Time Logged</p>
                                                            <p className="text-sm font-bold text-[--ks-text-primary]">{hoursLogged}h</p>
                                                        </div>
                                                        <p className="text-xs text-[--ks-text-muted] mt-1">{totalMinutesLogged} minutes</p>
                                                    </div>

                                                    <div className="pt-2 border-t border-[--ks-border]">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-semibold text-[--ks-text-secondary] uppercase tracking-wide">Activity</p>
                                                            <p className="text-sm font-bold text-[--ks-text-primary]">{member.taskActivities.length}</p>
                                                        </div>
                                                        <p className="text-xs text-[--ks-text-muted] mt-1">events logged</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                ) : (
                    /* My Boards & Archive View */
                    <div className="space-y-8 animate-fade-in">
                        <section>
                            {boards.length === 0 ? (
                                <div className="app-surface rounded-3xl flex flex-col items-center justify-center py-20 text-center border border-[--ks-border] anim-soft-pop" data-tour="dashboard-empty-state">
                                    <div className="w-14 h-14 bg-[--ks-primary-subtle] border border-[--ks-primary]/25 rounded-2xl flex items-center justify-center mb-4">
                                        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[--ks-primary]" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="3" y="3" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                                            <rect x="14" y="3" width="7" height="5" rx="1.5" fill="currentColor" />
                                            <rect x="14" y="12" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                                            <rect x="3" y="16" width="7" height="5" rx="1.5" fill="currentColor" />
                                        </svg>
                                    </div>
                                    <p className="text-lg font-semibold text-[--ks-text-primary]">No boards yet</p>
                                    <p className="text-[--ks-text-muted] mt-1 text-sm">Click &ldquo;Create Board&rdquo; to start tracking tasks and collaborating.</p>
                                </div>
                            ) : (
                                <div className="anim-fade-up">
                                    <BoardsGrid
                                        boards={boards}
                                        userId={userId}
                                        initialShowArchived={currentTab === 'archive'}
                                    />
                                </div>
                            )}
                        </section>

                        {/* When on boards view, show summary metrics below boards */}
                        {currentTab === 'boards' && (
                            <>
                                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                    <div className="app-surface rounded-2xl border border-[--ks-success]/25 p-4 bg-[--ks-success-subtle]">
                                        <p className="text-xs text-[--ks-success] font-semibold uppercase tracking-wide">Active Boards</p>
                                        <p className="text-2xl font-bold text-[--ks-text-primary] mt-1">{activeBoardCount}</p>
                                    </div>
                                    <div className="app-surface rounded-2xl border border-[--ks-primary]/25 p-4 bg-[--ks-primary-subtle]">
                                        <p className="text-xs text-[--ks-primary] font-semibold uppercase tracking-wide">My Open Tasks</p>
                                        <p className="text-2xl font-bold text-[--ks-text-primary] mt-1">{assignedOpenTaskCount}</p>
                                    </div>
                                    <div className="app-surface rounded-2xl border border-[--ks-danger]/25 p-4 bg-[--ks-danger-subtle]">
                                        <p className="text-xs text-[--ks-danger] font-semibold uppercase tracking-wide">Overdue Tasks</p>
                                        <p className={`text-2xl font-bold mt-1 ${overdueTaskCount > 0 ? 'text-[--ks-danger]' : 'text-[--ks-text-primary]'}`}>{overdueTaskCount}</p>
                                    </div>
                                    <div className="app-surface rounded-2xl border border-[--ks-accent]/25 p-4 bg-[--ks-accent-subtle]">
                                        <p className="text-xs text-[--ks-accent] font-semibold uppercase tracking-wide">Notifications</p>
                                        <p className={`text-2xl font-bold mt-1 ${unreadNotificationCount > 0 ? 'text-[--ks-accent]' : 'text-[--ks-text-primary]'}`}>{unreadNotificationCount}</p>
                                    </div>
                                </section>

                                <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                    <div className="app-surface rounded-2xl border border-[--ks-border] p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-base font-semibold text-[--ks-text-primary]">Due This Week</h2>
                                            <span className="text-xs text-[--ks-text-muted]">{dueSoonTasks.length} tasks</span>
                                        </div>
                                        {dueSoonTasks.length === 0 ? (
                                            <p className="text-xs text-[--ks-text-muted]">No assigned tasks due in the next 7 days.</p>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {dueSoonTasks.map((task) => (
                                                    <Link
                                                        key={task.id}
                                                        href={`/board/${task.column.board.id}`}
                                                        className="block rounded-xl border border-[--ks-border] bg-[--ks-bg-card] p-3 hover:border-emerald-500/40 hover:bg-[--ks-bg-overlay] transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-sm font-semibold text-[--ks-text-primary] truncate">{task.title}</p>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityPill(task.priority)}`}>{task.priority}</span>
                                                        </div>
                                                        <div className="mt-1.5 flex items-center justify-between gap-2">
                                                            <p className="text-xs text-[--ks-text-muted] truncate">{task.column.board.title}</p>
                                                            <p className="text-xs text-[--ks-text-muted]">Due {formatDueDate(task.dueAt)}</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="app-surface rounded-2xl border border-[--ks-border] p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-base font-semibold text-[--ks-text-primary]">Recent Activity</h2>
                                            <span className="text-xs text-[--ks-text-muted]">Live board events</span>
                                        </div>
                                        {recentActivity.length === 0 ? (
                                            <p className="text-xs text-[--ks-text-muted]">No recent activity yet.</p>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {recentActivity.map((activity) => {
                                                    const actorName = activity.actor?.name ?? activity.actor?.email ?? 'System';
                                                    const initials = getInitials(activity.actor?.name, activity.actor?.email);
                                                    return (
                                                        <Link
                                                            key={activity.id}
                                                            href={`/board/${activity.task.column.board.id}`}
                                                            className="block rounded-xl border border-[--ks-border] bg-[--ks-bg-card] p-3 hover:border-violet-500/40 hover:bg-[--ks-bg-overlay] transition-colors"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                {activity.actor?.image ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img src={activity.actor.image} alt={actorName} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                                                                ) : (
                                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[--ks-primary] to-[--ks-accent] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                                        {initials}
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm text-[--ks-text-primary] line-clamp-2">{activity.message}</p>
                                                                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-[--ks-text-muted]">
                                                                        <span className="truncate">{actorName} • {activity.task.column.board.title}</span>
                                                                        <span>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(activity.createdAt))}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-lg font-semibold text-[--ks-text-primary]">Team Analytics</h2>
                                        <p className="text-xs text-[--ks-text-muted]">Performance & contributions</p>
                                    </div>

                                    {teamMembers.length === 0 ? (
                                        <div className="app-surface rounded-2xl border border-[--ks-border] p-6 text-center">
                                            <p className="text-xs text-[--ks-text-muted]">No team members yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {teamMembers.map((member) => {
                                                const assignedCount = member.assignedTasks.length;
                                                const completedCount = member.assignedTasks.filter((t) => t.status === 'DONE').length;
                                                const totalMinutesLogged = member.timeEntries.reduce((sum, te) => sum + te.minutes, 0);
                                                const hoursLogged = (totalMinutesLogged / 60).toFixed(1);
                                                const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
                                                const memberInitials = getInitials(member.name, member.email);

                                                return (
                                                    <div key={member.id} className="app-surface rounded-2xl border border-[--ks-border] p-4 bg-[--ks-bg-card] hover:border-[--ks-border] transition-colors">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            {member.image ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={member.image} alt={member.name ?? member.email ?? 'User'} className="w-10 h-10 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[--ks-primary] to-[--ks-accent] text-white text-sm font-bold flex items-center justify-center">
                                                                    {memberInitials}
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-[--ks-text-primary] truncate">{member.name ?? member.email}</p>
                                                                <p className="text-xs text-[--ks-text-muted] truncate">{member.email}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-xs font-semibold text-[--ks-text-secondary] uppercase tracking-wide">Tasks</p>
                                                                    <p className="text-xs font-bold text-[--ks-text-primary]">{completedCount}/{assignedCount}</p>
                                                                </div>
                                                                <div className="w-full h-1.5 rounded-full bg-[--ks-border] overflow-hidden">
                                                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(completionRate, 100)}%` }} />
                                                                </div>
                                                                <p className="text-xs text-[--ks-text-muted] mt-1">{completionRate}% complete</p>
                                                            </div>

                                                            <div className="pt-2 border-t border-[--ks-border]">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-xs font-semibold text-[--ks-text-secondary] uppercase tracking-wide">Time Logged</p>
                                                                    <p className="text-sm font-bold text-[--ks-text-primary]">{hoursLogged}h</p>
                                                                </div>
                                                                <p className="text-xs text-[--ks-text-muted] mt-1">{totalMinutesLogged} minutes</p>
                                                            </div>

                                                            <div className="pt-2 border-t border-[--ks-border]">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-xs font-semibold text-[--ks-text-secondary] uppercase tracking-wide">Activity</p>
                                                                    <p className="text-sm font-bold text-[--ks-text-primary]">{member.taskActivities.length}</p>
                                                                </div>
                                                                <p className="text-xs text-[--ks-text-muted] mt-1">events logged</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            </>
                        )}
                    </div>
                )}

                {/* Quick navigation footer links */}
                <div className="mt-8 pt-4 border-t border-[--ks-border] flex flex-wrap items-center gap-2" data-tour="dashboard-help-links">
                    <Link href="/help" className="text-xs px-3 py-1.5 rounded-full border border-[--ks-border] bg-[--ks-bg-card] text-[--ks-text-secondary] hover:border-[--ks-primary] hover:text-[--ks-primary] transition-colors">
                        Help Center
                    </Link>
                    <Link href="/about" className="text-xs px-3 py-1.5 rounded-full border border-[--ks-border] bg-[--ks-bg-card] text-[--ks-text-secondary] hover:border-[--ks-primary] hover:text-[--ks-primary] transition-colors">
                        About Us
                    </Link>
                    <Link href="/contact" className="text-xs px-3 py-1.5 rounded-full border border-[--ks-border] bg-[--ks-bg-card] text-[--ks-text-secondary] hover:border-[--ks-primary] hover:text-[--ks-primary] transition-colors">
                        Contact Us
                    </Link>
                </div>
            </main>
        </div>
    );
}
