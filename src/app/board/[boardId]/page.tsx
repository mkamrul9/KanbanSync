import { getBoardData } from '../../../lib/dataAccessLayer';
import KanbanBoard from '../../../components/features/board/KanbanBoard';
import { notFound } from 'next/navigation';
import { getUserRole } from '../../../lib/permission';
import BoardNavbar from '../../../components/ui/BoardNavbar';
import { auth, signOut } from '../../../../auth';
import Link from 'next/link';
import BoardOnboardingTour from '../../../components/onboarding/BoardOnboardingTour';
import { dispatchPendingTaskRemindersForUser } from '../../../lib/reminders';

export const dynamic = 'force-dynamic';

export default async function BoardPage({
    params,
    searchParams,
}: {
    params: Promise<{ boardId: string }>;
    searchParams: Promise<{ tour?: string }>;
}) {
    const { boardId } = await params;
    const query = await searchParams;
    const forceTour = query?.tour === '1';

    // Resolve auth first — needed by both getBoardData and getUserRole.
    // Keeping it outside Promise.all prevents notFound() from being swallowed
    // by a concurrent executor in production builds.
    const session = await auth();

    if (!session?.user) {
        notFound();
    }

    if (session.user.id) {
        await dispatchPendingTaskRemindersForUser(session.user.id, boardId);
    }

    const [board, userRole] = await Promise.all([
        getBoardData(boardId),
        getUserRole(boardId),
    ]);

    // Call notFound() here in the component — never inside Promise.all or the DAL.
    // Next.js can only intercept its special notFound/redirect errors when thrown
    // from the page component directly; throwing from inside Promise.all
    // breaks the mechanism in production builds.
    if (!board) notFound();

    const signOutAction = async () => {
        'use server';
        await signOut({ redirectTo: '/login' });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <BoardNavbar
                board={board}
                userRole={userRole}
                userId={session?.user?.id ?? ''}
                userName={session?.user?.name}
                userEmail={session?.user?.email}
                userImage={session?.user?.image}
                signOutAction={signOutAction}
            />

            {/* Subheader: back button */}
            <div className="bg-white border-b border-gray-100">
                <div className="px-6 py-3 flex items-center gap-3">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors shrink-0 group"
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Back to Boards
                    </Link>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <KanbanBoard initialBoard={board} userRole={userRole} currentUserEmail={session?.user?.email ?? ''} />
            </div>

            <BoardOnboardingTour userId={session?.user?.id ?? ''} forceStart={forceTour} />
        </div>
    );
}