import { auth, signOut } from '../../auth';
import { prisma } from '../lib/db';
import { redirect } from 'next/navigation';
import BoardsGrid from '../components/ui/BoardsGrid';
import DashboardNavbar from '../components/ui/DashboardNavbar';
import DashboardOnboardingTour from '../components/onboarding/DashboardOnboardingTour';
import { dispatchPendingTaskRemindersAcrossBoards } from '../lib/reminders';
import { isBoardArchived } from '../lib/archiveMarkers';

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.email) redirect('/login');

  const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!dbUser) redirect('/login');

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

      <main className="flex-1 px-6 py-10 max-w-7xl mx-auto w-full">
        {/* Page heading */}
        <div className="mb-8 app-surface rounded-3xl p-6 md:p-7 border border-slate-200/70 anim-fade-up" data-tour="dashboard-title">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your Boards</h1>
              <p className="text-slate-600 mt-1">Welcome back, {session.user.name}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {activeBoardCount} active board{activeBoardCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
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
            <p className="text-lg font-semibold text-gray-700">No boards yet</p>
            <p className="text-gray-400 mt-1 text-sm">Click &ldquo;Create Board&rdquo; in the navbar to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 anim-fade-up">
            <BoardsGrid boards={boards} />
          </div>
        )}
      </main>

      <DashboardOnboardingTour
        userId={dbUser.id}
        firstBoardId={boards[0]?.id}
        boardCount={boards.length}
      />
    </div>
  );
}

// import { prisma } from '../lib/db';
// import { redirect } from 'next/navigation';
// import { auth } from '../../auth';

// // Never pre-render at build time — this page queries the database at runtime
// export const dynamic = 'force-dynamic';

// export default async function Home() {
//   const session = await auth();

//   if (!session?.user) {
//     redirect('/login');
//   }

//   // Find the first available board for the logged-in user
//   const firstBoard = await prisma.board.findFirst();

//   if (firstBoard) {
//     redirect(`/board/${firstBoard.id}`);
//   }

//   return (
//     <div className="p-8 text-center">
//       <h1 className="text-2xl font-bold text-red-500">No boards found in the database.</h1>
//       <p>Please run `npx tsx prisma/seed.ts` to populate the data.</p>
//     </div>
//   );
// }