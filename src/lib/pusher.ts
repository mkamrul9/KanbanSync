import PusherClient from 'pusher-js';

/**
 * Initializes and returns the browser-side Pusher client for real-time WebSocket subscriptions.
 * Safe to import inside Client Components.
 * 
 * @throws {Error} If Pusher environmental variables are missing.
 * @returns {PusherClient} The initialized Pusher client instance.
 */
type MockChannel = {
    bind: (event: string, callback: (...args: any[]) => void) => MockChannel;
    unbind: (event: string, callback?: (...args: any[]) => void) => MockChannel;
};

type MockPusherClient = {
    subscribe: (channelName: string) => MockChannel;
    unsubscribe: (channelName: string) => void;
    disconnect: () => void;
};

const createMockPusherClient = (): MockPusherClient => {
    const mockChannel: MockChannel = {
        bind: () => mockChannel,
        unbind: () => mockChannel,
    };
    return {
        subscribe: () => mockChannel,
        unsubscribe: () => {},
        disconnect: () => {},
    };
};

/**
 * Initializes and returns the browser-side Pusher client for real-time WebSocket subscriptions.
 * Safe to import inside Client Components.
 * 
 * Falls back to a safe mock client if Pusher keys are missing so local dev never crashes.
 */
export const getPusherClient = () => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();

    if (!key || !cluster) {
        return createMockPusherClient() as unknown as PusherClient;
    }

    try {
        return new PusherClient(key, { cluster });
    } catch {
        return createMockPusherClient() as unknown as PusherClient;
    }
};