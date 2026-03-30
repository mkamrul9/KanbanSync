'use client';

import { useEffect, useState } from 'react';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

class ToastStore {
    private listeners: Set<(toasts: Toast[]) => void> = new Set();
    private toasts: Toast[] = [];
    private timeouts: Map<string, NodeJS.Timeout> = new Map();

    subscribe(listener: (toasts: Toast[]) => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify() {
        this.listeners.forEach((listener) => listener([...this.toasts]));
    }

    add(type: Toast['type'], message: string, duration = 4000) {
        const id = Math.random().toString(36).slice(2);
        const toast: Toast = { id, type, message, duration };
        this.toasts.push(toast);
        this.notify();

        if (duration > 0) {
            const timeout = setTimeout(() => {
                this.remove(id);
            }, duration);
            this.timeouts.set(id, timeout);
        }

        return id;
    }

    remove(id: string) {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        const timeout = this.timeouts.get(id);
        if (timeout) clearTimeout(timeout);
        this.timeouts.delete(id);
        this.notify();
    }

    getToasts() {
        return [...this.toasts];
    }
}

export const toastStore = new ToastStore();

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>(() => toastStore.getToasts());

    useEffect(() => {
        const unsubscribe = toastStore.subscribe(setToasts);
        return unsubscribe;
    }, []);

    return {
        success: (message: string, duration?: number) => toastStore.add('success', message, duration),
        error: (message: string, duration?: number) => toastStore.add('error', message, duration),
        info: (message: string, duration?: number) => toastStore.add('info', message, duration),
        warning: (message: string, duration?: number) => toastStore.add('warning', message, duration),
        toasts,
        remove: (id: string) => toastStore.remove(id),
    };
}

const iconMap = {
    success: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16.2L4.8 12m-1.6 0L1.2 10.4M20 8L9.5 18.5m0 0a1.5 1.5 0 01-2.121 0l-2.121-2.121M21 5l-9.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l10.39 18H1.61L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    info: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 16v-2.5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
};

const styleMap = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-rose-50 border-rose-200 text-rose-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
};

const iconColorMap = {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
};

export default function ToastContainer() {
    const { toasts, remove } = useToast();

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`${styleMap[toast.type]} border rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right-4 pointer-events-auto max-w-sm`}
                >
                    <div className={iconColorMap[toast.type]}>{iconMap[toast.type]}</div>
                    <p className="text-sm font-medium flex-1">{toast.message}</p>
                    <button
                        onClick={() => remove(toast.id)}
                        className="p-1 hover:opacity-70 transition-opacity"
                        aria-label="Close toast"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
