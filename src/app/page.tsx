import { auth, signOut } from '../../auth';
import { prisma } from '../lib/db';
import { redirect } from 'next/navigation';
import NotificationsBell from '../components/ui/NotificationsBell';
import CreateBoardButton from '../components/ui/CreateBoardButton';
import BoardsGrid from '../components/ui/BoardsGrid';

export default async function Dashboard() {
  const session = await auth();

  // Middleware should catch this, but it's good defensive programming
  if (!session?.user?.email) redirect('/login');

  // Resolve the current DB user by email (safe even after a DB reset with stale JWT)
  const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!dbUser) redirect('/login'); // user row missing — force fresh sign-in

  // Fetch boards the user owns OR is a member of
  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { userId: dbUser.id },
        { members: { some: { userId: dbUser.id } } }
      ]
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Boards</h1>
            <p className="text-gray-500">Welcome back, {session.user.name}</p>
          </div>

          {/* Logout Button — uses NextAuth v5 server action */}
          <div className="flex items-center gap-4">
            <NotificationsBell userId={dbUser.id} />
            <form action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}>
              <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BoardsGrid boards={boards} />

          {/* Create New Board Button + Modal */}
          <div className="col-span-1 md:col-span-3">
            <div className="flex justify-end">
              <CreateBoardButton />
            </div>
          </div>
        </div>
      </div>
    </main>
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