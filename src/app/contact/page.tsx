'use client';

import { FormEvent, useState } from 'react';

type ContactResponse = {
    success: boolean;
    message: string;
    mailtoUrl?: string;
};

export default function ContactPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<ContactResponse | null>(null);

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus(null);
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, subject, message }),
            });

            const data = (await response.json()) as ContactResponse;
            setStatus(data);

            if (!response.ok) {
                return;
            }

            setName('');
            setEmail('');
            setSubject('');
            setMessage('');

            if (data.mailtoUrl) {
                window.open(data.mailtoUrl, '_blank');
            }
        } catch {
            setStatus({ success: false, message: 'Could not submit your message. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen app-bg px-3 py-7 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-3xl">
                <section className="app-surface rounded-2xl p-5 sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Contact Us</p>
                    <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Send us a message</h1>
                    <p className="mt-3 text-sm text-slate-600 sm:text-base">
                        Tell us what you need help with, what feature you want, or what is not working.
                    </p>

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                            <input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                placeholder="you@company.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="subject" className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                            <input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                placeholder="Need help with board permissions"
                            />
                        </div>

                        <div>
                            <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">Message</label>
                            <textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                                minLength={15}
                                rows={6}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                placeholder="Share details so we can help quickly..."
                            />
                        </div>

                        <button type="submit" disabled={isSubmitting} className="ui-btn-primary w-full text-center sm:w-auto disabled:cursor-not-allowed disabled:opacity-60">
                            {isSubmitting ? 'Sending...' : 'Send message'}
                        </button>
                    </form>

                    {status && (
                        <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${status.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                            {status.message}
                        </p>
                    )}
                </section>
            </div>
        </main>
    );
}
