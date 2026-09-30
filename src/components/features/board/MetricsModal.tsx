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
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
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
    if (n === 0) return <div className="text-sm text-[--ks-text-muted] py-8 text-center">No data yet</div>;

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
                        stroke="var(--ks-border)" strokeWidth={1} strokeDasharray="4 3"
                    />
                    <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" fontSize={10} fill="var(--ks-text-muted)">{tick}</text>
                </g>
            ))}

            {/* Stacked areas */}
            <path d={area(backlogVals, inProgVals)} fill="var(--ks-bg-overlay)" />
            <path d={area(inProgVals, doneVals)} fill="rgba(99, 102, 241, 0.2)" />
            <path d={area(doneVals, doneVals.map(() => 0))} fill="rgba(16, 185, 129, 0.2)" />

            {/* Area borders */}
            <polyline points={polyline(backlogVals)} fill="none" stroke="var(--ks-border)" strokeWidth={1.5} />
            <polyline points={polyline(inProgVals)} fill="none" stroke="var(--ks-primary)" strokeWidth={1.5} />
            <polyline points={polyline(doneVals)} fill="none" stroke="var(--ks-success)" strokeWidth={1.5} />

            {/* X axis */}
            <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH} stroke="var(--ks-border)" strokeWidth={1} />
            {xLabelIdxs.map((i) => (
                <text key={i} x={x(i)} y={PAD.top + chartH + 14} textAnchor="middle" fontSize={10} fill="var(--ks-text-muted)">
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
            <div className="w-28 text-xs text-[--ks-text-muted] truncate text-right" title={label}>{label}</div>
            <div className="flex-1 h-3 bg-[--ks-bg-card] border border-[--ks-border] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="w-5 text-xs font-semibold text-[--ks-text-primary] text-right">{count}</div>
        </div>
    );
}

const WIP_COLORS = ['bg-[--ks-primary]', 'bg-[--ks-accent]', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

// ──────────────────────────────────────────────────────
// Work Item Age horizontal bar chart
// ──────────────────────────────────────────────────────
function AgeBar({ title, ageDays, max }: { title: string; ageDays: number; max: number }) {
    const pct = max === 0 ? 0 : Math.min(100, Math.round((ageDays / max) * 100));
    const color = ageDays > 7 ? 'bg-rose-400' : ageDays > 3 ? 'bg-amber-400' : 'bg-emerald-400';
    return (
        <div className="flex items-center gap-3">
            <div className="w-36 text-xs text-[--ks-text-secondary] truncate" title={title}>{title}</div>
            <div className="flex-1 h-2.5 bg-[--ks-bg-card] border border-[--ks-border] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <div className={`w-14 text-right text-xs font-semibold ${ageDays > 7 ? 'text-rose-500' : ageDays > 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {ageDays.toFixed(1)}d
            </div>
        </div>
    );
}

function ThroughputTrendBars({ points }: { points: Array<{ date: string; completed: number }> }) {
    const max = Math.max(...points.map((p) => p.completed), 1);
    return (
        <div className="flex items-end gap-1 h-28">
            {points.map((p) => {
                const height = Math.max(8, Math.round((p.completed / max) * 100));
                return (
                    <div key={p.date} className="flex-1 flex flex-col items-center gap-1" title={`${p.date}: ${p.completed} completed`}>
                        <div className="w-full max-w-4 rounded-md bg-[--ks-primary]" style={{ height: `${height}%` }} />
                        <span className="text-[11px] text-[--ks-text-muted]">{p.date.slice(8)}</span>
                    </div>
                );
            })}
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
    const overdueEntries = Object.entries(metrics.overdueByColumn);
    const maxOverdue = Math.max(...overdueEntries.map(([, v]) => v), 1);

    const modal = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Board Metrics"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/50 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[--ks-bg-elevated] border border-[--ks-border] shadow-2xl flex flex-col">

                {/* ── Header ── */}
                <div className="sticky top-0 z-10 rounded-t-2xl bg-[--ks-bg-elevated]/90 backdrop-blur-sm border-b border-[--ks-border] px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[--ks-primary-subtle] border border-[--ks-primary]/25 flex items-center justify-center text-2xl">📊</div>
                        <div>
                            <h2 className="text-xl font-semibold text-[--ks-text-primary] tracking-tight">Board Metrics</h2>
                            <p className="text-xs text-[--ks-text-muted]">{board.title} · Flow &amp; efficiency overview</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-[--ks-bg-overlay] hover:bg-red-500/20 border border-[--ks-border] transition-colors flex items-center justify-center text-[--ks-text-muted] hover:text-red-400 text-[17px] leading-none"
                        aria-label="Close metrics"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="p-8 flex flex-col gap-8 bg-[--ks-bg-base]">

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
                        <div className="rounded-2xl app-surface border border-[--ks-border] p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-5">
                                <span className="text-[15px] font-semibold text-[--ks-text-primary]">WIP by Column</span>
                                <span className="ml-auto text-xs text-[--ks-text-muted]">total {metrics.wip.total}</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {wipEntries.map(([col, count], i) => (
                                    <WipBar key={col} label={col} count={count} max={maxWip} color={WIP_COLORS[i % WIP_COLORS.length]} />
                                ))}
                                {wipEntries.length === 0 && <div className="text-sm text-[--ks-text-muted]">No columns</div>}
                            </div>
                        </div>

                        {/* Work Item Age */}
                        <div className="rounded-2xl app-surface border border-[--ks-border] p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-5">
                                <span className="text-[15px] font-semibold text-[--ks-text-primary]">Work Item Age</span>
                                <span className="ml-auto text-xs text-[--ks-text-muted]">active tasks</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {metrics.workItemAges.slice(0, 8).map(t => (
                                    <AgeBar key={t.id} title={t.title} ageDays={t.ageDays} max={maxAge} />
                                ))}
                                {metrics.workItemAges.length === 0 && (
                                    <div className="flex flex-col items-center gap-2 py-6 text-[--ks-text-muted]">
                                        <span className="text-2xl">✅</span>
                                        <span className="text-sm">No active tasks — all done!</span>
                                    </div>
                                )}
                            </div>
                            {/* Legend */}
                            <div className="mt-4 flex items-center gap-4 text-xs text-[--ks-text-muted]">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> ≤ 3d</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 3–7d</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-400 inline-block" /> &gt; 7d</span>
                            </div>
                        </div>
                    </div>

                    {/* CFD Chart */}
                    <div className="rounded-2xl app-surface border border-[--ks-border] p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <span className="text-[15px] font-semibold text-[--ks-text-primary]">Cumulative Flow Diagram</span>
                                <p className="text-xs text-[--ks-text-muted] mt-0.5">Approx. based on current column state · last 14 days</p>
                            </div>
                            {/* Legend */}
                            <div className="flex items-center gap-4 text-xs text-[--ks-text-muted]">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/40 inline-block border border-emerald-500/60" /> Done</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[--ks-primary]/40 inline-block border border-[--ks-primary]/60" /> In Progress</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[--ks-bg-overlay] inline-block border border-[--ks-border]" /> Backlog</span>
                            </div>
                        </div>
                        <CfdChart cfd={metrics.cfd} />
                    </div>

                    {/* Advanced reporting */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-2xl app-surface border border-[--ks-border] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[15px] font-semibold text-[--ks-text-primary]">Overdue Heatmap</span>
                                <span className="text-xs text-[--ks-text-muted]">by column</span>
                            </div>
                            <div className="space-y-3">
                                {overdueEntries.map(([column, count]) => {
                                    const pct = maxOverdue === 0 ? 0 : Math.round((count / maxOverdue) * 100);
                                    return (
                                        <div key={column} className="flex items-center gap-3">
                                            <div className="w-28 text-xs text-[--ks-text-secondary] truncate" title={column}>{column}</div>
                                            <div className="flex-1 h-3 rounded-full bg-[--ks-bg-overlay] overflow-hidden">
                                                <div className="h-full bg-rose-400" style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="w-5 text-xs font-semibold text-rose-500 text-right">{count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-2xl app-surface border border-[--ks-border] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[15px] font-semibold text-[--ks-text-primary]">Team Workload</span>
                                <span className="text-xs text-[--ks-text-muted]">active tasks</span>
                            </div>
                            <div className="space-y-2">
                                {metrics.workloadByMember.map((member) => (
                                    <div key={member.userId} className="flex items-center justify-between gap-3 rounded-lg border border-[--ks-border] bg-[--ks-bg-card] px-3 py-2">
                                        <span className="text-sm text-[--ks-text-primary] truncate">{member.name}</span>
                                        <span className="text-sm font-semibold text-[--ks-primary]">{member.activeTasks}</span>
                                    </div>
                                ))}
                                {metrics.workloadByMember.length === 0 && <p className="text-sm text-[--ks-text-muted]">No members found.</p>}
                            </div>
                        </div>

                        <div className="rounded-2xl app-surface border border-[--ks-border] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[15px] font-semibold text-[--ks-text-primary]">Throughput Trend</span>
                                <span className="text-xs text-[--ks-text-muted]">last 14 days</span>
                            </div>
                            <ThroughputTrendBars points={metrics.throughputTrend} />
                        </div>

                        <div className="rounded-2xl app-surface border border-[--ks-border] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[15px] font-semibold text-[--ks-text-primary]">SLA Breaches</span>
                                <span className="text-xs text-[--ks-text-muted]">cycle time &gt; 7d</span>
                            </div>
                            <div className="space-y-2 max-h-28 overflow-auto pr-1">
                                {metrics.slaBreaches.slice(0, 8).map((task) => (
                                    <div key={task.id} className="flex items-center justify-between gap-2 text-sm rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5">
                                        <span className="text-rose-400 truncate">{task.title}</span>
                                        <span className="font-semibold text-rose-400">{task.cycleDays.toFixed(1)}d</span>
                                    </div>
                                ))}
                                {metrics.slaBreaches.length === 0 && <p className="text-sm text-[--ks-text-muted]">No SLA breaches detected.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Footer note */}
                    <p className="text-center text-xs text-[--ks-text-muted]">
                        Metrics computed client-side from current board state · timestamps improve after migration
                    </p>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
