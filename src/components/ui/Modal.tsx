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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-tour-fade">
            <div className={`bg-[--ks-bg-elevated] text-[--ks-text-primary] rounded-2xl shadow-[--ks-shadow-lg] border border-[--ks-border] w-full relative overflow-hidden animate-ks-modal ${className ?? 'max-w-md'}`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-lg text-[--ks-text-muted] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-overlay] border border-[--ks-border] transition-colors text-sm"
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