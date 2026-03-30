import { auth } from '../../auth';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const session = await auth();
  const query = await searchParams;
  const tourQuery = query?.tour === '1' ? '?tour=1' : '';

  if (!session?.user?.email) {
    redirect('/login');
  }

  redirect(`/dashboard${tourQuery}`);
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