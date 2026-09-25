import PusherClient from 'pusher-js';

/**
 * Initializes and returns the browser-side Pusher client for real-time WebSocket subscriptions.
 * Safe to import inside Client Components.
 * 
 * @throws {Error} If Pusher environmental variables are missing.
 * @returns {PusherClient} The initialized Pusher client instance.
 */
let clientInstance: PusherClient | null = null;

export const getPusherClient = (): PusherClient | null => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();

    if (!key || !cluster) {
        return null;
    }

    if (!clientInstance) {
        try {
            clientInstance = new PusherClient(key, { cluster });
        } catch {
            return null;
        }
    }

    return clientInstance;
};