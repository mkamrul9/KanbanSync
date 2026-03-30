import Link from 'next/link';

const values = [
    {
        title: 'Clarity over complexity',
        text: 'Work should be visible and understandable at a glance for every teammate.',
    },
    {
        title: 'Flow over chaos',
        text: 'We focus on smooth delivery with limits, prioritization, and collaborative ownership.',
    },
    {
        title: 'People over process',
        text: 'Tools should support healthy teamwork, not force teams into rigid workflows.',
    },
];

export default function AboutPage() {
    return (
        <main className="min-h-screen app-bg px-3 py-7 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
                <section className="app-surface rounded-2xl p-5 sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">About Us</p>
                    <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        We build calm, high-clarity project execution tools
                    </h1>
                    <p className="mt-3 text-sm text-slate-600 sm:text-base">
                        KanbanSync helps teams turn scattered tasks into a focused, accountable, and measurable workflow.
                    </p>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Link href="/help" className="ui-btn-secondary w-full text-center sm:w-auto">Read Help Center</Link>
                        <Link href="/contact" className="ui-btn-primary w-full text-center sm:w-auto">Talk to Us</Link>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    {values.map((value) => (
                        <article key={value.title} className="app-surface rounded-2xl p-5">
                            <h2 className="text-base font-bold text-slate-900">{value.title}</h2>
                            <p className="mt-2 text-sm text-slate-600">{value.text}</p>
                        </article>
                    ))}
                </section>

                <section className="app-surface rounded-2xl p-5 sm:p-8">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">What KanbanSync includes</h2>
                    <ul className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        <li className="rounded-xl border border-slate-200 bg-white p-3">Boards with role-based collaboration</li>
                        <li className="rounded-xl border border-slate-200 bg-white p-3">Drag-and-drop workflow with real-time updates</li>
                        <li className="rounded-xl border border-slate-200 bg-white p-3">Task templates, reminders, and recurring tasks</li>
                        <li className="rounded-xl border border-slate-200 bg-white p-3">Metrics, audit logs, cycle planning, and timesheets</li>
                    </ul>
                </section>
            </div>
        </main>
    );
}
