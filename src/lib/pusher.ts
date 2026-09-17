import PusherClient from 'pusher-js';

/**
 * Initializes and returns the browser-side Pusher client for real-time WebSocket subscriptions.
 * Safe to import inside Client Components.
 * 
 * @throws {Error} If Pusher environmental variables are missing.
 * @returns {PusherClient} The initialized Pusher client instance.
 */
export const getPusherClient = () => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
        throw new Error('Missing Pusher public keys. Set NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER.');
    }

    return new PusherClient(
        process.env.NEXT_PUBLIC_PUSHER_KEY,
        { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER }
    );
};