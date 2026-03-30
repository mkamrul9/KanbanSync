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