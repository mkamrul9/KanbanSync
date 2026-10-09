'use client';

import { useState } from 'react';
import Modal from '../../ui/Modal';

type Cycle = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
};

interface CyclePlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    cycles: Cycle[];
    onCreateCycle: (cycle: Omit<Cycle, 'id' | 'isActive'>) => void;
    onDeleteCycle: (cycleId: string) => void;
    onSetActiveCycle: (cycleId: string) => void;
    activeCycleStats?: {
        total: number;
        done: number;
    };
}

export default function CyclePlannerModal({
    isOpen,
    onClose,
    cycles,
    onCreateCycle,
    onDeleteCycle,
    onSetActiveCycle,
    activeCycleStats,
}: CyclePlannerModalProps) {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleCreate = () => {
        if (!name.trim() || !startDate || !endDate) return;
        if (new Date(endDate).getTime() < new Date(startDate).getTime()) return;

        onCreateCycle({
            name: name.trim(),
            startDate,
            endDate,
        });

        setName('');
        setStartDate('');
        setEndDate('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
            <div className="app-bg max-h-[85vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-[--ks-border] bg-[--ks-bg-elevated]/90">
                    <h2 className="text-lg font-bold text-[--ks-text-primary]">Sprint / Cycle Planner</h2>
                    <p className="text-sm text-[--ks-text-muted] mt-1">Create cycles and mark one as active for board focus.</p>
                    <div className="mt-2 p-3 rounded-xl border border-sky-500/20 bg-sky-500/10">
                        <p className="text-sm font-semibold text-sky-400">How cycles work</p>
                        <p className="text-sm text-sky-300/80 mt-1">1) Create a cycle with start/end dates. 2) Set one as Active. 3) Enable Current Cycle on board toolbar to focus tasks in that date window.</p>
                    </div>
                </div>

                {activeCycleStats && (
                    <div className="px-6 pt-4">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-emerald-400">Active cycle progress</p>
                            <p className="text-sm text-emerald-400/80 font-semibold">{activeCycleStats.done}/{activeCycleStats.total} done</p>
                        </div>
                    </div>
                )}

                <div className="p-6 border-b border-[--ks-border] bg-[--ks-bg-overlay]">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Cycle name"
                            className="md:col-span-2 px-3 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] outline-none"
                        />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl text-sm text-[--ks-text-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] outline-none"
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl text-sm text-[--ks-text-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] outline-none"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={!name.trim() || !startDate || !endDate}
                        className="mt-3 ui-btn-primary disabled:opacity-40"
                    >
                        Create Cycle
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-2">
                    {cycles.length === 0 ? (
                        <p className="text-sm text-[--ks-text-muted]">No cycles created yet.</p>
                    ) : (
                        cycles.map((cycle) => (
                            <div key={cycle.id} className="app-surface border border-[--ks-border] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-[--ks-text-primary] truncate">{cycle.name}</p>
                                        {cycle.isActive && (
                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold">Active</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[--ks-text-muted] mt-0.5">{cycle.startDate} to {cycle.endDate}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onSetActiveCycle(cycle.id)}
                                        className="px-2.5 py-1.5 text-sm rounded-lg bg-[--ks-bg-card] border border-[--ks-border] text-[--ks-text-secondary] hover:bg-[--ks-bg-overlay] hover:text-[--ks-text-primary]"
                                    >
                                        {cycle.isActive ? 'Active' : 'Set Active'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDeleteCycle(cycle.id)}
                                        className="px-2.5 py-1.5 text-sm rounded-lg bg-[--ks-bg-card] border border-[--ks-border] text-[--ks-text-muted] hover:text-red-500 hover:border-red-500/30"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
}
