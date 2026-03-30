'use client';

import { useMemo, useState, useTransition, useEffect, useRef } from 'react';
import { useOptimistic } from 'react';
import { BoardWithColumnsAndTasks } from '../../../types/board';
import { moveTask, purgeExpiredArchivedTasks, restoreTask, restoreArchivedTasks } from '../../../actions/taskActions';
import { archiveColumn, purgeExpiredArchivedColumns, restoreColumn } from '../../../actions/boardActions';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners } from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '../../../lib/pusher';
import { isArchiveExpired, isColumnArchived, parseColumnArchive } from '../../../lib/archiveMarkers';
import Tooltip from '../../ui/Tooltip';

import BoardColumn from './BoardColumn';
import MetricsModal from './MetricsModal';
import BoardAuditLogModal from './BoardAuditLogModal';
import CyclePlannerModal from './CyclePlannerModal';
import DailyTimesheetModal from './DailyTimesheetModal';
import FilterPanel, { DEFAULT_FILTERS, countActiveFilters, FilterState, TASK_CATEGORIES } from './FilterPanel';

const ARCHIVE_RETENTION_DAYS = 30;

// Small chip for active filter display
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium">
            {label}
            <button onClick={onRemove} className="ml-0.5 text-blue-400 hover:text-blue-700 transition-colors" aria-label="Remove filter">
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </span>
    );
}

interface KanbanBoardProps {
    initialBoard: BoardWithColumnsAndTasks;
    userRole?: string | null;
    currentUserEmail: string;
}
type TaskType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number];
type Cycle = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
};

export default function KanbanBoard({ initialBoard, userRole, currentUserEmail }: KanbanBoardProps) {
    const router = useRouter();
    const canManageArchive = userRole === 'LEADER' || userRole === 'REVIEWER';
    // Add a new "movedTask" property to the state, which we can use to render the dragging task in the overlay
    const [activeTask, setActiveTask] = useState<TaskType | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isMetricsOpen, setIsMetricsOpen] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isCycleOpen, setIsCycleOpen] = useState(false);
    const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isViewsOpen, setIsViewsOpen] = useState(false);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const savedViewsRef = useRef<HTMLDivElement>(null);
    const archivePanelRef = useRef<HTMLDivElement>(null);
    const [archiveSearch, setArchiveSearch] = useState('');
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
    const [savedViews, setSavedViews] = useState<Array<{ id: string; name: string; filters: FilterState }>>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(`ks-filter-views-${initialBoard.id}`);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as Array<{ id: string; name: string; filters: FilterState }>;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [cycles, setCycles] = useState<Cycle[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(`ks-cycles-${initialBoard.id}`);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as Cycle[];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [showCurrentCycleOnly, setShowCurrentCycleOnly] = useState(false);
    const [isRestoringTask, startRestoreTaskTransition] = useTransition();
    const [isPurgingExpiredArchived, startPurgeArchiveTransition] = useTransition();
    const [isManagingColumnsArchive, startColumnsArchiveTransition] = useTransition();
    // Stable "now" timestamp for age-filter comparisons (refreshed each time the filter panel opens)
    const [filterNow, setFilterNow] = useState(() => Date.now());

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (!toastMessage) return;
        const t = setTimeout(() => setToastMessage(null), 4000);
        return () => clearTimeout(t);
    }, [toastMessage]);

    // Optimistic Hook
    // It takes the real data from the server, and a "reducer" to calculate the fake instant UI updates when we drag tasks around. It returns the "fake" state to render, and a function to trigger fake updates.   
    const [optimisticColumns, addOptimisticUpdate] = useOptimistic(
        initialBoard.columns,
        (state, update: { taskId: string; newColumnId: string; newOrder: number }) => {
            // Find the source and destination columns
            const sourceColIndex = state.findIndex(col => col.tasks.some(t => t.id === update.taskId));
            const destColIndex = state.findIndex(col => col.id === update.newColumnId);

            if (sourceColIndex === -1 || destColIndex === -1) return state;

            // Find the actual task
            const taskToMove = state[sourceColIndex].tasks.find(t => t.id === update.taskId);
            if (!taskToMove) return state;

            // Create a NEW state array, but KEEP old references for untouched columns
            const newState = [...state];

            // If moving within the SAME column
            if (sourceColIndex === destColIndex) {
                const newTasks = [...newState[sourceColIndex].tasks];
                const [movedTask] = newTasks.splice(newTasks.findIndex(t => t.id === update.taskId), 1);

                // Update properties and insert
                newTasks.splice(update.newOrder, 0, { ...movedTask, order: update.newOrder });

                newState[sourceColIndex] = { ...newState[sourceColIndex], tasks: newTasks };
                return newState;
            }

            // If moving to a DIFFERENT column
            const newSourceTasks = newState[sourceColIndex].tasks.filter(t => t.id !== update.taskId);
            const newDestTasks = [...newState[destColIndex].tasks];

            const updatedTask = {
                ...taskToMove,
                columnId: update.newColumnId,
                order: update.newOrder
            };

            newDestTasks.splice(update.newOrder, 0, updatedTask);

            newState[sourceColIndex] = { ...newState[sourceColIndex], tasks: newSourceTasks };
            newState[destColIndex] = { ...newState[destColIndex], tasks: newDestTasks };

            return newState;
        }
    );

    // The value shown in the input box (updates instantly)
    const [inputValue, setInputValue] = useState('');

    // The value used to filter the board (updates in the background)
    const [searchQuery, setSearchQuery] = useState('');

    // The concurrent hook
    const [isPending, startTransition] = useTransition();
    const allBoardTasks = useMemo(() => optimisticColumns.flatMap((c) => c.tasks), [optimisticColumns]);
    const currentUserId = useMemo(
        () => initialBoard.members.find((m) => m.user.email === currentUserEmail)?.user.id,
        [initialBoard.members, currentUserEmail]
    );
    const activeCycleStats = useMemo(() => {
        const active = cycles.find((c) => c.isActive);
        if (!active) return null;

        const start = new Date(active.startDate).getTime();
        const end = new Date(active.endDate).getTime() + 86_400_000;
        const inCycle = allBoardTasks.filter((t) => {
            if (t.status === 'ARCHIVED') return false;
            const anchor = t.dueAt ? new Date(t.dueAt).getTime() : new Date(t.createdAt).getTime();
            return anchor >= start && anchor <= end;
        });

        return {
            total: inCycle.length,
            done: inCycle.filter((t) => t.status === 'DONE').length,
        };
    }, [cycles, allBoardTasks]);
    const archivedTasks = useMemo(
        () => allBoardTasks.filter((task) => task.status === 'ARCHIVED').sort((a, b) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
        [allBoardTasks]
    );
    const filteredArchivedTasks = useMemo(() => {
        const q = archiveSearch.trim().toLowerCase();
        if (!q) return archivedTasks;
        return archivedTasks.filter((task) => {
            return task.title.toLowerCase().includes(q) || task.category.toLowerCase().includes(q);
        });
    }, [archivedTasks, archiveSearch]);
    const expiredArchivedTasks = useMemo(() => {
        const cutoff = filterNow - ARCHIVE_RETENTION_DAYS * 86_400_000;
        return archivedTasks.filter((task) => new Date(task.updatedAt).getTime() < cutoff);
    }, [archivedTasks, filterNow]);
    const archivedColumns = useMemo(
        () => optimisticColumns.filter((column) => isColumnArchived(column.title)),
        [optimisticColumns]
    );
    const filteredArchivedColumns = useMemo(() => {
        const q = archiveSearch.trim().toLowerCase();
        if (!q) return archivedColumns;
        return archivedColumns.filter((column) => {
            const parsed = parseColumnArchive(column.title);
            const original = parsed.original.toLowerCase();
            return original.includes(q);
        });
    }, [archivedColumns, archiveSearch]);
    const expiredArchivedColumns = useMemo(
        () => archivedColumns.filter((column) => isArchiveExpired(parseColumnArchive(column.title).archivedAt, ARCHIVE_RETENTION_DAYS)),
        [archivedColumns]
    );

    // The Real-Time Subscription
    useEffect(() => {
        localStorage.setItem(`ks-filter-views-${initialBoard.id}`, JSON.stringify(savedViews));
    }, [initialBoard.id, savedViews]);

    useEffect(() => {
        localStorage.setItem(`ks-cycles-${initialBoard.id}`, JSON.stringify(cycles));
    }, [initialBoard.id, cycles]);

    useEffect(() => {
        const pusher = getPusherClient();
        const channelName = `board-${initialBoard.id}`;

        // Subscribe to the specific board
        const channel = pusher.subscribe(channelName);

        // Listen for the event we named in our server action
        channel.bind('board-updated', () => {
            // 3. When triggered, silently refetch the Server Component data
            router.refresh();
        });

        // Cleanup when the user leaves the page
        return () => {
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [initialBoard.id, router]);

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (savedViewsRef.current && !savedViewsRef.current.contains(target)) {
                setIsViewsOpen(false);
            }

            if (archivePanelRef.current && !archivePanelRef.current.contains(target)) {
                setIsArchiveOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        startTransition(() => {
            setSearchQuery(val);
        });
    };

    const clearSearch = () => {
        setInputValue('');
        startTransition(() => setSearchQuery(''));
    };

    const applyMyTasksPreset = () => {
        if (!currentUserId) return;
        setFilters({ ...DEFAULT_FILTERS, assignees: [currentUserId], sortBy: 'newest' });
        setFilterNow(Date.now());
    };

    const applyStaleTasksPreset = () => {
        setFilters({ ...DEFAULT_FILTERS, ageFilter: 'stale', commentFilter: 'without', sortBy: 'longest' });
        setFilterNow(Date.now());
    };

    const handleRestoreTask = (taskId: string) => {
        startRestoreTaskTransition(async () => {
            const result = await restoreTask(taskId, initialBoard.id);
            if (!result?.success) {
                setToastMessage(result?.error ?? 'Failed to restore task.');
            }
        });
    };

    const handleRestoreVisibleArchivedTasks = () => {
        if (filteredArchivedTasks.length === 0) return;
        startRestoreTaskTransition(async () => {
            const result = await restoreArchivedTasks(initialBoard.id, filteredArchivedTasks.map((task) => task.id));
            if (!result?.success) {
                setToastMessage(result?.error ?? 'Failed to restore archived tasks.');
            }
            if (result?.success && (result.restoredCount ?? 0) > 0) {
                const expiredCount = result.expiredCount ?? 0;
                setToastMessage(`Restored ${result.restoredCount} archived task${result.restoredCount === 1 ? '' : 's'}${expiredCount > 0 ? ` (${expiredCount} expired)` : ''}.`);
            }
        });
    };

    const handlePurgeExpiredArchivedTasks = () => {
        startPurgeArchiveTransition(async () => {
            const result = await purgeExpiredArchivedTasks(initialBoard.id);
            if (!result?.success) {
                setToastMessage(result?.error ?? 'Failed to purge expired archived tasks.');
                return;
            }
            setToastMessage(`Purged ${result.deletedCount ?? 0} expired archived task${(result.deletedCount ?? 0) === 1 ? '' : 's'}.`);
        });
    };

    const handleArchiveColumn = (columnId: string) => {
        startColumnsArchiveTransition(async () => {
            const result = await archiveColumn(initialBoard.id, columnId);
            if (!result?.success) {
                setToastMessage(result?.error ?? 'Failed to archive column.');
                return;
            }
            setToastMessage('Column archived. All tasks in this column were archived.');
        });
    };

    const handleRestoreColumn = (columnId: string) => {
        startColumnsArchiveTransition(async () => {
            const result = await restoreColumn(initialBoard.id, columnId);
            if (!result?.success) {
                setToastMessage(result?.error ?? 'Failed to restore column.');
                return;
            }
            setToastMessage('Column restored.');
        });
    };

    const handlePurgeExpiredArchivedColumns = () => {
        startColumnsArchiveTransition(async () => {
            const result = await purgeExpiredArchivedColumns(initialBoard.id);
            if (!result?.success) {
                setToastMessage(result?.error ?? 'Failed to purge archived columns.');
                return;
            }
            setToastMessage(`Purged ${result.deletedCount ?? 0} expired archived column${(result.deletedCount ?? 0) === 1 ? '' : 's'}.`);
        });
    };

    // Memoize the filter + sort so it doesn't recalculate during 60fps dragging
    const filteredColumns = useMemo(() => {
        const now = filterNow;
        const activeCycle = cycles.find((c) => c.isActive) ?? null;
        const hasSearch = searchQuery.trim().length > 0;
        const hasAssignee = filters.assignees.length > 0;
        const hasCat = filters.categories.length > 0;
        const hasPriority = filters.priorities.length > 0;
        const hasTagSearch = filters.tagSearch.trim().length > 0;
        const hasDateFrom = filters.dateFrom !== '';
        const hasDateTo = filters.dateTo !== '';
        const hasAge = filters.ageFilter !== 'all';
        const hasComment = filters.commentFilter !== 'all';
        const hasSort = filters.sortBy !== 'default';
        const hasCycleFilter = showCurrentCycleOnly && !!activeCycle;

        const cycleStart = activeCycle ? new Date(activeCycle.startDate).getTime() : 0;
        const cycleEnd = activeCycle ? new Date(activeCycle.endDate).getTime() + 86_400_000 : 0;

        return optimisticColumns
            .filter((column) => !isColumnArchived(column.title))
            .map(column => {
                let tasks = [...column.tasks].filter((task) => task.status !== 'ARCHIVED');

                // ── Search ─────────────────────────────────────────────
                if (hasSearch) {
                    const q = searchQuery.toLowerCase();
                    tasks = tasks.filter((t) => {
                        if (t.title.toLowerCase().includes(q)) return true;
                        if ((t.description ?? '').toLowerCase().includes(q)) return true;
                        return (t.comments ?? []).some((comment) => comment.text.toLowerCase().includes(q));
                    });
                }

                // ── Assignee ───────────────────────────────────────────
                if (hasAssignee) {
                    tasks = tasks.filter(t => {
                        if (filters.assignees.includes('unassigned') && t.assigneeId === null) return true;
                        if (t.assigneeId && filters.assignees.includes(t.assigneeId)) return true;
                        return false;
                    });
                }

                // ── Category ───────────────────────────────────────────
                if (hasCat) {
                    tasks = tasks.filter(t => filters.categories.includes(t.category));
                }
                // ── Priority ───────────────────────────────────────────────
                if (hasPriority) {
                    tasks = tasks.filter(t => filters.priorities.includes(t.priority));
                }

                // ── Tag search ──────────────────────────────────────────────
                if (hasTagSearch) {
                    const tq = filters.tagSearch.trim().toLowerCase();
                    tasks = tasks.filter(t => t.tags?.some(tag => tag.toLowerCase().includes(tq)));
                }
                // ── Created date range ─────────────────────────────────
                if (hasDateFrom) {
                    const from = new Date(filters.dateFrom).getTime();
                    tasks = tasks.filter(t => new Date(t.createdAt).getTime() >= from);
                }
                if (hasDateTo) {
                    const to = new Date(filters.dateTo).getTime() + 86_400_000; // inclusive
                    tasks = tasks.filter(t => new Date(t.createdAt).getTime() <= to);
                }

                // ── Task age (days since createdAt) ────────────────────
                if (hasAge) {
                    tasks = tasks.filter(t => {
                        const ageDays = (now - new Date(t.createdAt).getTime()) / 86_400_000;
                        if (filters.ageFilter === 'fresh') return ageDays < 3;
                        if (filters.ageFilter === 'aging') return ageDays >= 3 && ageDays <= 7;
                        if (filters.ageFilter === 'stale') return ageDays > 7;
                        return true;
                    });
                }

                // ── Comments ───────────────────────────────────────────
                if (hasComment) {
                    if (filters.commentFilter === 'with') tasks = tasks.filter(t => t.comments.length > 0);
                    if (filters.commentFilter === 'without') tasks = tasks.filter(t => t.comments.length === 0);
                }

                if (hasCycleFilter) {
                    tasks = tasks.filter((t) => {
                        const dueTs = t.dueAt ? new Date(t.dueAt).getTime() : null;
                        const createdTs = new Date(t.createdAt).getTime();
                        const anchor = dueTs ?? createdTs;
                        return anchor >= cycleStart && anchor <= cycleEnd;
                    });
                }

                // ── Sort ───────────────────────────────────────────────
                if (hasSort) {
                    tasks = [...tasks].sort((a, b) => {
                        switch (filters.sortBy) {
                            case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                            case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                            case 'longest': return new Date(a.startedAt ?? a.createdAt).getTime() - new Date(b.startedAt ?? b.createdAt).getTime();
                            case 'shortest': return new Date(b.startedAt ?? b.createdAt).getTime() - new Date(a.startedAt ?? a.createdAt).getTime();
                            case 'az': return a.title.localeCompare(b.title);
                            case 'za': return b.title.localeCompare(a.title);
                            default: return 0;
                        }
                    });
                }

                return { ...column, tasks };
            });
    }, [optimisticColumns, searchQuery, filters, filterNow, cycles, showCurrentCycleOnly]);

    useEffect(() => {
        const openFirstTaskDetails = () => {
            const firstTask = filteredColumns.find((c) => c.tasks.length > 0)?.tasks[0];
            if (!firstTask) return;

            window.dispatchEvent(new CustomEvent('ks-tour-open-task-details', {
                detail: { taskId: firstTask.id }
            }));
        };

        window.addEventListener('ks-tour-request-open-task-details', openFirstTaskDetails as EventListener);
        return () => {
            window.removeEventListener('ks-tour-request-open-task-details', openFirstTaskDetails as EventListener);
        };
    }, [filteredColumns]);

    // Handle Drag Start
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const taskId = active.id as string;

        // Find the task data so we can render it in the overlay
        for (const column of optimisticColumns) {
            const task = column.tasks.find(t => t.id === taskId);
            if (task) {
                setActiveTask(task);
                break;
            }
        }
    };

    // The Drag End Handler — smart filtered drag algorithm
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const taskId = active.id as string;
        const newColumnId = over.data.current?.sortable?.containerId || over.id as string;

        // VISUAL INDEX: where it looks like the user dropped it (could be a subset)
        const visualNewOrder = over.data.current?.sortable?.index ?? 0;

        // --- SMART ALGORITHM: translate visual index → real database index ---

        // 1. Get the destination column from the FILTERED view (what the user sees)
        const visualColumn = filteredColumns.find(c => c.id === newColumnId);

        // 2. Get the destination column from the REAL full list (the database truth)
        const realColumn = optimisticColumns.find(c => c.id === newColumnId);

        if (!visualColumn || !realColumn) return;

        let realNewOrder: number;

        // 3. Find the "neighbor" task we are dropping in front of
        const neighborTask = visualColumn.tasks[visualNewOrder];

        if (neighborTask) {
            // CASE A: Dropped in front of a specific visible task.
            // Find that neighbor's TRUE index in the real (unfiltered) list.
            const neighborRealIndex = realColumn.tasks.findIndex(t => t.id === neighborTask.id);
            realNewOrder = neighborRealIndex !== -1 ? neighborRealIndex : 0;
        } else {
            // CASE B: Dropped at the very bottom (no task at that visual index).
            // Append to the end of the real list.
            realNewOrder = realColumn.tasks.length;

            // Edge case: moving within the same column — we are removing ourselves first,
            // so the final length is one less.
            const sourceColId = optimisticColumns.find(c => c.tasks.some(t => t.id === taskId))?.id;
            if (sourceColId === newColumnId) {
                realNewOrder = Math.max(0, realColumn.tasks.length - 1);
            }
        }

        // --- END ALGORITHM ---

        // Instantly update the UI with the REAL calculated order
        startTransition(() => {
            addOptimisticUpdate({ taskId, newColumnId, newOrder: realNewOrder });
        });

        // Pass the REAL calculated order to the server
        const result = await moveTask(taskId, newColumnId, realNewOrder, initialBoard.id);

        // If the server rejected it (e.g., a MEMBER dragged to Done)
        if (!result?.success) {
            if ((result as { code?: string; canOverride?: boolean; blockers?: string[] }).code === 'BLOCKED_TASK') {
                const blockedResult = result as {
                    error?: string;
                    blockers?: string[];
                    canOverride?: boolean;
                };

                if (blockedResult.canOverride) {
                    const blockerSummary = (blockedResult.blockers ?? []).slice(0, 3).join(', ');
                    const reason = window.prompt(
                        `This task is blocked by dependencies${blockerSummary ? `: ${blockerSummary}` : ''}. Enter override reason to continue:`
                    );

                    if (reason && reason.trim()) {
                        const overrideResult = await moveTask(taskId, newColumnId, realNewOrder, initialBoard.id, {
                            overrideBlockedDependency: true,
                            overrideReason: reason.trim(),
                        });

                        if (!overrideResult?.success) {
                            setToastMessage(overrideResult?.error ?? 'Move not allowed.');
                            router.refresh();
                            return;
                        }

                        setToastMessage('Moved with dependency override.');
                        return;
                    }

                    setToastMessage('Move canceled. Task is still blocked by dependencies.');
                    router.refresh();
                    return;
                }
            }

            setToastMessage(result?.error ?? 'Move not allowed.');
            router.refresh();
        }
    };

    // Handle Drag Cancel (if user presses ESC)
    const handleDragCancel = () => {
        setActiveTask(null);
    };

    return (
        <div className="flex flex-col w-full h-full">
            {/* Toast notification */}
            {toastMessage && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl shadow-2xl">
                    <svg className="w-5 h-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span>{toastMessage}</span>
                    <button
                        onClick={() => setToastMessage(null)}
                        className="ml-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Dismiss"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}
            {/* Toolbar: search + filter + metrics */}
            <div className="mb-4 flex items-center gap-3 flex-wrap">
                <div className="relative w-80">
                    {/* Search Icon */}
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <input
                        type="text"
                        data-tour="board-search"
                        value={inputValue}
                        onChange={handleSearchChange}
                        placeholder="Search titles, descriptions, and comments..."
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl bg-white/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />

                    {/* Clear Button (Only shows if there is text) */}
                    {inputValue && (
                        <button
                            onClick={clearSearch}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}

                    {/* Loading Indicator */}
                    {isPending && (
                        <div className="absolute -right-24 top-2 text-sm text-gray-500 animate-pulse">
                            Searching...
                        </div>
                    )}
                </div>

                {/* Saved Views Button */}
                <div className="relative" ref={savedViewsRef}>
                    <Tooltip text="Open and apply your saved filter views" position="bottom">
                        <button
                            onClick={() => setIsViewsOpen((o) => !o)}
                            data-tour="board-saved-views-button"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 border border-slate-300 shadow-sm hover:bg-white hover:border-slate-400 transition-all text-sm font-medium text-gray-700 whitespace-nowrap"
                        >
                            Saved Views
                            {savedViews.length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">{savedViews.length}</span>
                            )}
                        </button>
                    </Tooltip>

                    {isViewsOpen && (
                        <div className="absolute top-full mt-2 left-0 z-40 w-64 app-bg rounded-xl border border-slate-200 shadow-xl p-2">
                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-700">Saved Views</p>
                                <button
                                    type="button"
                                    onClick={() => setIsViewsOpen(false)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 shadow-sm transition-colors"
                                    aria-label="Close saved views"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            {savedViews.length === 0 ? (
                                <div className="px-2 py-2 space-y-1">
                                    <p className="text-sm text-slate-500">No saved views yet.</p>
                                    <p className="text-xs text-slate-400">Open Filters, set your filters, enter a view name in Saved Views, then click Save.</p>
                                </div>
                            ) : (
                                savedViews.map((view) => (
                                    <div key={view.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/80">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilters({ ...view.filters });
                                                setFilterNow(Date.now());
                                                setIsViewsOpen(false);
                                            }}
                                            className="text-sm font-medium text-slate-700 truncate text-left"
                                        >
                                            {view.name}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSavedViews((prev) => prev.filter((v) => v.id !== view.id))}
                                            className="text-xs text-slate-400 hover:text-red-600"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))
                            )}
                            {savedViews.length > 0 && (
                                <p className="text-xs text-slate-400 px-2 pt-2 border-t border-slate-200 mt-2">Create new views from the Filters panel saved-views section.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Filter Button */}
                <div className="relative">
                    <Tooltip text="Filter tasks by assignee, category, priority, dates, and more" position="bottom">
                        <button
                            onClick={() => {
                                setFilterNow(Date.now()); // capture current time so age filters are accurate
                                setIsFilterOpen(o => !o);
                            }}
                            data-tour="board-filter-button"
                            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm transition-all text-sm font-medium whitespace-nowrap ${countActiveFilters(filters) > 0
                                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                : 'bg-white/90 text-gray-700 border-slate-300 hover:bg-white hover:border-slate-400'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                            </svg>
                            Filters
                            {countActiveFilters(filters) > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-blue-600 border border-blue-600 text-xs font-bold flex items-center justify-center leading-none">
                                    {countActiveFilters(filters)}
                                </span>
                            )}
                        </button>
                    </Tooltip>

                    <FilterPanel
                        isOpen={isFilterOpen}
                        onClose={() => setIsFilterOpen(false)}
                        filters={filters}
                        onChange={setFilters}
                        members={initialBoard.members}
                        savedViews={savedViews}
                        onSaveView={(name, currentFilters) => {
                            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                            setSavedViews((prev) => [{ id, name, filters: { ...currentFilters } }, ...prev].slice(0, 12));
                        }}
                        onApplyView={(viewId) => {
                            const view = savedViews.find((v) => v.id === viewId);
                            if (!view) return;
                            setFilters({ ...view.filters });
                            setFilterNow(Date.now());
                        }}
                        onDeleteView={(viewId) => {
                            setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
                        }}
                    />
                </div>

                {/* Board Metrics Button */}
                <Tooltip text="Open board analytics and team performance insights" position="bottom">
                    <button
                        onClick={() => setIsMetricsOpen(true)}
                        data-tour="board-metrics-button"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 border border-slate-300 shadow-sm hover:bg-white hover:border-slate-400 transition-all text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Board Metrics
                    </button>
                </Tooltip>

                <Tooltip text="See a timeline of important board and task changes" position="bottom">
                    <button
                        onClick={() => setIsAuditOpen(true)}
                        data-tour="board-audit-button"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 border border-slate-300 shadow-sm hover:bg-white hover:border-slate-400 transition-all text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Audit Log
                    </button>
                </Tooltip>

                <Tooltip text="Plan and track sprint cycles for this board" position="bottom">
                    <button
                        onClick={() => setIsCycleOpen(true)}
                        data-tour="board-cycles-button"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 border border-slate-300 shadow-sm hover:bg-white hover:border-slate-400 transition-all text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                        Cycles
                    </button>
                </Tooltip>

                <Tooltip text="Open daily team time logs and export summaries" position="bottom">
                    <button
                        onClick={() => setIsTimesheetOpen(true)}
                        data-tour="board-timesheet-button"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 border border-slate-300 shadow-sm hover:bg-white hover:border-slate-400 transition-all text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                        Timesheet
                    </button>
                </Tooltip>

                {canManageArchive && (
                    <div className="relative" ref={archivePanelRef}>
                        <Tooltip text="Open archived tasks and archived columns hub" position="bottom">
                            <button
                                onClick={() => {
                                    setFilterNow(Date.now());
                                    setArchiveSearch('');
                                    setIsArchiveOpen((o) => !o);
                                }}
                                data-tour="board-archive-button"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50/90 border border-rose-200 shadow-sm hover:bg-rose-100 hover:border-rose-300 transition-all text-sm font-semibold text-rose-700 whitespace-nowrap"
                            >
                                Archived
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white border border-rose-200 text-rose-600">{archivedTasks.length + archivedColumns.length}</span>
                            </button>
                        </Tooltip>

                        {isArchiveOpen && (
                            <div className="absolute top-full mt-2 left-0 z-40 w-84 app-bg rounded-xl border border-slate-200 shadow-xl p-2">
                                <div className="px-2 pb-2 mb-2 border-b border-slate-200 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-700">Archive</p>
                                    <button
                                        type="button"
                                        onClick={() => setIsArchiveOpen(false)}
                                        className="w-7 h-7 flex items-center justify-center rounded-full text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 shadow-sm transition-colors"
                                        aria-label="Close archive panel"
                                    >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="px-2 pb-2 border-b border-slate-200 mb-2 space-y-2">
                                    <p className="text-xs text-slate-500">
                                        Unified archive hub for tasks and columns. Restore window: {ARCHIVE_RETENTION_DAYS} days.
                                    </p>
                                    <input
                                        type="text"
                                        value={archiveSearch}
                                        onChange={(e) => setArchiveSearch(e.target.value)}
                                        placeholder="Search archived tasks and columns..."
                                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                                    />
                                </div>

                                <div className="px-2 pb-2 border-b border-slate-200 mb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Archived Tasks</p>
                                        <span className="text-xs text-slate-400">{filteredArchivedTasks.length}</span>
                                    </div>
                                    <div className="space-y-2 mb-2">
                                        <button
                                            type="button"
                                            onClick={handleRestoreVisibleArchivedTasks}
                                            disabled={isRestoringTask || filteredArchivedTasks.length === 0}
                                            className="w-full text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                                        >
                                            Restore visible tasks ({filteredArchivedTasks.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePurgeExpiredArchivedTasks}
                                            disabled={isPurgingExpiredArchived || expiredArchivedTasks.length === 0}
                                            className="w-full text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1.5 rounded-md hover:bg-rose-100 disabled:opacity-50"
                                        >
                                            {isPurgingExpiredArchived ? 'Purging tasks...' : `Purge expired tasks (${expiredArchivedTasks.length})`}
                                        </button>
                                    </div>

                                    {filteredArchivedTasks.length === 0 ? (
                                        <p className="text-sm text-slate-400">No archived tasks found.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                            {filteredArchivedTasks.map((task) => (
                                                <div key={task.id} className="flex items-start justify-between gap-2 px-2 py-2 rounded-lg hover:bg-white/80">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-700 truncate">{task.title}</p>
                                                        <p className="text-xs text-slate-400">{task.category.replace(/_/g, ' ')}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRestoreTask(task.id)}
                                                        disabled={isRestoringTask}
                                                        className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                                                    >
                                                        Restore
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="px-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Archived Columns</p>
                                        <span className="text-xs text-slate-400">{filteredArchivedColumns.length}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handlePurgeExpiredArchivedColumns}
                                        disabled={isManagingColumnsArchive || expiredArchivedColumns.length === 0}
                                        className="w-full mb-2 text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1.5 rounded-md hover:bg-rose-100 disabled:opacity-50"
                                    >
                                        {isManagingColumnsArchive ? 'Purging columns...' : `Purge expired columns (${expiredArchivedColumns.length})`}
                                    </button>

                                    {filteredArchivedColumns.length === 0 ? (
                                        <p className="text-sm text-slate-400">No archived columns found.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                            {filteredArchivedColumns.map((column) => {
                                                const parsed = parseColumnArchive(column.title);
                                                const expired = isArchiveExpired(parsed.archivedAt, ARCHIVE_RETENTION_DAYS);
                                                return (
                                                    <div key={column.id} className="flex items-start justify-between gap-2 px-2 py-2 rounded-lg hover:bg-white/80">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-slate-700 truncate">{parsed.original || 'Untitled column'}</p>
                                                            <p className="text-xs text-slate-400">{column.tasks.length} task{column.tasks.length === 1 ? '' : 's'}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRestoreColumn(column.id)}
                                                            disabled={isManagingColumnsArchive || expired}
                                                            className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                                                        >
                                                            {expired ? 'Expired' : 'Restore'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {cycles.some((c) => c.isActive) && (
                    <button
                        onClick={() => setShowCurrentCycleOnly((v) => !v)}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all text-sm font-semibold border ${showCurrentCycleOnly
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                    >
                        Current Cycle
                    </button>
                )}

                {currentUserId && (
                    <button
                        onClick={applyMyTasksPreset}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 hover:bg-cyan-100 transition-all text-sm font-semibold"
                    >
                        My Tasks
                    </button>
                )}

                <button
                    onClick={applyStaleTasksPreset}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all text-sm font-semibold"
                >
                    Stale Tasks
                </button>
            </div>

            {/* Active filter chips */}
            {countActiveFilters(filters) > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Active:</span>

                    {filters.sortBy !== 'default' && (
                        <Chip label={`Sort: ${{ default: 'Default', newest: 'Newest', oldest: 'Oldest', longest: 'Longest', shortest: 'Shortest', az: 'A→Z', za: 'Z→A' }[filters.sortBy]}`}
                            onRemove={() => setFilters(f => ({ ...f, sortBy: 'default' }))} />
                    )}

                    {filters.assignees.map(id => {
                        const member = initialBoard.members.find(m => m.user.id === id);
                        const label = id === 'unassigned' ? 'Unassigned' : (member?.user.name ?? member?.user.email ?? id);
                        return <Chip key={id} label={`Assignee: ${label}`} onRemove={() => setFilters(f => ({ ...f, assignees: f.assignees.filter(a => a !== id) }))} />;
                    })}

                    {filters.categories.map(cat => {
                        const meta = TASK_CATEGORIES.find(c => c.value === cat);
                        return <Chip key={cat} label={`Category: ${meta?.label ?? cat}`} onRemove={() => setFilters(f => ({ ...f, categories: f.categories.filter(c => c !== cat) }))} />;
                    })}

                    {filters.priorities.map(p => (
                        <Chip key={p} label={`Priority: ${p[0] + p.slice(1).toLowerCase()}`} onRemove={() => setFilters(f => ({ ...f, priorities: f.priorities.filter(x => x !== p) }))} />
                    ))}

                    {filters.tagSearch.trim() && (
                        <Chip label={`Tag: ${filters.tagSearch.trim()}`} onRemove={() => setFilters(f => ({ ...f, tagSearch: '' }))} />
                    )}

                    {(filters.dateFrom || filters.dateTo) && (
                        <Chip label={`Date: ${filters.dateFrom || '…'} → ${filters.dateTo || '…'}`}
                            onRemove={() => setFilters(f => ({ ...f, dateFrom: '', dateTo: '' }))} />
                    )}

                    {filters.ageFilter !== 'all' && (
                        <Chip label={`Age: ${{ fresh: 'Fresh', aging: 'Aging', stale: 'Stale' }[filters.ageFilter]}`}
                            onRemove={() => setFilters(f => ({ ...f, ageFilter: 'all' }))} />
                    )}

                    {filters.commentFilter !== 'all' && (
                        <Chip label={`Comments: ${{ with: 'Has comments', without: 'No comments' }[filters.commentFilter]}`}
                            onRemove={() => setFilters(f => ({ ...f, commentFilter: 'all' }))} />
                    )}

                    <button
                        onClick={() => setFilters(DEFAULT_FILTERS)}
                        className="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium ml-1"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Metrics Modal */}
            <MetricsModal board={initialBoard} isOpen={isMetricsOpen} onClose={() => setIsMetricsOpen(false)} />
            <BoardAuditLogModal board={initialBoard} isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />
            <DailyTimesheetModal
                isOpen={isTimesheetOpen}
                onClose={() => setIsTimesheetOpen(false)}
                tasks={allBoardTasks}
            />
            <CyclePlannerModal
                isOpen={isCycleOpen}
                onClose={() => setIsCycleOpen(false)}
                cycles={cycles}
                activeCycleStats={activeCycleStats ?? undefined}
                onCreateCycle={(cycle) => {
                    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    setCycles((prev) => [{ id, ...cycle, isActive: prev.length === 0 }, ...prev]);
                }}
                onDeleteCycle={(cycleId) => {
                    setCycles((prev) => prev.filter((c) => c.id !== cycleId));
                }}
                onSetActiveCycle={(cycleId) => {
                    setCycles((prev) => prev.map((c) => ({ ...c, isActive: c.id === cycleId })));
                }}
            />

            <DndContext
                id="kanban-board"
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div
                    style={{ gridTemplateColumns: `repeat(${Math.min(filteredColumns.length, 5)}, minmax(260px, 1fr))` }}
                    className="grid gap-5 pb-6 items-start"
                >
                    {filteredColumns.map((column) => (
                        <BoardColumn
                            key={column.id}
                            column={column}
                            boardId={initialBoard.id}
                            userRole={userRole}
                            members={initialBoard.members}
                            templates={initialBoard.taskTemplates}
                            allTasks={allBoardTasks}
                            currentUserEmail={currentUserEmail}
                            onArchiveColumn={handleArchiveColumn}
                        />
                    ))}
                </div>

                {/* The Overlay */}
                <DragOverlay>
                    {activeTask ? (
                        // We render a clone of the task here. 
                        // We wrap it in a div that mimics the SortableTask styling 
                        // but without the sorting hooks attached.
                        <div className="bg-white p-4 rounded-lg shadow-2xl border-2 border-blue-500 cursor-grabbing rotate-2 scale-105 transition-transform">
                            <h3 className="text-sm font-medium text-gray-900">{activeTask.title}</h3>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}