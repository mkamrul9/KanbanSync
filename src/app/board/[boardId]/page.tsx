import { getBoardData } from '../../../lib/dataAccessLayer';
import KanbanBoard from '../../../components/features/board/KanbanBoard';
import { notFound } from 'next/navigation';
import { getUserRole } from '../../../lib/permission';
import BoardNavbar from '../../../components/ui/BoardNavbar';
import BoardSubHeader from '../../../components/features/board/BoardSubHeader';
import { auth, signOut } from '../../../../auth';
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
        try {
            await dispatchPendingTaskRemindersForUser(session.user.id, boardId);
        } catch (error) {
            console.warn('Skipping reminder dispatch for this request:', error);
        }
    }

    const [board, userRoleRaw] = await Promise.all([
        getBoardData(boardId),
        getUserRole(boardId).catch((error) => {
            console.warn('Failed to resolve user role for board page:', error);
            return null;
        }),
    ]);
    const userRole = userRoleRaw;

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
        <div className="min-h-screen app-bg flex flex-col">
            <BoardNavbar
                board={board}
                userRole={userRole}
                userId={session?.user?.id ?? ''}
                userName={session?.user?.name}
                userEmail={session?.user?.email}
                userImage={session?.user?.image}
                signOutAction={signOutAction}
            />

            {/* Board subheader: back button, progress pill, actions */}
            <BoardSubHeader board={board} userRole={userRole} />

            <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="app-surface rounded-2xl border border-[--ks-border] p-4 sm:p-5">
                    <KanbanBoard initialBoard={board} userRole={userRole} currentUserEmail={session?.user?.email ?? ''} />
                </div>
            </div>

            <BoardOnboardingTour userId={session?.user?.id ?? ''} forceStart={forceTour} />
        </div>
    );
}