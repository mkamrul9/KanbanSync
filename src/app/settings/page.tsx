import { auth, signOut } from '../../../auth';
import { prisma } from '../../lib/db';
import { redirect } from 'next/navigation';
import DashboardNavbar from '../../components/ui/DashboardNavbar';
import Sidebar from '../../components/ui/Sidebar';
import ToastContainer from '../../components/ui/ToastContainer';
import ThemeToggle from '../../components/ui/ThemeToggle';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user?.email) redirect('/login');

    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) redirect('/login');

    const boardCount = await prisma.board.count({
        where: {
            OR: [
                { userId: dbUser.id },
                { members: { some: { userId: dbUser.id } } },
            ],
        },
    });

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
                boardCount={boardCount}
                signOutAction={signOutAction}
            />
            <ToastContainer />

            <div className="flex-1 flex w-full">
                <Sidebar boardCount={boardCount} />

                <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 w-full min-w-0">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-[--ks-text-primary] tracking-tight">Settings</h1>
                            <p className="text-xs text-[--ks-text-muted] mt-1">Manage your account preferences and application appearance</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Profile Section */}
                        <div className="rounded-[14px] bg-[--ks-bg-card] border border-[--ks-border] p-5 shadow-[--ks-shadow]">
                            <h2 className="text-[15px] font-semibold text-[--ks-text-primary] mb-4">Account Profile</h2>
                            <div className="flex items-center gap-4">
                                {session.user.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name ?? 'User'}
                                        className="w-14 h-14 rounded-full object-cover border border-[--ks-border]"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[--ks-primary] to-[--ks-accent] text-white text-lg font-bold flex items-center justify-center">
                                        {session.user.name?.[0] ?? session.user.email?.[0] ?? '?'}
                                    </div>
                                )}
                                <div>
                                    <p className="text-base font-semibold text-[--ks-text-primary]">{session.user.name ?? 'User'}</p>
                                    <p className="text-sm text-[--ks-text-muted]">{session.user.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Appearance Section */}
                        <div className="rounded-[14px] bg-[--ks-bg-card] border border-[--ks-border] p-5 shadow-[--ks-shadow]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-[15px] font-semibold text-[--ks-text-primary]">Appearance</h2>
                                    <p className="text-xs text-[--ks-text-muted] mt-0.5">Toggle between Dark and Light mode themes</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ThemeToggle />
                                </div>
                            </div>
                        </div>

                        {/* Quick Navigation */}
                        <div className="rounded-[14px] bg-[--ks-bg-card] border border-[--ks-border] p-5 shadow-[--ks-shadow]">
                            <h2 className="text-[15px] font-semibold text-[--ks-text-primary] mb-3">Quick Links</h2>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href="/dashboard"
                                    className="text-xs px-3 py-1.5 rounded-full border border-[--ks-border] bg-[--ks-bg-overlay] text-[--ks-text-secondary] hover:text-[--ks-primary] hover:border-[--ks-primary] transition-colors"
                                >
                                    &larr; Back to Dashboard
                                </Link>
                                <Link
                                    href="/help"
                                    className="text-xs px-3 py-1.5 rounded-full border border-[--ks-border] bg-[--ks-bg-overlay] text-[--ks-text-secondary] hover:text-[--ks-primary] hover:border-[--ks-primary] transition-colors"
                                >
                                    Help Center
                                </Link>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
