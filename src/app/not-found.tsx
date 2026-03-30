import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="min-h-screen app-bg flex items-center justify-center p-6">
            <section className="w-full max-w-2xl rounded-3xl app-surface p-8 sm:p-10 anim-panel-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold tracking-wide mb-4">
                    404
                    <span className="w-1 h-1 bg-cyan-300 rounded-full" />
                    Not Found
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-3">
                    This board does not exist
                    <br />
                    or you no longer have access.
                </h1>
                <p className="text-slate-600 leading-relaxed mb-8">
                    The link may be outdated, the board might have been removed,
                    or your membership has changed.
                </p>

                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/dashboard"
                        className="ui-btn-primary"
                    >
                        Go To Boards
                    </Link>
                    <Link
                        href="/login"
                        className="ui-btn-secondary"
                    >
                        Login Again
                    </Link>
                </div>
            </section>
        </main>
    );
}