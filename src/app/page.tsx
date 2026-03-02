import { auth, signOut } from '../../auth';
import { prisma } from '../lib/db';
import { createBoard } from '../actions/boardActions';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await auth();

  // Middleware should catch this, but it's good defensive programming
  if (!session?.user?.email) redirect('/login');

  // Resolve the current DB user by email (safe even after a DB reset with stale JWT)
  const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!dbUser) redirect('/login'); // user row missing — force fresh sign-in

  // Fetch ONLY the boards belonging to this specific user
  const boards = await prisma.board.findMany({
    where: { userId: dbUser.id },
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
          <form action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </form>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* List Existing Boards */}
          {boards.map((board) => (
            <Link
              href={`/board/${board.id}`}
              key={board.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group h-32 flex flex-col justify-between"
            >
              <h2 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                {board.title}
              </h2>
              <span className="text-sm text-gray-400">Open board →</span>
            </Link>
          ))}

          {/* Create New Board Form */}
          <form action={createBoard} className="h-32">
            <div className="bg-blue-50/50 p-6 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors h-full flex flex-col justify-center items-center relative overflow-hidden group">
              <input
                type="text"
                name="title"
                placeholder="New board title..."
                required
                className="w-full bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-600 px-2 py-1 mb-3 text-center transition-colors z-10"
              />
              <button
                type="submit"
                className="text-blue-600 font-medium z-10 hover:text-blue-800"
              >
                + Create Board
              </button>
            </div>
          </form>
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