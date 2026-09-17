import PusherServer from 'pusher';

/**
 * Singleton instance of the server-side Pusher client used for broadcasting events.
 * 
 * **WARNING**: Never import this file into Client Components. Doing so will bundle Node.js 
 * specific dependencies into the browser build and cause Vercel build failures.
 * For client subscriptions, import `getPusherClient` from `pusher.ts`.
 */
export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});
