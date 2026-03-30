'use client';

import { useMemo, useState } from 'react';
import Modal from '../../ui/Modal';
import { BoardWithColumnsAndTasks } from '../../../types/board';

type TaskType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number];

interface DailyTimesheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: TaskType[];
}

type TimeRow = {
    id: string;
    minutes: number;
    note: string | null;
    createdAt: string;
    taskTitle: string;
    memberName: string;
};

function toDateKeyLocal(date: Date) {
    const yyyy = date.getFullYear();
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function DailyTimesheetModal({ isOpen, onClose, tasks }: DailyTimesheetModalProps) {
    const [selectedDate, setSelectedDate] = useState(() => toDateKeyLocal(new Date()));

    const rows = useMemo(() => {
        const all = tasks.flatMap((task) =>
            (task.timeEntries ?? []).map((entry) => ({
                id: entry.id,
                minutes: entry.minutes,
                note: entry.note,
                createdAt: entry.createdAt.toISOString(),
                taskTitle: task.title,
                memberName: entry.user?.name ?? entry.user?.email ?? 'Member',
            }))
        );

        if (!selectedDate) return [] as TimeRow[];

        return all
            .filter((row) => toDateKeyLocal(new Date(row.createdAt)) === selectedDate)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [tasks, selectedDate]);

    const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0);

    const byMember = useMemo(() => {
        const map = new Map<string, number>();
        rows.forEach((row) => map.set(row.memberName, (map.get(row.memberName) ?? 0) + row.minutes));
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [rows]);

    const byTask = useMemo(() => {
        const map = new Map<string, number>();
        rows.forEach((row) => map.set(row.taskTitle, (map.get(row.taskTitle) ?? 0) + row.minutes));
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [rows]);

    const handleExportCsv = () => {
        if (rows.length === 0) return;

        const header = ['Date', 'Time', 'Member', 'Task', 'Minutes', 'Note'];
        const records = rows.map((row) => {
            const created = new Date(row.createdAt);
            return [
                selectedDate,
                created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                row.memberName,
                row.taskTitle,
                String(row.minutes),
                row.note ?? '',
            ];
        });

        const csv = [header, ...records]
            .map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet-${selectedDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl">
            <div className="app-bg">
                <div className="ui-modal-header">
                    <h3 className="text-xl font-semibold text-gray-900 tracking-tight">Daily Timesheet</h3>
                    <p className="text-sm text-gray-600 mt-1">Review logged time by member and task for the selected day.</p>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 app-surface rounded-2xl border border-slate-200/70 p-4">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="ui-field mt-1"
                        />

                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <p className="text-[11px] uppercase tracking-wide font-semibold text-emerald-700">Total Logged</p>
                            <p className="text-2xl font-bold text-emerald-800 mt-1">{Math.round((totalMinutes / 60) * 10) / 10}h</p>
                            <p className="text-xs text-emerald-700 mt-1">{totalMinutes} minutes</p>
                        </div>

                        <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                            <p className="text-[11px] uppercase tracking-wide font-semibold text-cyan-700 mb-2">By Member</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {byMember.length === 0 && <p className="text-xs text-cyan-700">No entries.</p>}
                                {byMember.map(([member, minutes]) => (
                                    <div key={member} className="flex items-center justify-between text-xs text-cyan-900">
                                        <span className="truncate pr-2">{member}</span>
                                        <span className="font-semibold">{minutes}m</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                            <p className="text-[11px] uppercase tracking-wide font-semibold text-violet-700 mb-2">Top Tasks</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {byTask.length === 0 && <p className="text-xs text-violet-700">No entries.</p>}
                                {byTask.map(([task, minutes]) => (
                                    <div key={task} className="flex items-center justify-between gap-2 text-xs text-violet-900">
                                        <span className="truncate">{task}</span>
                                        <span className="font-semibold">{minutes}m</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 app-surface rounded-2xl border border-slate-200/70 p-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Entries</p>
                            <button
                                type="button"
                                onClick={handleExportCsv}
                                disabled={rows.length === 0}
                                className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 disabled:opacity-40"
                            >
                                Export CSV
                            </button>
                        </div>
                        <div className="space-y-2 max-h-104 overflow-y-auto pr-1">
                            {rows.length === 0 && (
                                <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
                                    No time entries for this date.
                                </div>
                            )}
                            {rows.map((row) => (
                                <div key={row.id} className="bg-white border border-slate-200 rounded-xl p-3">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{row.taskTitle}</p>
                                        <span className="text-xs font-semibold text-slate-700">{row.minutes}m</span>
                                    </div>
                                    <p className="text-xs text-slate-500">{row.memberName} • {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    {row.note && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{row.note}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
