// src/actions/auth-actions.ts
'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { hash } from 'bcryptjs';
import { signIn, signOut } from '../../auth'; // Adjust path to root auth.ts
import { prisma } from '../lib/db';
import { DEMO_ACCOUNT } from '../lib/demoAccount';

/**
 * Initiates the GitHub OAuth login flow.
 * Redirects the user to the root page upon successful authentication.
 * 
 * @returns {Promise<void>} Does not return; it performs a redirect.
 */
export async function loginWithGithub() {
    await signIn('github', { redirectTo: '/' });
}

/**
 * Initiates the Google OAuth login flow.
 * Redirects the user to the root page upon successful authentication.
 * 
 * @returns {Promise<void>} Does not return; it performs a redirect.
 */
export async function loginWithGoogle() {
    await signIn('google', { redirectTo: '/' });
}

/**
 * Ensures that the demo account exists in the database if the user attempts to log in with the demo email.
 * This automatically seeds the database with the demo credentials if they are missing.
 * 
 * @param {string} email - The email address attempting to log in.
 * @returns {Promise<void>}
 */
async function ensureDemoUserExistsIfRequested(email: string) {
    if (email !== DEMO_ACCOUNT.email.toLowerCase()) return;

    const hashedPassword = await hash(DEMO_ACCOUNT.password, 12);
    await prisma.user.upsert({
        where: { email: DEMO_ACCOUNT.email },
        update: {
            name: DEMO_ACCOUNT.name,
            hashedPassword,
        },
        create: {
            name: DEMO_ACCOUNT.name,
            email: DEMO_ACCOUNT.email,
            hashedPassword,
        },
    });
}

/**
 * Authenticates a user using traditional email/password credentials.
 * Performs validation, checks for demo account seeding, and manages NextAuth sign-in.
 * 
 * @param {FormData} formData - The submitted login form data containing 'email' and 'password'.
 * @throws {Error} Will redirect to login page with an error query string on failure.
 * @returns {Promise<void>} Redirects to the dashboard on success.
 */
export async function loginWithCredentials(formData: FormData) {
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
        redirect('/login?error=Email%20and%20password%20are%20required');
    }

    try {
        await ensureDemoUserExistsIfRequested(email);

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            redirect('/login?error=Invalid%20email%20or%20password');
        }

        redirect('/');
    } catch (error) {
        if (error instanceof AuthError) {
            redirect('/login?error=Invalid%20email%20or%20password');
        }
        throw error;
    }
}

/**
 * Registers a new user with email and password credentials.
 * Validates inputs, hashes the password, and updates/creates the database record.
 * Automatically logs the user in after successful registration.
 * 
 * @param {FormData} formData - The submitted sign-up form data containing 'name', 'email', and 'password'.
 * @throws {Error} Will redirect to signup page with an error query string on validation or conflict failure.
 * @returns {Promise<void>} Redirects to the dashboard on success.
 */
export async function signupWithCredentials(formData: FormData) {
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');

    if (!name || !email || !password) {
        redirect('/signup?error=All%20fields%20are%20required');
    }

    if (password.length < 8) {
        redirect('/signup?error=Password%20must%20be%20at%20least%208%20characters');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    const hashedPassword = await hash(password, 12);

    if (existingUser?.hashedPassword) {
        redirect('/signup?error=Email%20already%20has%20an%20account');
    }

    if (existingUser && !existingUser.hashedPassword) {
        await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                name,
                hashedPassword,
            },
        });
    } else if (!existingUser) {
        await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword,
            },
        });
    }

    try {
        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            redirect('/login?error=Account%20created,%20please%20sign%20in');
        }

        redirect('/');
    } catch (error) {
        if (error instanceof AuthError) {
            redirect('/login?error=Account%20created,%20please%20sign%20in');
        }
        throw error;
    }
}

/**
 * Logs out the current authenticated user and clears their session.
 * 
 * @returns {Promise<void>} Redirects to the login page.
 */
export async function logout() {
    await signOut({ redirectTo: '/login' });
}