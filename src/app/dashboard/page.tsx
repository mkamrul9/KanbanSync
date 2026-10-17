import { auth, signOut } from '../../../auth';
import { prisma } from '../../lib/db';
import { redirect } from 'next/navigation';
import DashboardNavbar from '../../components/ui/DashboardNavbar';
import DashboardView from '../../components/ui/DashboardView';
import ToastContainer from '../../components/ui/ToastContainer';
import DashboardOnboardingTour from '../../components/onboarding/DashboardOnboardingTour';
import { dispatchPendingTaskRemindersAcrossBoards } from '../../lib/reminders';
import { isBoardArchived } from '../../lib/archiveMarkers';
import { createExampleBoardForUser } from '../../lib/onboardingExampleBoard';

export const dynamic = 'force-dynamic';

const BOARD_ARCHIVE_PREFIX = '__ARCHIVED_BOARD__|';
const COLUMN_ARCHIVE_PREFIX = '__ARCHIVED_COLUMN__|';

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ tour?: string; tab?: string }>;
}) {
    const session = await auth();
    const query = await searchParams;
    const forceDashboardTour = query?.tour === '1';
    const currentTab = query?.tab;

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

    // Fire reminders in the background without blocking the page response
    dispatchPendingTaskRemindersAcrossBoards(dbUser.id).catch((error) => {
        console.warn('Skipping dashboard reminder dispatch for this request:', error);
    });

    const boards = await prisma.board.findMany({
        where: {
            OR: [
                { userId: dbUser.id },
                { members: { some: { userId: dbUser.id } } },
            ],
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                },
            },
            members: {
                select: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                },
            },
            columns: {
                select: {
                    _count: {
                        select: {
                            tasks: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const activeBoardCount = boards.filter((board) => !isBoardArchived(board.description)).length;
    const archivedBoardCount = boards.length - activeBoardCount;

    const enrichedBoards = boards.map((b) => {
        const memberMap = new Map<string, { id: string; name: string | null; email: string | null; image: string | null }>();
        if (b.user) memberMap.set(b.user.id, b.user);
        b.members.forEach((m) => {
            if (m.user) memberMap.set(m.user.id, m.user);
        });

        const taskCount = b.columns.reduce((sum, col) => sum + (col._count?.tasks ?? 0), 0);

        return {
            id: b.id,
            title: b.title,
            description: b.description,
            createdAt: b.createdAt,
            members: Array.from(memberMap.values()).map((user) => ({ user })),
            taskCount,
        };
    });

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

            <DashboardView
                userId={dbUser.id}
                userName={session.user.name}
                boards={enrichedBoards}
                activeBoardCount={activeBoardCount}
                archivedBoardCount={archivedBoardCount}
                assignedOpenTaskCount={assignedOpenTaskCount}
                overdueTaskCount={overdueTaskCount}
                dueSoonTasks={dueSoonTasks}
                unreadNotificationCount={unreadNotificationCount}
                recentActivity={recentActivity}
                teamMembers={teamMembers}
                initialTab={currentTab}
            />

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
