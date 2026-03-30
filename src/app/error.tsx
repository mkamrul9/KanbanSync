'use client';

import Link from 'next/link';

export default function Error({ reset }: { error: Error; reset: () => void }) {
    return (
        <main className="min-h-screen app-bg text-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl rounded-3xl app-surface overflow-hidden anim-panel-in">
                <div className="p-8 sm:p-10">
                    <p className="text-xs tracking-[0.22em] uppercase text-cyan-700 font-semibold mb-3">KanbanSync</p>
                    <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3 text-slate-900">Something went wrong while loading this page.</h1>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        The good news: your data is still safe. This is usually temporary.
                        Try reloading this page or jump back to your dashboard.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <button
                            onClick={reset}
                            className="ui-btn-primary"
                        >
                            Try Again
                        </button>
                        <Link
                            href="/dashboard"
                            className="ui-btn-secondary"
                        >
                            Back To Boards
                        </Link>
                    </div>
                </div>

                <div className="h-2 bg-linear-to-r from-cyan-400 via-sky-400 to-indigo-500" />
            </div>
        </main>
    );
}