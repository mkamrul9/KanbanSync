'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type GuidedTourStep = {
    title: string;
    description: string;
    selector?: string;
    missingHint?: string;
};

type Rect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

interface GuidedTourProps {
    userId: string;
    storageKey: string;
    tourName: string;
    steps: GuidedTourStep[];
    forceStart?: boolean;
    forceStartToken?: number;
    autoStartWhenUnseen?: boolean;
    finishLabel?: string;
    onStepChange?: (stepIndex: number, step: GuidedTourStep) => void;
    onFinish?: () => void;
}

function getStorageName(storageKey: string, userId: string) {
    return `ks-tour-${storageKey}-${userId}`;
}

export default function GuidedTour({
    userId,
    storageKey,
    tourName,
    steps,
    forceStart = false,
    forceStartToken = 0,
    autoStartWhenUnseen = true,
    finishLabel = 'Finish tour',
    onStepChange,
    onFinish,
}: GuidedTourProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<Rect | null>(null);

    const fullStorageKey = useMemo(() => getStorageName(storageKey, userId), [storageKey, userId]);
    const step = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;

    useEffect(() => {
        if (!userId) return;
        const done = localStorage.getItem(fullStorageKey) === 'done';
        if (forceStart || forceStartToken > 0 || (autoStartWhenUnseen && !done)) {
            const openTimer = window.setTimeout(() => {
                setStepIndex(0);
                setIsOpen(true);
            }, 0);
            return () => window.clearTimeout(openTimer);
        }
    }, [forceStart, forceStartToken, autoStartWhenUnseen, fullStorageKey, userId]);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        const selector = step?.selector;

        if (!isOpen || !selector) {
            const clearTimer = window.setTimeout(() => setTargetRect(null), 0);
            return () => window.clearTimeout(clearTimer);
        }

        const updateRect = () => {
            const target = document.querySelector(selector) as HTMLElement | null;
            if (!target) {
                setTargetRect(null);
                return;
            }
            const rect = target.getBoundingClientRect();
            setTargetRect({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
            });
        };

        updateRect();

        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        const timer = window.setInterval(updateRect, 250);

        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
            window.clearInterval(timer);
        };
    }, [isOpen, step]);

    useEffect(() => {
        const selector = step?.selector;
        if (!isOpen || !selector) return;

        let attempts = 0;
        const maxAttempts = 8;

        const scrollTargetIntoView = () => {
            const target = document.querySelector(selector) as HTMLElement | null;
            if (!target) {
                attempts += 1;
                if (attempts >= maxAttempts) return;
                window.setTimeout(scrollTargetIntoView, 120);
                return;
            }

            const rect = target.getBoundingClientRect();
            const needsVerticalScroll = rect.top < 80 || rect.bottom > (window.innerHeight - 120);
            if (needsVerticalScroll) {
                target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
            }
        };

        const timer = window.setTimeout(scrollTargetIntoView, 40);
        return () => window.clearTimeout(timer);
    }, [isOpen, stepIndex, step]);

    useEffect(() => {
        if (!isOpen || !step) return;
        onStepChange?.(stepIndex, step);
    }, [isOpen, onStepChange, step, stepIndex]);

    const completeTour = useCallback(() => {
        localStorage.setItem(fullStorageKey, 'done');
        setIsOpen(false);
        setStepIndex(0);
        onFinish?.();
    }, [fullStorageKey, onFinish]);

    const handleNext = () => {
        if (isLastStep) {
            completeTour();
            return;
        }
        setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    };

    const handleBack = () => {
        setStepIndex((prev) => Math.max(prev - 1, 0));
    };

    if (!isOpen || !step) return null;

    return (
        <div className="fixed inset-0 z-120 pointer-events-none">
            {!targetRect && (
                <div className="absolute inset-0 bg-slate-950/45 animate-tour-fade" />
            )}

            {targetRect && (
                <>
                    {/* Top blur layer */}
                    <div
                        className="absolute bg-slate-950/45 animate-tour-fade"
                        style={{ top: 0, left: 0, right: 0, height: Math.max(0, targetRect.top - 10) }}
                    />

                    {/* Bottom blur layer */}
                    <div
                        className="absolute bg-slate-950/45 animate-tour-fade"
                        style={{
                            top: targetRect.top + targetRect.height + 10,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                    />

                    {/* Left blur layer */}
                    <div
                        className="absolute bg-slate-950/45 animate-tour-fade"
                        style={{
                            top: Math.max(0, targetRect.top - 10),
                            left: 0,
                            width: Math.max(0, targetRect.left - 10),
                            height: targetRect.height + 20,
                        }}
                    />

                    {/* Right blur layer */}
                    <div
                        className="absolute bg-slate-950/45 animate-tour-fade"
                        style={{
                            top: Math.max(0, targetRect.top - 10),
                            left: targetRect.left + targetRect.width + 10,
                            right: 0,
                            height: targetRect.height + 20,
                        }}
                    />
                </>
            )}

            {targetRect && (
                <div
                    className="absolute rounded-2xl border-2 border-cyan-300 bg-transparent animate-tour-spotlight"
                    style={{
                        top: Math.max(8, targetRect.top - 8),
                        left: Math.max(8, targetRect.left - 8),
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                    }}
                />
            )}

            <div className="pointer-events-auto absolute left-1/2 bottom-5 -translate-x-1/2 w-[min(92vw,680px)] animate-tour-card">
                <div className="rounded-2xl app-bg ring-1 ring-slate-200/80 text-slate-900 shadow-2xl overflow-hidden">
                    <div className="ui-modal-header flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-700 font-semibold">{tourName}</p>
                            <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                        </div>
                        <span className="text-xs text-slate-600 bg-white px-2 py-1 rounded-full border border-slate-200">{stepIndex + 1}/{steps.length}</span>
                    </div>

                    <div className="ui-modal-body">
                        <p className="text-sm leading-relaxed text-slate-700">{step.description}</p>

                        {step.selector && !targetRect && step.missingHint && (
                            <p className="mt-3 text-xs text-amber-200 bg-amber-600/20 border border-amber-300/30 rounded-lg px-3 py-2">
                                {step.missingHint}
                            </p>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                {steps.map((_, idx) => (
                                    <span
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all ${idx === stepIndex ? 'w-6 bg-cyan-300' : 'w-1.5 bg-slate-600'}`}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={completeTour}
                                    className="ui-btn-secondary px-3 py-1.5 text-xs"
                                >
                                    Skip
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    disabled={stepIndex === 0}
                                    className="ui-btn-secondary px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="ui-btn-primary px-3.5 py-1.5 text-xs"
                                >
                                    {isLastStep ? finishLabel : 'Next'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
