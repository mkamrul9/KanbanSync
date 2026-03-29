'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '../../lib/pusher';
import {
    acceptInvite,
    declineInvite,
    getRecentNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '../../actions/notificationActions';

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
    read?: boolean;
    createdAt?: string;
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
    const router = useRouter();
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [open, setOpen] = useState(false);
    const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'invites' | 'tasks'>('all');
    // Track which inviteId is currently mid-request
    const [processing, setProcessing] = useState<Set<string>>(new Set());
    // Track the outcome to show a brief confirmation before removing
    const [results, setResults] = useState<Map<string, InviteResult>>(new Map());
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
    const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const unreadCount = items.filter((item) => !item.read).length;

    const notifKey = (item: NotificationItem, idx: number) => item.id ?? `${item.type}-${item.inviteId ?? idx}-${item.createdAt ?? ''}`;

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
        try {
            const raw = localStorage.getItem(`ks-notification-snooze-${userId}`);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Record<string, number>;
            setSnoozedUntil(parsed ?? {});
        } catch {
            setSnoozedUntil({});
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        localStorage.setItem(`ks-notification-snooze-${userId}`, JSON.stringify(snoozedUntil));
    }, [userId, snoozedUntil]);

    useEffect(() => {
        if (!userId) return;
        getRecentNotifications(userId)
            .then((rows) => {
                if (!Array.isArray(rows)) return;
                setItems(rows as NotificationItem[]);
            })
            .catch(() => {
                // Non-blocking: realtime notifications still work.
            });

        const pusher = getPusherClient();
        const channel = pusher.subscribe(`user-${userId}`);
        const handleNotification = (data: NotificationItem) => {
            setItems((s) => [{ ...data, read: false }, ...s].slice(0, 20));
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

    const handleMarkRead = async (item: NotificationItem, idx: number) => {
        if (item.read) return;

        setItems((s) => s.map((n, i) => {
            if (item.id) return n.id === item.id ? { ...n, read: true } : n;
            return i === idx ? { ...n, read: true } : n;
        }));

        if (!item.id) return;
        try {
            await markNotificationRead(item.id);
        } catch {
            // Keep optimistic UI even if this fails.
        }
    };

    const handleMarkAllRead = async () => {
        if (unreadCount === 0 || isMarkingAllRead) return;
        setIsMarkingAllRead(true);
        setItems((s) => s.map((n) => ({ ...n, read: true })));

        try {
            await markAllNotificationsRead(userId);
        } catch {
            // Keep optimistic UI even if this fails.
        } finally {
            setIsMarkingAllRead(false);
        }
    };

    const handleSnooze = (item: NotificationItem, idx: number, minutes = 120) => {
        const key = notifKey(item, idx);
        setSnoozedUntil((prev) => ({ ...prev, [key]: Date.now() + minutes * 60 * 1000 }));
    };

    const visibleItems = items.filter((item, idx) => {
        const key = notifKey(item, idx);
        const snoozed = snoozedUntil[key];
        if (snoozed && snoozed > Date.now()) return false;

        if (filterMode === 'unread') return !item.read;
        if (filterMode === 'invites') return item.type === 'board-invite';
        if (filterMode === 'tasks') return item.type === 'task-assigned' || item.type === 'task-reminder' || item.type === 'task-overdue';
        return true;
    });

    const handleClearVisible = () => {
        const visibleKeys = new Set(visibleItems.map((item, idx) => notifKey(item, idx)));
        setItems((prev) => prev.filter((item, idx) => !visibleKeys.has(notifKey(item, idx))));
    };

    const getNotificationHref = (item: NotificationItem) => {
        if (item.boardId) return `/board/${item.boardId}`;
        return null;
    };

    const handleOpenNotification = async (item: NotificationItem, idx: number) => {
        await handleMarkRead(item, idx);
        const href = getNotificationHref(item);
        if (!href) return;
        setOpen(false);
        router.push(href);
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
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-84 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">Notifications</span>
                        {items.length > 0 && (
                            <span className="text-xs text-gray-400">{unreadCount} unread</span>
                        )}
                    </div>

                    <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto">
                        {([
                            { key: 'all', label: 'All' },
                            { key: 'unread', label: 'Unread' },
                            { key: 'invites', label: 'Invites' },
                            { key: 'tasks', label: 'Tasks' },
                        ] as const).map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setFilterMode(f.key)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border whitespace-nowrap ${filterMode === f.key
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="max-h-90 overflow-y-auto divide-y divide-gray-50">
                        {visibleItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
                                <svg className="w-8 h-8 text-gray-200" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15 17H9a3 3 0 006 0z" opacity="0.9" />
                                    <path d="M12 2a6 6 0 00-6 6v3.586L4.293 14.293A1 1 0 005 16h14a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6z" />
                                </svg>
                                <p className="text-sm text-gray-400">You&apos;re all caught up!</p>
                            </div>
                        )}

                        {visibleItems.map((it, idx) => {
                            const inviteId = it.inviteId;
                            const isProcessing = inviteId ? processing.has(inviteId) : false;
                            const result = inviteId ? results.get(inviteId) : undefined;
                            const isInvite = it.type === 'board-invite' && inviteId;
                            const href = getNotificationHref(it);

                            return (
                                <div key={it.id ?? idx} className={`px-4 py-3.5 transition-colors ${it.read ? 'opacity-70 hover:bg-gray-50' : 'hover:bg-blue-50/40'}`}>
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
                                            {it.type === 'task-reminder' && (
                                                <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none">
                                                    <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                                </svg>
                                            )}
                                            {it.type === 'task-overdue' && (
                                                <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none">
                                                    <path d="M12 9v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                            {it.type !== 'mention' && it.type !== 'board-invite' && it.type !== 'task-assigned' && it.type !== 'task-reminder' && it.type !== 'task-overdue' && (
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
                                                            : it.type === 'task-reminder'
                                                                ? `Task reminder`
                                                                : it.type === 'task-overdue'
                                                                    ? `Task overdue`
                                                                    : it.type === 'added-to-board'
                                                                        ? `Added to a board`
                                                                        : 'Notification'}
                                            </p>
                                            {(it.type === 'task-reminder' || it.type === 'task-overdue') && it.taskTitle && (
                                                <p className="text-xs text-gray-700 font-medium mt-0.5 truncate">&ldquo;{it.taskTitle}&rdquo;</p>
                                            )}
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
                                            {it.read && (
                                                <p className="text-[11px] text-gray-400 mt-1">Read</p>
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
                                            {!isInvite && !it.read && (
                                                <button
                                                    onClick={() => handleMarkRead(it, idx)}
                                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-500 text-xs font-medium rounded-lg transition-colors"
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                            {!isInvite && (
                                                <button
                                                    onClick={() => handleSnooze(it, idx)}
                                                    className="flex items-center gap-1 px-3 py-1.5 border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-medium rounded-lg transition-colors"
                                                >
                                                    Snooze 2h
                                                </button>
                                            )}
                                            {!isInvite && href && (
                                                <button
                                                    onClick={() => handleOpenNotification(it, idx)}
                                                    className="flex items-center gap-1 px-3 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                                                >
                                                    Open
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer — mark all read */}
                    {items.length > 0 && (
                        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between gap-2">
                            <button
                                onClick={handleMarkAllRead}
                                disabled={unreadCount === 0 || isMarkingAllRead}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {isMarkingAllRead ? 'Marking all read...' : 'Mark all as read'}
                            </button>
                            <button
                                onClick={handleClearVisible}
                                disabled={visibleItems.length === 0}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Clear visible
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
