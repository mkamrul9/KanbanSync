'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../../ui/Modal';
import { BoardWithColumnsAndTasks } from '../../../types/board';

type AuditEvent = {
    id: string;
    kind: 'activity' | 'comment';
    createdAt: Date;
    actorName: string;
    actorEmail: string;
    taskId: string;
    taskTitle: string;
    message: string;
};

interface BoardAuditLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    board: BoardWithColumnsAndTasks;
}

export default function BoardAuditLogModal({ isOpen, onClose, board }: BoardAuditLogModalProps) {
    const [query, setQuery] = useState('');
    const [actorFilter, setActorFilter] = useState<'all' | 'me' | 'system'>('all');

    const events = useMemo(() => {
        const rows: AuditEvent[] = [];

        for (const column of board.columns) {
            for (const task of column.tasks) {
                for (const activity of task.activities ?? []) {
                    rows.push({
                        id: `activity-${activity.id}`,
                        kind: 'activity',
                        createdAt: new Date(activity.createdAt),
                        actorName: activity.actor?.name ?? activity.actor?.email ?? 'System',
                        actorEmail: activity.actor?.email ?? '',
                        taskId: task.id,
                        taskTitle: task.title,
                        message: activity.message,
                    });
                }

                for (const comment of task.comments ?? []) {
                    rows.push({
                        id: `comment-${comment.id}`,
                        kind: 'comment',
                        createdAt: new Date(comment.createdAt),
                        actorName: comment.user?.name ?? comment.user?.email ?? 'Member',
                        actorEmail: comment.user?.email ?? '',
                        taskId: task.id,
                        taskTitle: task.title,
                        message: comment.text,
                    });
                }
            }
        }

        rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return rows;
    }, [board.columns]);

    const filteredEvents = useMemo(() => {
        const q = query.trim().toLowerCase();
        return events.filter((event) => {
            if (actorFilter === 'system' && event.actorName !== 'System') return false;
            if (actorFilter === 'me' && event.actorName === 'System') return false;

            if (!q) return true;
            return (
                event.taskTitle.toLowerCase().includes(q) ||
                event.actorName.toLowerCase().includes(q) ||
                event.actorEmail.toLowerCase().includes(q) ||
                event.message.toLowerCase().includes(q)
            );
        });
    }, [events, query, actorFilter]);

    const handleExportCsv = () => {
        const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
        const header = ['type', 'actor', 'task', 'message', 'createdAt'];
        const rows = filteredEvents.map((event) => [
            event.kind,
            event.actorName,
            event.taskTitle,
            event.message,
            event.createdAt.toISOString(),
        ]);
        const csv = [header, ...rows]
            .map((r) => r.map((cell) => escapeCell(String(cell))).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `board-audit-${board.id.slice(-6)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
            <div className="flex flex-col max-h-[85vh] app-bg">
                <div className="px-6 pr-16 py-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Board Audit Log</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Track comments and task activity across this board.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                                {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
                            </span>
                            <button
                                type="button"
                                onClick={handleExportCsv}
                                className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search task, actor, or message"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                        />
                        <select
                            value={actorFilter}
                            onChange={(e) => setActorFilter(e.target.value as 'all' | 'me' | 'system')}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                        >
                            <option value="all">All actors</option>
                            <option value="me">Members only</option>
                            <option value="system">System only</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-y-auto px-6 py-4 space-y-3">
                    {filteredEvents.length === 0 ? (
                        <div className="app-surface border border-slate-200 rounded-2xl p-8 text-center">
                            <p className="text-sm font-semibold text-slate-700">No matching events</p>
                            <p className="text-xs text-slate-400 mt-1">Try a different search or filter.</p>
                        </div>
                    ) : (
                        filteredEvents.map((event) => (
                            <div key={event.id} className="app-surface border border-slate-200 rounded-2xl px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex items-start gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                            {(event.actorName[0] ?? 'A').toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${event.kind === 'activity'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                    {event.kind === 'activity' ? 'Activity' : 'Comment'}
                                                </span>
                                                <span className="text-xs text-slate-500">{event.actorName}</span>
                                            </div>
                                            <p className="text-sm text-slate-800 mt-1 leading-relaxed wrap-break-word">{event.message}</p>
                                            <p className="text-[11px] text-slate-500 mt-1 truncate">Task: {event.taskTitle}</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-slate-400 shrink-0">{formatDistanceToNow(event.createdAt)} ago</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
}
