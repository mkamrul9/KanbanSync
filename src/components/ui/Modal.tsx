'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

/**
 * A stable subscribe function that never triggers re-renders from the external store.
 * Used by `useSyncExternalStore` to detect client-side hydration without `useEffect`.
 */
const subscribe = () => () => { };

/**
 * A generic, accessible modal dialog rendered via a React portal into `document.body`.
 *
 * Uses `useSyncExternalStore` to detect client-side mounting, avoiding the SSR/hydration
 * mismatch that occurs when calling `createPortal` during server rendering. No `useEffect`
 * is required — the component safely returns `null` on the server and re-renders with the
 * portal after hydration.
 *
 * @param {ModalProps} props
 * @param {boolean} props.isOpen - Controls modal visibility.
 * @param {() => void} props.onClose - Callback when the close button is clicked.
 * @param {React.ReactNode} props.children - Modal content.
 * @param {string} [props.className] - Override the modal panel width/sizing class.
 */
export default function Modal({ isOpen, onClose, children, className }: ModalProps) {
    const mounted = useSyncExternalStore(subscribe, () => true, () => false);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-md p-4">
            <div className={`app-bg rounded-2xl shadow-2xl ring-1 ring-slate-200/80 w-full relative overflow-hidden ${className ?? 'max-w-md'}`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 shadow-sm transition-colors text-sm"
                    aria-label="Close modal"
                >
                    ✕
                </button>
                {children}
            </div>
        </div>,
        document.body
    );
}