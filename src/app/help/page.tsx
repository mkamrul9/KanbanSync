import Link from 'next/link';

const faqs = [
    {
        q: 'How do I create my first board?',
        a: 'From the dashboard, click Create Board, set a title and optional description, then start adding tasks.',
    },
    {
        q: 'How do I invite teammates?',
        a: 'Open any board, click Invite, then send an invitation using your teammate\'s email address.',
    },
    {
        q: 'What are pinned boards?',
        a: 'Pinned boards stay at the top of your dashboard. Use the pin icon on any board card to pin or unpin.',
    },
    {
        q: 'Can I restore archived boards or tasks?',
        a: 'Yes. Open Archived sections in dashboard or board view and click Restore before retention expires.',
    },
    {
        q: 'How do filters and saved views work?',
        a: 'Apply filters by assignee, category, date, or priority, then save the filter set as a reusable view.',
    },
    {
        q: 'How do I track team performance?',
        a: 'Use Metrics from the board toolbar to view throughput, completion trends, and individual contribution.',
    },
];

export default function HelpPage() {
    return (
        <main className="min-h-screen app-bg px-3 py-7 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
                <section className="app-surface rounded-2xl p-5 sm:p-8 anim-panel-in">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Help Center</p>
                    <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        Everything you need to use KanbanSync
                    </h1>
                    <p className="mt-3 text-sm text-slate-600 sm:text-base">
                        Start quickly, organize work clearly, and collaborate smoothly with your team.
                    </p>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Link href="/dashboard" className="ui-btn-primary w-full text-center sm:w-auto">Go to Dashboard</Link>
                        <Link href="/contact" className="ui-btn-secondary w-full text-center sm:w-auto">Contact Support</Link>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    <article className="app-surface rounded-2xl p-5">
                        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">1. Set up</h2>
                        <p className="mt-2 text-sm text-slate-600">Create a board, define columns, and set WIP limits for healthier flow.</p>
                    </article>
                    <article className="app-surface rounded-2xl p-5">
                        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">2. Execute</h2>
                        <p className="mt-2 text-sm text-slate-600">Create tasks with assignees, due dates, priorities, tags, and categories.</p>
                    </article>
                    <article className="app-surface rounded-2xl p-5">
                        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">3. Improve</h2>
                        <p className="mt-2 text-sm text-slate-600">Use analytics, audit logs, and cycle planning to improve delivery cadence.</p>
                    </article>
                </section>

                <section className="app-surface rounded-2xl p-5 sm:p-8">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">FAQ</h2>
                    <div className="mt-4 space-y-3">
                        {faqs.map((item) => (
                            <details key={item.q} className="rounded-xl border border-slate-200 bg-white p-4">
                                <summary className="cursor-pointer pr-4 text-sm font-semibold text-slate-800">{item.q}</summary>
                                <p className="mt-2 text-sm text-slate-600">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
