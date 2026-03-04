'use client';

import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { BoardWithColumnsAndTasks } from '../../../types/board';
import computeBoardMetrics from '../../../lib/metrics';

interface Props {
    board: BoardWithColumnsAndTasks;
    isOpen: boolean;
    onClose: () => void;
}

// ──────────────────────────────────────────────────────
// Small reusable helpers
// ──────────────────────────────────────────────────────
function KpiCard({
    label,
    value,
    sub,
    def,
    icon,
    color,
}: {
    label: string;
    value: string;
    sub: string;
    def: string;
    icon: React.ReactNode;
    color: string;
}) {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-5 ${color} flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest opacity-70">{label}</span>
                <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl">{icon}</span>
            </div>
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            <div className="text-xs opacity-70 font-medium">{sub}</div>
            <div className="text-[11px] opacity-50 leading-relaxed mt-1 border-t border-white/20 pt-2">{def}</div>
            {/* decorative circle */}
            <div className="pointer-events-none absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
        </div>
    );
}

// ──────────────────────────────────────────────────────
// CFD Area Chart (SVG)
// ──────────────────────────────────────────────────────
function CfdChart({ cfd }: { cfd: ReturnType<typeof computeBoardMetrics>['cfd'] }) {
    const W = 600; const H = 200; const PAD = { top: 16, right: 16, bottom: 40, left: 40 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const { dates, series } = cfd;
    const n = dates.length;
    if (n === 0) return <div className="text-sm text-gray-400 py-8 text-center">No data yet</div>;

    const totals = dates.map((_, i) => series.backlog[i] + series.inProgress[i] + series.done[i]);
    const maxTotal = Math.max(...totals, 1);

    const x = (i: number) => PAD.left + (i / Math.max(1, n - 1)) * chartW;
    const y = (v: number) => PAD.top + chartH - (v / maxTotal) * chartH;

    const polyline = (vals: number[]) => vals.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');

    // Stack: done bottom, inProgress on top, backlog on top
    const doneVals = series.done;
    const inProgVals = series.done.map((v, i) => v + series.inProgress[i]);
    const backlogVals = totals;

    const area = (topVals: number[], bottomVals: number[]) => {
        const top = topVals.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' L ');
        const bot = [...bottomVals].reverse().map((v, i) => {
            const idx = bottomVals.length - 1 - i;
            return `${x(idx).toFixed(2)},${y(v).toFixed(2)}`;
        }).join(' L ');
        return `M ${top} L ${bot} Z`;
    };

    // X-axis labels: show every ~2–3 days
    const step = Math.max(1, Math.floor(n / 6));
    const xLabelIdxs = dates.reduce<number[]>((acc, _, i) => {
        if (i % step === 0 || i === n - 1) acc.push(i);
        return acc;
    }, []);

    // Y-axis grid lines
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxTotal));

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
            {/* Grid lines */}
            {yTicks.map((tick) => (
                <g key={tick}>
                    <line
                        x1={PAD.left} y1={y(tick)}
                        x2={PAD.left + chartW} y2={y(tick)}
                        stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4 3"
                    />
                    <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{tick}</text>
                </g>
            ))}

            {/* Stacked areas */}
            <path d={area(backlogVals, inProgVals)} fill="#f3f4f6" />
            <path d={area(inProgVals, doneVals)} fill="#dbeafe" />
            <path d={area(doneVals, doneVals.map(() => 0))} fill="#d1fae5" />

            {/* Area borders */}
            <polyline points={polyline(backlogVals)} fill="none" stroke="#d1d5db" strokeWidth={1.5} />
            <polyline points={polyline(inProgVals)} fill="none" stroke="#93c5fd" strokeWidth={1.5} />
            <polyline points={polyline(doneVals)} fill="none" stroke="#6ee7b7" strokeWidth={1.5} />

            {/* X axis */}
            <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH} stroke="#e5e7eb" strokeWidth={1} />
            {xLabelIdxs.map((i) => (
                <text key={i} x={x(i)} y={PAD.top + chartH + 14} textAnchor="middle" fontSize={10} fill="#9ca3af">
                    {dates[i].slice(5)}
                </text>
            ))}
        </svg>
    );
}

// ──────────────────────────────────────────────────────
// Horizontal bar for WIP per column
// ──────────────────────────────────────────────────────
function WipBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
    const pct = max === 0 ? 0 : Math.round((count / max) * 100);
    return (
        <div className="flex items-center gap-3">
            <div className="w-28 text-xs text-gray-500 truncate text-right" title={label}>{label}</div>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="w-5 text-xs font-semibold text-gray-700 text-right">{count}</div>
        </div>
    );
}

const WIP_COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

// ──────────────────────────────────────────────────────
// Work Item Age horizontal bar chart
// ──────────────────────────────────────────────────────
function AgeBar({ title, ageDays, max }: { title: string; ageDays: number; max: number }) {
    const pct = max === 0 ? 0 : Math.min(100, Math.round((ageDays / max) * 100));
    const color = ageDays > 7 ? 'bg-rose-400' : ageDays > 3 ? 'bg-amber-400' : 'bg-emerald-400';
    return (
        <div className="flex items-center gap-3">
            <div className="w-36 text-xs text-gray-600 truncate" title={title}>{title}</div>
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <div className={`w-14 text-right text-xs font-semibold ${ageDays > 7 ? 'text-rose-600' : ageDays > 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {ageDays.toFixed(1)}d
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────
// Main Modal
// ──────────────────────────────────────────────────────
export default function MetricsModal({ board, isOpen, onClose }: Props) {
    const metrics = useMemo(() => computeBoardMetrics(board), [board]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const wipEntries = Object.entries(metrics.wip.perColumn);
    const maxWip = Math.max(...wipEntries.map(([, v]) => v), 1);
    const maxAge = Math.max(...metrics.workItemAges.map(t => t.ageDays), 1);

    const modal = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Board Metrics"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl flex flex-col">

                {/* ── Header ── */}
                <div className="sticky top-0 z-10 rounded-t-3xl bg-linear-to-r from-slate-900 to-slate-800 px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl">📊</div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Board Metrics</h2>
                            <p className="text-xs text-slate-400">{board.title} · Flow &amp; efficiency overview</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white text-lg leading-none"
                        aria-label="Close metrics"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="p-8 flex flex-col gap-8">

                    {/* KPI Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard
                            label="Lead Time"
                            value={`${metrics.leadTime.avgDays.toFixed(1)}d`}
                            sub={`median ${metrics.leadTime.medianDays.toFixed(1)}d · ${metrics.leadTime.samples} completed`}
                            def="Request → Done. Total elapsed time from creation to completion."
                            icon="⏱"
                            color="bg-linear-to-br from-violet-600 to-violet-500 text-white"
                        />
                        <KpiCard
                            label="Cycle Time"
                            value={`${metrics.cycleTime.avgDays.toFixed(1)}d`}
                            sub={`median ${metrics.cycleTime.medianDays.toFixed(1)}d · ${metrics.cycleTime.samples} completed`}
                            def="Start → Done. Time from when active work began to completion."
                            icon="🔄"
                            color="bg-linear-to-br from-blue-600 to-blue-500 text-white"
                        />
                        <KpiCard
                            label="Work In Progress"
                            value={String(metrics.wip.total)}
                            sub={`across ${wipEntries.length} columns`}
                            def="Tasks currently in-flight. Lower WIP = less context-switching."
                            icon="📋"
                            color="bg-linear-to-br from-amber-500 to-orange-500 text-white"
                        />
                        <KpiCard
                            label="Throughput"
                            value={String(metrics.throughput.count)}
                            sub={`tasks in last ${metrics.throughput.periodDays} days`}
                            def="Completed items per period — a direct measure of team velocity."
                            icon="🚀"
                            color="bg-linear-to-br from-emerald-600 to-emerald-500 text-white"
                        />
                    </div>

                    {/* WIP per column + Work Item Ages */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* WIP per column */}
                        <div className="rounded-2xl border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <span className="text-base font-bold text-gray-800">WIP by Column</span>
                                <span className="ml-auto text-xs text-gray-400">total {metrics.wip.total}</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {wipEntries.map(([col, count], i) => (
                                    <WipBar key={col} label={col} count={count} max={maxWip} color={WIP_COLORS[i % WIP_COLORS.length]} />
                                ))}
                                {wipEntries.length === 0 && <div className="text-sm text-gray-400">No columns</div>}
                            </div>
                        </div>

                        {/* Work Item Age */}
                        <div className="rounded-2xl border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <span className="text-base font-bold text-gray-800">Work Item Age</span>
                                <span className="ml-auto text-xs text-gray-400">active tasks</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {metrics.workItemAges.slice(0, 8).map(t => (
                                    <AgeBar key={t.id} title={t.title} ageDays={t.ageDays} max={maxAge} />
                                ))}
                                {metrics.workItemAges.length === 0 && (
                                    <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
                                        <span className="text-3xl">✅</span>
                                        <span className="text-sm">No active tasks — all done!</span>
                                    </div>
                                )}
                            </div>
                            {/* Legend */}
                            <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> ≤ 3d</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 3–7d</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-400 inline-block" /> &gt; 7d</span>
                            </div>
                        </div>
                    </div>

                    {/* CFD Chart */}
                    <div className="rounded-2xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <span className="text-base font-bold text-gray-800">Cumulative Flow Diagram</span>
                                <p className="text-xs text-gray-400 mt-0.5">Approx. based on current column state · last 14 days</p>
                            </div>
                            {/* Legend */}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-200 inline-block border border-emerald-300" /> Done</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-200 inline-block border border-blue-300" /> In Progress</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block border border-gray-300" /> Backlog</span>
                            </div>
                        </div>
                        <CfdChart cfd={metrics.cfd} />
                    </div>

                    {/* Footer note */}
                    <p className="text-center text-xs text-gray-300">
                        Metrics computed client-side from current board state · timestamps improve after migration
                    </p>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
