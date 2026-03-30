import { auth, signOut } from '../../../auth';
import { prisma } from '../../lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BoardsGrid from '../../components/ui/BoardsGrid';
import DashboardNavbar from '../../components/ui/DashboardNavbar';
import ToastContainer from '../../components/ui/ToastContainer';
import DashboardOnboardingTour from '../../components/onboarding/DashboardOnboardingTour';
import { dispatchPendingTaskRemindersAcrossBoards } from '../../lib/reminders';
import { isBoardArchived } from '../../lib/archiveMarkers';
import { createExampleBoardForUser } from '../../lib/onboardingExampleBoard';

export const dynamic = 'force-dynamic';

const BOARD_ARCHIVE_PREFIX = '__ARCHIVED_BOARD__|';
const COLUMN_ARCHIVE_PREFIX = '__ARCHIVED_COLUMN__|';

function formatDueDate(date: Date | null) {
    if (!date) return 'No due date';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function priorityPill(priority: string) {
    if (priority === 'URGENT') return 'bg-red-50 text-red-700 border-red-200';
    if (priority === 'HIGH') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (priority === 'MEDIUM') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (priority === 'LOW') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
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

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ tour?: string }>;
}) {
    const session = await auth();
    const query = await searchParams;
    const forceDashboardTour = query?.tour === '1';

    if (!session?.user?.email) redirect('/login');

    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) redirect('/login');

    const hasAnyBoardAccess = await prisma.board.count({
        where: {
            OR: [
                { userId: dbUser.id },
                { members: { some: { userId: dbUser.id } } },
            ],
        },
    });

    if (hasAnyBoardAccess === 0) {
        await createExampleBoardForUser(dbUser.id);
        redirect('/dashboard?tour=1');
    }

    try {
        await dispatchPendingTaskRemindersAcrossBoards(dbUser.id);
    } catch (error) {
        console.warn('Skipping dashboard reminder dispatch for this request:', error);
    }

    const boards = await prisma.board.findMany({
        where: {
            OR: [
                { userId: dbUser.id },
                { members: { some: { userId: dbUser.id } } },
            ],
        },
        orderBy: { createdAt: 'desc' },
    });
    const activeBoardCount = boards.filter((board) => !isBoardArchived(board.description)).length;

    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const boardAccessWhere = {
        OR: [
            { userId: dbUser.id },
            { members: { some: { userId: dbUser.id } } },
        ],
        description: { not: { startsWith: BOARD_ARCHIVE_PREFIX } },
    };

    const [assignedOpenTaskCount, overdueTaskCount, dueSoonTasks, unreadNotificationCount, recentActivity, teamMembers] = await Promise.all([
        prisma.task.count({
            where: {
                assigneeId: dbUser.id,
                status: { notIn: ['DONE', 'ARCHIVED'] },
                column: {
                    title: { not: { startsWith: COLUMN_ARCHIVE_PREFIX } },
                    board: boardAccessWhere,
                },
            },
        }),
        prisma.task.count({
            where: {
                assigneeId: dbUser.id,
                dueAt: { lt: now },
                status: { notIn: ['DONE', 'ARCHIVED'] },
                column: {
                    title: { not: { startsWith: COLUMN_ARCHIVE_PREFIX } },
                    board: boardAccessWhere,
                },
            },
        }),
        prisma.task.findMany({
            where: {
                assigneeId: dbUser.id,
                dueAt: { gte: now, lte: weekAhead },
                status: { notIn: ['DONE', 'ARCHIVED'] },
                column: {
                    title: { not: { startsWith: COLUMN_ARCHIVE_PREFIX } },
                    board: boardAccessWhere,
                },
            },
            orderBy: { dueAt: 'asc' },
            take: 8,
            select: {
                id: true,
                title: true,
                dueAt: true,
                priority: true,
                column: {
                    select: {
                        board: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.notification.count({
            where: {
                userId: dbUser.id,
                read: false,
            },
        }),
        prisma.taskActivity.findMany({
            where: {
                task: {
                    column: {
                        title: { not: { startsWith: COLUMN_ARCHIVE_PREFIX } },
                        board: boardAccessWhere,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
                id: true,
                message: true,
                createdAt: true,
                actor: {
                    select: {
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                task: {
                    select: {
                        title: true,
                        column: {
                            select: {
                                board: {
                                    select: {
                                        id: true,
                                        title: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
        prisma.user.findMany({
            where: {
                boardMemberships: {
                    some: {
                        board: {
                            OR: [
                                { userId: dbUser.id },
                                { members: { some: { userId: dbUser.id } } },
                            ],
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                assignedTasks: {
                    where: {
                        column: {
                            title: { not: { startsWith: COLUMN_ARCHIVE_PREFIX } },
                            board: boardAccessWhere,
                        },
                    },
                    select: { id: true, status: true },
                },
                timeEntries: {
                    where: {
                        task: {
                            column: {
                                title: { not: { startsWith: COLUMN_ARCHIVE_PREFIX } },
                                board: boardAccessWhere,
                            },
                        },
                    },
                    select: { minutes: true },
                },
                taskActivities: {
                    where: {
                        task: {
                            column: {
                                title: { not: { startsWith: COLUMN_ARCHIVE_PREFIX } },
                                board: boardAccessWhere,
                            },
                        },
                    },
                    select: { id: true },
                },
            },
        }),
    ]);

    const signOutAction = async () => {
        'use server';
        await signOut({ redirectTo: '/login' });
    };

    return (
        <div className="min-h-screen app-bg flex flex-col">
            <DashboardNavbar
                userId={dbUser.id}
                userName={session.user.name}
                userEmail={session.user.email}
                userImage={session.user.image}
                boardCount={activeBoardCount}
                signOutAction={signOutAction}
            />
            <ToastContainer />

            <main className="flex-1 px-6 py-10 max-w-7xl mx-auto w-full">
                <div className="mb-8 app-surface rounded-3xl p-6 md:p-7 border border-slate-200/70 anim-fade-up" data-tour="dashboard-title">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your Boards</h1>
                            <p className="text-slate-600 mt-1">Welcome back, {session.user.name}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                {activeBoardCount} active board{activeBoardCount === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>
                </div>

                <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="app-surface rounded-2xl border border-emerald-200/70 p-4 bg-gradient-to-br from-emerald-50/60 to-emerald-50/20">
                        <p className="text-sm text-emerald-700 font-semibold">Active Boards</p>
                        <p className="text-2xl font-bold text-emerald-900 mt-1">{activeBoardCount}</p>
                    </div>
                    <div className="app-surface rounded-2xl border border-blue-200/70 p-4 bg-gradient-to-br from-blue-50/60 to-blue-50/20">
                        <p className="text-sm text-blue-700 font-semibold">My Open Tasks</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{assignedOpenTaskCount}</p>
                    </div>
                    <div className="app-surface rounded-2xl border border-rose-200/70 p-4 bg-gradient-to-br from-rose-50/60 to-rose-50/20">
                        <p className="text-sm text-rose-700 font-semibold">Overdue Tasks</p>
                        <p className={`text-2xl font-bold mt-1 ${overdueTaskCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{overdueTaskCount}</p>
                    </div>
                    <div className="app-surface rounded-2xl border border-violet-200/70 p-4 bg-gradient-to-br from-violet-50/60 to-violet-50/20">
                        <p className="text-sm text-violet-700 font-semibold">Notifications</p>
                        <p className={`text-2xl font-bold mt-1 ${unreadNotificationCount > 0 ? 'text-violet-700' : 'text-slate-900'}`}>{unreadNotificationCount}</p>
                    </div>
                </section>

                <section className="mb-8 grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className="app-surface rounded-2xl border border-emerald-200/70 p-5 bg-gradient-to-br from-emerald-50/30 to-transparent">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Due This Week</h2>
                            <span className="text-sm text-slate-500">{dueSoonTasks.length} tasks</span>
                        </div>
                        {dueSoonTasks.length === 0 ? (
                            <p className="text-sm text-slate-500">No assigned tasks due in the next 7 days.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {dueSoonTasks.map((task) => (
                                    <Link
                                        key={task.id}
                                        href={`/board/${task.column.board.id}`}
                                        className="block rounded-xl border border-slate-200 bg-white/85 p-3 hover:border-emerald-300 hover:bg-white transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityPill(task.priority)}`}>{task.priority}</span>
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-between gap-2">
                                            <p className="text-xs text-slate-500 truncate">{task.column.board.title}</p>
                                            <p className="text-xs text-slate-500">Due {formatDueDate(task.dueAt)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="app-surface rounded-2xl border border-violet-200/70 p-5 bg-gradient-to-br from-violet-50/30 to-transparent">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                            <span className="text-sm text-slate-500">Live board events</span>
                        </div>
                        {recentActivity.length === 0 ? (
                            <p className="text-sm text-slate-500">No recent activity yet.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {recentActivity.map((activity) => {
                                    const actorName = activity.actor?.name ?? activity.actor?.email ?? 'System';
                                    const initials = getInitials(activity.actor?.name, activity.actor?.email);
                                    return (
                                        <Link
                                            key={activity.id}
                                            href={`/board/${activity.task.column.board.id}`}
                                            className="block rounded-xl border border-slate-200 bg-white/85 p-3 hover:border-violet-300 hover:bg-white transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                {activity.actor?.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={activity.actor.image} alt={actorName} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                        {initials}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-800 line-clamp-2">{activity.message}</p>
                                                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                                                        <span className="truncate">{actorName} • {activity.task.column.board.title}</span>
                                                        <span>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(activity.createdAt)}</span>
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

                <section className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-semibold text-slate-900">Team Analytics</h2>
                        <p className="text-sm text-slate-500">Performance & contributions</p>
                    </div>

                    {teamMembers.length === 0 ? (
                        <div className="app-surface rounded-2xl border border-slate-200/70 p-6 text-center">
                            <p className="text-sm text-slate-500">No team members yet.</p>
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
                                    <div key={member.id} className="app-surface rounded-2xl border border-slate-200/70 p-4 bg-gradient-to-br from-slate-50/50 to-transparent hover:border-slate-300 transition-colors">
                                        <div className="flex items-center gap-3 mb-4">
                                            {member.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={member.image} alt={member.name ?? member.email ?? 'User'} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white text-sm font-bold flex items-center justify-center">
                                                    {memberInitials}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{member.name ?? member.email}</p>
                                                <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Tasks</p>
                                                    <p className="text-xs font-bold text-slate-900">{completedCount}/{assignedCount}</p>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(completionRate, 100)}%` }} />
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{completionRate}% complete</p>
                                            </div>

                                            <div className="pt-2 border-t border-slate-200">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Time Logged</p>
                                                    <p className="text-sm font-bold text-slate-900">{hoursLogged}h</p>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{totalMinutesLogged} minutes</p>
                                            </div>

                                            <div className="pt-2 border-t border-slate-200">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Activity</p>
                                                    <p className="text-sm font-bold text-slate-900">{member.taskActivities.length}</p>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">events logged</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-semibold text-slate-900">Boards</h2>
                        <p className="text-sm text-slate-500">All boards you can access</p>
                    </div>

                    {boards.length === 0 ? (
                        <div className="app-surface rounded-3xl flex flex-col items-center justify-center py-24 text-center border border-slate-200/70 anim-soft-pop" data-tour="dashboard-empty-state">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                                <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-blue-500" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="3" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                                    <rect x="14" y="3" width="7" height="5" rx="1.5" fill="currentColor" />
                                    <rect x="14" y="12" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                                    <rect x="3" y="16" width="7" height="5" rx="1.5" fill="currentColor" />
                                </svg>
                            </div>
                            <p className="text-xl font-semibold text-gray-700">No boards yet</p>
                            <p className="text-gray-500 mt-1 text-base">Click &ldquo;Create Board&rdquo; in the navbar to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1userId={dbUser.id}  sm:grid-cols-2 md:grid-cols-3 gap-6 anim-fade-up">
                            <BoardsGrid boards={boards} />
                        </div>
                    )}
                </section>
            </main>

            <DashboardOnboardingTour
                userId={dbUser.id}
                firstBoardId={boards[0]?.id}
                boardCount={boards.length}
                autoStart={false}
                forceStart={forceDashboardTour}
            />
        </div>
    );
}
