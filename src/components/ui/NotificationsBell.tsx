'use client';

import { useEffect, useRef, useState } from 'react';
import { getPusherClient } from '../../lib/pusher';
import { acceptInvite, declineInvite } from '../../actions/notificationActions';

type NotificationItem = {
    id?: string;
    type: string;
    boardId?: string;
    taskId?: string;
    from?: string;
    fromName?: string | null;
    excerpt?: string;
    inviteId?: string;
    boardTitle?: string;
    taskTitle?: string;
    inviterName?: string | null;
    role?: string | null;
};

type InviteResult = 'accepted' | 'declined' | 'error';

function Spinner() {
    return (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    );
}

export default function NotificationsBell({ userId }: { userId: string }) {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [open, setOpen] = useState(false);
    // Track which inviteId is currently mid-request
    const [processing, setProcessing] = useState<Set<string>>(new Set());
    // Track the outcome to show a brief confirmation before removing
    const [results, setResults] = useState<Map<string, InviteResult>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!userId) return;
        const pusher = getPusherClient();
        const channel = pusher.subscribe(`user-${userId}`);
        const handleNotification = (data: NotificationItem) => {
            setItems((s) => [data, ...s].slice(0, 20));
        };
        channel.bind('notification', handleNotification);
        channel.bind('invite-received', handleNotification);
        channel.bind('invite-accepted', handleNotification);
        return () => {
            channel.unbind('notification', handleNotification);
            channel.unbind('invite-received', handleNotification);
            channel.unbind('invite-accepted', handleNotification);
            pusher.unsubscribe(`user-${userId}`);
        };
    }, [userId]);

    const removeAfterDelay = (inviteId: string) => {
        setTimeout(() => {
            setItems((s) => s.filter((i) => i.inviteId !== inviteId));
            setResults((m) => { const next = new Map(m); next.delete(inviteId); return next; });
        }, 1600);
    };

    const handleAccept = async (inviteId?: string) => {
        if (!inviteId) return;
        setProcessing((s) => new Set(s).add(inviteId));
        try {
            const res = await acceptInvite(inviteId);
            setProcessing((s) => { const n = new Set(s); n.delete(inviteId); return n; });
            if (res?.success) {
                setResults((m) => new Map(m).set(inviteId, 'accepted'));
                removeAfterDelay(inviteId);
            } else {
                setResults((m) => new Map(m).set(inviteId, 'error'));
                removeAfterDelay(inviteId);
            }
        } catch {
            setProcessing((s) => { const n = new Set(s); n.delete(inviteId); return n; });
            setResults((m) => new Map(m).set(inviteId, 'error'));
            removeAfterDelay(inviteId);
        }
    };

    const handleDecline = async (inviteId?: string) => {
        if (!inviteId) return;
        setProcessing((s) => new Set(s).add(inviteId));
        try {
            const res = await declineInvite(inviteId);
            setProcessing((s) => { const n = new Set(s); n.delete(inviteId); return n; });
            if (res?.success) {
                setResults((m) => new Map(m).set(inviteId, 'declined'));
                removeAfterDelay(inviteId);
            } else {
                setResults((m) => new Map(m).set(inviteId, 'error'));
                removeAfterDelay(inviteId);
            }
        } catch {
            setProcessing((s) => { const n = new Set(s); n.delete(inviteId); return n; });
            setResults((m) => new Map(m).set(inviteId, 'error'));
            removeAfterDelay(inviteId);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="relative inline-flex items-center p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
            >
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M15 17H9a3 3 0 006 0z" fill="currentColor" opacity="0.9" />
                    <path d="M12 2a6 6 0 00-6 6v3.586L4.293 14.293A1 1 0 005 16h14a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6z" fill="currentColor" />
                </svg>
                {items.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {items.length}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-84 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">Notifications</span>
                        {items.length > 0 && (
                            <span className="text-xs text-gray-400">{items.length} new</span>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
                        {items.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
                                <svg className="w-8 h-8 text-gray-200" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15 17H9a3 3 0 006 0z" opacity="0.9" />
                                    <path d="M12 2a6 6 0 00-6 6v3.586L4.293 14.293A1 1 0 005 16h14a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6z" />
                                </svg>
                                <p className="text-sm text-gray-400">You&apos;re all caught up!</p>
                            </div>
                        )}

                        {items.map((it, idx) => {
                            const inviteId = it.inviteId;
                            const isProcessing = inviteId ? processing.has(inviteId) : false;
                            const result = inviteId ? results.get(inviteId) : undefined;
                            const isInvite = it.type === 'board-invite' && inviteId;

                            return (
                                <div key={it.id ?? idx} className="px-4 py-3.5 hover:bg-gray-50 transition-colors">
                                    {/* Icon + title row */}
                                    <div className="flex items-start gap-3">
                                        {/* Icon badge */}
                                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${it.type === 'mention' ? 'bg-indigo-100' :
                                            it.type === 'board-invite' ? 'bg-blue-100' :
                                                it.type === 'task-assigned' ? 'bg-emerald-100' : 'bg-gray-100'
                                            }`}>
                                            {it.type === 'mention' && (
                                                <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none">
                                                    <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                            {it.type === 'board-invite' && (
                                                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none">
                                                    <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                            {it.type === 'task-assigned' && (
                                                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none">
                                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                            {it.type !== 'mention' && it.type !== 'board-invite' && it.type !== 'task-assigned' && (
                                                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none">
                                                    <path d="M15 17H9a3 3 0 006 0z" fill="currentColor" opacity="0.9" />
                                                    <path d="M12 2a6 6 0 00-6 6v3.586L4.293 14.293A1 1 0 005 16h14a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6z" fill="currentColor" />
                                                </svg>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 leading-tight">
                                                {it.type === 'mention'
                                                    ? `${it.fromName ?? 'Someone'} mentioned you`
                                                    : it.type === 'board-invite'
                                                        ? `Board invitation`
                                                        : it.type === 'task-assigned'
                                                            ? `You've been assigned a task`
                                                            : it.type === 'added-to-board'
                                                                ? `Added to a board`
                                                                : 'Notification'}
                                            </p>
                                            {it.type === 'task-assigned' && (
                                                <>
                                                    {it.taskTitle && (
                                                        <p className="text-xs text-gray-700 font-medium mt-0.5 truncate">&ldquo;{it.taskTitle}&rdquo;</p>
                                                    )}
                                                    {it.boardTitle && (
                                                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                            {it.fromName ? `Assigned by ${it.fromName} in ` : 'In '}
                                                            <span className="font-medium text-gray-700">{it.boardTitle}</span>
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                            {it.type !== 'task-assigned' && it.boardTitle && (
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                    {it.type === 'board-invite'
                                                        ? `${it.inviterName ?? 'Someone'} invited you to `
                                                        : 'Board: '}
                                                    <span className="font-medium text-gray-700">{it.boardTitle}</span>
                                                </p>
                                            )}
                                            {it.role && it.type === 'board-invite' && (
                                                <span className="inline-block mt-1 text-[11px] font-medium bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                                                    {it.role}
                                                </span>
                                            )}
                                            {it.excerpt && (
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-2 italic">&ldquo;{it.excerpt}&rdquo;</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Result feedback */}
                                    {result && (
                                        <div className={`mt-3 flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2 ${result === 'accepted' ? 'bg-green-50 text-green-700 border border-green-200' :
                                            result === 'declined' ? 'bg-gray-50 text-gray-600 border border-gray-200' :
                                                'bg-red-50 text-red-600 border border-red-200'
                                            }`}>
                                            {result === 'accepted' && (
                                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                                                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                            {result === 'declined' && (
                                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                                                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                            )}
                                            {result === 'error' && <span>⚠️</span>}
                                            {result === 'accepted' ? 'Invite accepted! Redirecting…' :
                                                result === 'declined' ? 'Invite declined.' :
                                                    'Something went wrong. Try again.'}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    {!result && (
                                        <div className="mt-3 flex items-center gap-2">
                                            {isInvite && (
                                                <>
                                                    <button
                                                        onClick={() => handleAccept(inviteId)}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        {isProcessing ? <Spinner /> : (
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                                                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                        {isProcessing ? 'Accepting…' : 'Accept'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDecline(inviteId)}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        {isProcessing ? <Spinner /> : (
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                                                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                            </svg>
                                                        )}
                                                        {isProcessing ? 'Declining…' : 'Decline'}
                                                    </button>
                                                </>
                                            )}
                                            {!isInvite && (
                                                <button
                                                    onClick={() => setItems((s) => s.filter((_, i) => i !== idx))}
                                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-500 text-xs font-medium rounded-lg transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer — clear all */}
                    {items.length > 0 && (
                        <div className="border-t border-gray-100 px-4 py-2.5">
                            <button
                                onClick={() => setItems([])}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Clear all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
