import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * PostgreSQL connection pool used by the Prisma adapter.
 * Connection string is sourced from `DATABASE_URL` environment variable.
 */
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Prisma adapter that connects the Prisma client to the `pg` connection pool.
 * Required for Prisma 7+ when using the `@prisma/adapter-pg` driver.
 */
const adapter = new PrismaPg(pool);

/**
 * Singleton Prisma client to prevent multiple instances during development hot-reloads.
 *
 * In production, a fresh PrismaClient is created per process.
 * In development, the client is attached to `globalThis` so Next.js hot-module
 * replacement (HMR) does not create a new connection pool on every file save.
 */
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;