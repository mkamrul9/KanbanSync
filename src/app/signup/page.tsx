import Link from 'next/link';
import { signupWithCredentials } from '../../actions/authActions';

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const query = await searchParams;
    const errorMessage = query?.error ? decodeURIComponent(query.error) : null;

    return (
        <div className="min-h-screen app-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full app-surface border border-[--ks-border] p-10 rounded-3xl shadow-xl anim-panel-in">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-[--ks-text-primary] tracking-tight">
                        Create your account
                    </h2>
                    <p className="mt-2 text-sm text-[--ks-text-secondary]">
                        Sign up with your email and password.
                    </p>
                </div>

                {errorMessage ? (
                    <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                        {errorMessage}
                    </div>
                ) : null}

                <form action={signupWithCredentials} className="space-y-3.5">
                    <input
                        type="text"
                        name="name"
                        required
                        placeholder="Your full name"
                        className="w-full rounded-xl border border-[--ks-border] bg-[--ks-bg-card] px-3 py-3 text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:outline-none focus:ring-2 focus:ring-[--ks-primary] focus:border-transparent"
                    />
                    <input
                        type="email"
                        name="email"
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-[--ks-border] bg-[--ks-bg-card] px-3 py-3 text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:outline-none focus:ring-2 focus:ring-[--ks-primary] focus:border-transparent"
                    />
                    <input
                        type="password"
                        name="password"
                        minLength={8}
                        required
                        placeholder="At least 8 characters"
                        className="w-full rounded-xl border border-[--ks-border] bg-[--ks-bg-card] px-3 py-3 text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:outline-none focus:ring-2 focus:ring-[--ks-primary] focus:border-transparent"
                    />
                    <button
                        type="submit"
                        className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[--ks-primary] hover:bg-[--ks-primary-hover] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--ks-primary] transition-colors shadow-sm"
                    >
                        Sign up
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-[--ks-text-secondary]">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-[--ks-primary] hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}