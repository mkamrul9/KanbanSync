/**
 * Static credentials for the KanbanSync public demo account.
 *
 * This account is pre-seeded with an example board so new visitors can
 * explore the application immediately without creating an account.
 *
 * @remarks
 * These credentials are intentionally exposed — the demo account is a
 * read-write sandbox and is reset periodically. Do NOT store sensitive
 * data on boards accessible to this account.
 */
export const DEMO_ACCOUNT = {
    name: 'KanbanSync Demo',
    email: 'demo@kanbansync.app',
    password: 'Demo1234!',
} as const;