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
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
        return null;
    }

    if (!clientInstance) {
        clientInstance = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY,
            { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER }
        );
    }

    return clientInstance;
};