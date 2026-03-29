'use client';

import { useRef, useEffect, ReactNode } from 'react';

// ─── Category meta ─────────────────────────────────────────────────────────────
export const TASK_CATEGORIES = [
    { value: 'BUG', label: 'Bug', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'NEW_FEATURE', label: 'Feature', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'EPIC', label: 'Epic', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'STORY', label: 'Story', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'TASK', label: 'Task', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'SUB_TASK', label: 'Sub-Task', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'ENHANCEMENT', label: 'Enhancement', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    { value: 'PATCH', label: 'Patch', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'HOTFIX', label: 'Hotfix', color: 'bg-rose-100 text-rose-700 border-rose-200' },
] as const;

// ─── Priority meta ─────────────────────────────────────────────────────────────
export const PRIORITY_OPTIONS = [
    { value: 'URGENT', label: 'Urgent', icon: 'M5 11l7-7 7 7M5 19l7-7 7 7', color: 'bg-red-50 text-red-700 border-red-300', active: 'bg-red-600 text-white border-red-600' },
    { value: 'HIGH', label: 'High', icon: 'M5 15l7-7 7 7', color: 'bg-orange-50 text-orange-700 border-orange-300', active: 'bg-orange-500 text-white border-orange-500' },
    { value: 'MEDIUM', label: 'Medium', icon: 'M20 12H4', color: 'bg-sky-50 text-sky-700 border-sky-300', active: 'bg-sky-500 text-white border-sky-500' },
    { value: 'LOW', label: 'Low', icon: 'M19 9l-7 7-7-7', color: 'bg-green-50 text-green-700 border-green-300', active: 'bg-green-500 text-white border-green-500' },
] as const;

// ─── Filter types ───────────────────────────────────────────────────────────────
export type SortOption = 'default' | 'newest' | 'oldest' | 'az' | 'za' | 'longest' | 'shortest';
export type AgeOption = 'all' | 'fresh' | 'aging' | 'stale';
export type CommentOption = 'all' | 'with' | 'without';

export interface FilterState {
    assignees: string[];       // user IDs; 'unassigned' is the magic value for no assignee
    categories: string[];      // TaskCategory values
    priorities: string[];      // Priority enum values: URGENT / HIGH / MEDIUM / LOW
    tagSearch: string;         // substring match against task tags
    dateFrom: string;          // '' or 'YYYY-MM-DD'
    dateTo: string;            // '' or 'YYYY-MM-DD'
    ageFilter: AgeOption;
    commentFilter: CommentOption;
    sortBy: SortOption;
}

export const DEFAULT_FILTERS: FilterState = {
    assignees: [],
    categories: [],
    priorities: [],
    tagSearch: '',
    dateFrom: '',
    dateTo: '',
    ageFilter: 'all',
    commentFilter: 'all',
    sortBy: 'default',
};

export function countActiveFilters(f: FilterState): number {
    let n = 0;
    if (f.assignees.length) n++;
    if (f.categories.length) n++;
    if (f.priorities.length) n++;
    if (f.tagSearch.trim()) n++;
    if (f.dateFrom || f.dateTo) n++;
    if (f.ageFilter !== 'all') n++;
    if (f.commentFilter !== 'all') n++;
    if (f.sortBy !== 'default') n++;
    return n;
}

// ─── Member shape we need ───────────────────────────────────────────────────────
export interface FilterMember {
    user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
    };
}

// ─── Props ──────────────────────────────────────────────────────────────────────
interface FilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    filters: FilterState;
    onChange: (f: FilterState) => void;
    members: FilterMember[];
}

// ─── Tiny helpers ───────────────────────────────────────────────────────────────
function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            {children}
        </p>
    );
}

function Divider() {
    return <hr className="border-gray-100 my-4" />;
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function FilterPanel({ isOpen, onClose, filters, onChange, members }: FilterPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        function handler(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        function handler(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const set = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial });

    // ── Sort options ─────────────────────────────────────────────────────────────
    const sortOptions: { value: SortOption; label: string; icon: ReactNode }[] = [
        {
            value: 'default', label: 'Default order',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L4 7m3-3l3 3M17 8v12m0 0l3-3m-3 3l-3-3" /></svg>
        },
        {
            value: 'newest', label: 'Newest first',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        {
            value: 'oldest', label: 'Oldest first',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        {
            value: 'longest', label: 'Longest running',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 4h14M5 20h14M7 4v3l5 5 5-5V4M7 20v-3l5-5 5 5v3" /></svg>
        },
        {
            value: 'shortest', label: 'Shortest running',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        },
        {
            value: 'az', label: 'Title A → Z',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m10-5v13m0 0l-3-3m3 3l3-3" /></svg>
        },
        {
            value: 'za', label: 'Title Z → A',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m10 4V5m0 0l-3 3m3-3l3 3" /></svg>
        },
    ];

    // ── Age options ──────────────────────────────────────────────────────────────
    const ageOptions: { value: AgeOption; label: string; desc: string; dot: string }[] = [
        { value: 'all', label: 'Any age', desc: '', dot: 'bg-gray-300' },
        { value: 'fresh', label: 'Fresh', desc: '< 3 days', dot: 'bg-green-400' },
        { value: 'aging', label: 'Aging', desc: '3 – 7 days', dot: 'bg-amber-400' },
        { value: 'stale', label: 'Stale', desc: '> 7 days', dot: 'bg-rose-400' },
    ];

    // ── Comment options ──────────────────────────────────────────────────────────
    const commentOptions: { value: CommentOption; label: string; icon: ReactNode }[] = [
        {
            value: 'all', label: 'Any',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        },
        {
            value: 'with', label: 'Has comments',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        },
        {
            value: 'without', label: 'No comments',
            icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        },
    ];

    return (
        <div
            ref={panelRef}
            className="absolute top-full right-0 mt-2 z-40 w-84 app-bg rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden"
            style={{ maxHeight: '80vh' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 bg-white/85 backdrop-blur-sm">
                <span className="font-semibold text-slate-800 text-sm">Filters & Sort</span>
                <div className="flex items-center gap-2">
                    {countActiveFilters(filters) > 0 && (
                        <button
                            onClick={() => onChange({ ...DEFAULT_FILTERS })}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all"
                        aria-label="Close"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto p-4 flex-1">

                {/* ── Sort By ── */}
                <SectionLabel>Sort By</SectionLabel>
                <div className="grid grid-cols-2 gap-1.5">
                    {sortOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => set({ sortBy: opt.value })}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all text-left ${filters.sortBy === opt.value
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white/90 text-gray-600 border-slate-200 hover:border-slate-300 hover:bg-white'
                                }`}
                        >
                            {opt.icon}
                            {opt.label}
                        </button>
                    ))}
                </div>

                <Divider />

                {/* ── Assignee ── */}
                <SectionLabel>Assignee</SectionLabel>
                <div className="space-y-1">
                    {/* Unassigned */}
                    <button
                        onClick={() => set({ assignees: toggle(filters.assignees, 'unassigned') })}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${filters.assignees.includes('unassigned')
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white/90 border-slate-200 text-gray-600 hover:bg-white'
                            }`}
                    >
                        <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs shrink-0">?</span>
                        <span>Unassigned</span>
                        {filters.assignees.includes('unassigned') && (
                            <svg className="w-3.5 h-3.5 ml-auto shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>

                    {/* Board members */}
                    {members.map(m => (
                        <button
                            key={m.user.id}
                            onClick={() => set({ assignees: toggle(filters.assignees, m.user.id) })}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${filters.assignees.includes(m.user.id)
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white/90 border-slate-200 text-gray-600 hover:bg-white'
                                }`}
                        >
                            {m.user.image
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={m.user.image} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                                : (
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                        {(m.user.name ?? m.user.email ?? '?')[0].toUpperCase()}
                                    </span>
                                )
                            }
                            <span className="truncate">{m.user.name ?? m.user.email ?? 'Unknown'}</span>
                            {filters.assignees.includes(m.user.id) && (
                                <svg className="w-3.5 h-3.5 ml-auto shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>

                <Divider />

                {/* ── Category ── */}
                <SectionLabel>Category</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                    {TASK_CATEGORIES.map(cat => (
                        <button
                            key={cat.value}
                            onClick={() => set({ categories: toggle(filters.categories, cat.value) })}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${filters.categories.includes(cat.value)
                                ? `${cat.color} border-current ring-2 ring-offset-1 ring-blue-400`
                                : `${cat.color} opacity-60 hover:opacity-100`
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <Divider />

                {/* ── Priority ── */}
                <SectionLabel>Priority</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                    {PRIORITY_OPTIONS.map(p => {
                        const isActive = filters.priorities.includes(p.value);
                        return (
                            <button
                                key={p.value}
                                onClick={() => set({ priorities: toggle(filters.priorities, p.value) })}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${isActive ? p.active : `${p.color} opacity-70 hover:opacity-100`
                                    }`}
                            >
                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={p.icon} />
                                </svg>
                                {p.label}
                            </button>
                        );
                    })}
                </div>

                <Divider />

                {/* ── Tags ── */}
                <SectionLabel>Tag</SectionLabel>
                <div className="relative">
                    <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    <input
                        type="text"
                        value={filters.tagSearch}
                        onChange={e => set({ tagSearch: e.target.value })}
                        placeholder="Filter by tag…"
                        className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                    {filters.tagSearch && (
                        <button
                            onClick={() => set({ tagSearch: '' })}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label="Clear tag filter"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>

                <Divider />

                {/* ── Created Date Range ── */}
                <SectionLabel>Created Date</SectionLabel>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-7 shrink-0">From</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            max={filters.dateTo || undefined}
                            onChange={e => set({ dateFrom: e.target.value })}
                            className="flex-1 text-xs border border-slate-200 rounded-xl px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                        {filters.dateFrom && (
                            <button onClick={() => set({ dateFrom: '' })} className="text-gray-400 hover:text-gray-600" aria-label="Clear">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-7 shrink-0">To</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            min={filters.dateFrom || undefined}
                            onChange={e => set({ dateTo: e.target.value })}
                            className="flex-1 text-xs border border-slate-200 rounded-xl px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                        {filters.dateTo && (
                            <button onClick={() => set({ dateTo: '' })} className="text-gray-400 hover:text-gray-600" aria-label="Clear">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                    </div>
                </div>

                <Divider />

                {/* ── Task Age ── */}
                <SectionLabel>Task Age</SectionLabel>
                <div className="grid grid-cols-2 gap-1.5">
                    {ageOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => set({ ageFilter: opt.value })}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${filters.ageFilter === opt.value
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
                            <span className="flex flex-col leading-tight">
                                <span>{opt.label}</span>
                                {opt.desc && <span className={`text-[10px] ${filters.ageFilter === opt.value ? 'text-blue-200' : 'text-gray-400'}`}>{opt.desc}</span>}
                            </span>
                        </button>
                    ))}
                </div>

                <Divider />

                {/* ── Comments ── */}
                <SectionLabel>Comments</SectionLabel>
                <div className="flex gap-1.5">
                    {commentOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => set({ commentFilter: opt.value })}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${filters.commentFilter === opt.value
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {opt.icon}
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
}
