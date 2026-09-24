'use client';

import Link from 'next/link';
import { useState } from 'react';

type CredentialsLoginFormProps = {
    action: (formData: FormData) => Promise<void>;
    demoEmail: string;
    demoPassword: string;
};

export default function CredentialsLoginForm({
    action,
    demoEmail,
    demoPassword,
}: CredentialsLoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <>
            <form action={action} className="space-y-3.5 mb-3">
                <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[--ks-border] bg-[--ks-bg-card] px-3 py-3 text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:outline-none focus:ring-2 focus:ring-[--ks-primary] focus:border-transparent"
                />
                <input
                    type="password"
                    name="password"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[--ks-border] bg-[--ks-bg-card] px-3 py-3 text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:outline-none focus:ring-2 focus:ring-[--ks-primary] focus:border-transparent"
                />
                <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[--ks-primary] hover:bg-[--ks-primary-hover] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--ks-primary] transition-colors shadow-sm"
                >
                    Sign in with Email
                </button>
            </form>

            <button
                type="button"
                onClick={() => {
                    setEmail(demoEmail);
                    setPassword(demoPassword);
                }}
                className="w-full mb-5 flex justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-[--ks-primary] bg-[--ks-primary-subtle] border border-[--ks-primary]/25 hover:opacity-90 transition-colors"
            >
                Use demo credentials
            </button>

            <p className="mb-6 text-center text-sm text-[--ks-text-secondary]">
                New here?{' '}
                <Link href="/signup" className="font-semibold text-[--ks-primary] hover:underline">
                    Create an account
                </Link>
            </p>
        </>
    );
}