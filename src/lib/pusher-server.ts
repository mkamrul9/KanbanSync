import PusherServer from 'pusher';

/**
 * Singleton instance of the server-side Pusher client used for broadcasting events.
 * 
 * **WARNING**: Never import this file into Client Components. Doing so will bundle Node.js 
 * specific dependencies into the browser build and cause Vercel build failures.
 * For client subscriptions, import `getPusherClient` from `pusher.ts`.
 */
const appId = process.env.PUSHER_APP_ID?.trim();
const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
const secret = process.env.PUSHER_SECRET?.trim();
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();

const realPusher = (appId && key && secret && cluster)
    ? new PusherServer({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
    })
    : null;

export const pusherServer = {
    trigger: async (channel: string | string[], event: string, data: any) => {
        if (!realPusher) return;
        try {
            return await realPusher.trigger(channel, event, data);
        } catch (error) {
            console.warn('[Pusher] Trigger skipped/failed:', error);
        }
    },
};
