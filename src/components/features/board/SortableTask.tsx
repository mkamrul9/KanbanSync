'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useEffect, useState, useTransition } from 'react';
import type { TaskCategory } from '../../../generated/prisma/browser';
import { deleteTask } from '@/src/actions/taskActions';
// EditTaskModal replaced by TaskDetailsModal for unified edit flow
import TaskDetailsModal from './TaskDetailsModal';
import Modal from '../../ui/Modal';
import { BoardWithColumnsAndTasks } from '../../../types/board';
import { BoardRole } from '../../../generated/prisma/enums';

type TaskType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number];
type MemberType = BoardWithColumnsAndTasks['members'][number];

// Priority icon — clearly distinct colors per level
// URGENT=red  HIGH=orange  MEDIUM=sky-blue  LOW=green  NONE=nothing
function PriorityIcon({ priority, className = '' }: { priority: string; className?: string }) {
    const base = `w-3.5 h-3.5 shrink-0 ${className}`;
    if (priority === 'URGENT') return (
        <svg className={`${base} text-red-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Urgent priority">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
        </svg>
    );
    if (priority === 'HIGH') return (
        <svg className={`${base} text-orange-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="High priority">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
    );
    if (priority === 'MEDIUM') return (
        <svg className={`${base} text-sky-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Medium priority">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
        </svg>
    );
    if (priority === 'LOW') return (
        <svg className={`${base} text-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Low priority">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
    );
    return null; // NONE — show nothing
}

// Left accent border color by priority
const getPriorityAccent = (priority: string) => {
    switch (priority) {
        case 'URGENT': return 'border-l-red-600';
        case 'HIGH': return 'border-l-orange-500';
        case 'MEDIUM': return 'border-l-sky-500';
        case 'LOW': return 'border-l-green-500';
        default: return 'border-l-gray-200';
    }
};

// Helper function to color-code categories
const getCategoryColor = (category: TaskCategory) => {
    switch (category) {
        case 'NEW_FEATURE': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'EPIC': return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'STORY': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'TASK': return 'bg-gray-100 text-gray-600 border-gray-200';
        case 'SUB_TASK': return 'bg-slate-50 text-slate-600 border-slate-200';
        case 'BUG': return 'bg-red-50 text-red-700 border-red-200';
        case 'ENHANCEMENT': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'PATCH': return 'bg-orange-50 text-orange-700 border-orange-200';
        case 'HOTFIX': return 'bg-rose-50 text-rose-700 border-rose-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
};

// Assignee avatar with tooltip
function AssigneeAvatar({ name }: { name?: string | null }) {
    const initial = name?.[0]?.toUpperCase() ?? '?';
    return (
        <div
            className="w-6 h-6 rounded-full bg-linear-to-br from-blue-500 to-blue-700 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white shrink-0"
            title={name ?? 'Assigned'}
        >
            {initial}
        </div>
    );
}

export default memo(function SortableTask({ task, boardId, members, currentUserEmail
}: { task: TaskType; boardId: string; members?: MemberType[]; currentUserEmail?: string | null }) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [nowTs, setNowTs] = useState<number>(0);

    useEffect(() => {
        const openFromTour = (event: Event) => {
            const custom = event as CustomEvent<{ taskId?: string }>;
            if (custom.detail?.taskId === task.id) {
                setIsDetailsOpen(true);
            }
        };

        const closeFromTour = () => {
            setIsDetailsOpen(false);
        };

        window.addEventListener('ks-tour-open-task-details', openFromTour as EventListener);
        window.addEventListener('ks-tour-close-task-details', closeFromTour);

        return () => {
            window.removeEventListener('ks-tour-open-task-details', openFromTour as EventListener);
            window.removeEventListener('ks-tour-close-task-details', closeFromTour);
        };
    }, [task.id]);

    useEffect(() => {
        const t = window.setTimeout(() => setNowTs(Date.now()), 0);
        return () => window.clearTimeout(t);
    }, []);

    // Derive whether the current user is a Leader — only Leaders can delete tasks
    const isLeader = members?.some(
        (m) => m.user.email === currentUserEmail && m.role === BoardRole.LEADER
    ) ?? false;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
    const [isPendingDelete, startTransition] = useTransition();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    const confirmDelete = () => {
        startTransition(async () => {
            await deleteTask(task.id, boardId);
            setIsDeleteModalOpen(false);
        });
    };

    const hasPriority = task.priority && task.priority !== 'NONE';
    const hasTags = task.tags && task.tags.length > 0;
    const dueAt = task.dueAt ? new Date(task.dueAt) : null;
    const isOverdue = dueAt ? dueAt.getTime() < nowTs && task.status !== 'DONE' : false;
    const subtaskTotal = task.subtasks?.length ?? 0;
    const subtaskDone = task.subtasks?.filter((s) => s.done).length ?? 0;
    const subtaskProgress = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                data-tour="task-card"
                className={`group bg-white rounded-xl border border-l-[3px] transition-all duration-150 cursor-grab active:cursor-grabbing select-none
                    ${getPriorityAccent(task.priority)}
                    ${isOverdue ? 'ring-1 ring-red-300 bg-red-50/40' : ''}
                    ${isDragging
                        ? 'border-blue-400 shadow-xl ring-2 ring-blue-100 scale-[1.02]'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md shadow-sm'
                    }
                `}
                onClick={() => setIsDetailsOpen(true)}
            >
                <div className="p-3.5">

                    {/* ── Row 1: Category badge · priority icon · assignee · action buttons ── */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                        {/* Left cluster: badge + priority + avatar */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide border shrink-0 ${getCategoryColor(task.category)}`}>
                                {task.category.replace(/_/g, ' ')}
                            </span>
                            {hasPriority && <PriorityIcon priority={task.priority} />}
                            {task.assignee
                                ? <AssigneeAvatar name={task.assignee.name} />
                                : (
                                    <div className="w-5 h-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center shrink-0" title="Unassigned">
                                        <svg className="w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                )
                            }
                        </div>

                        {/* Right cluster: action buttons — always visible */}
                        <div data-tour="task-inline-actions" className="flex items-center gap-0.5 shrink-0">
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); setIsDetailsOpen(true); }}
                                data-tour="task-edit-button"
                                className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                aria-label="Edit task"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                            </button>
                            {isLeader && (
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
                                    disabled={isPendingDelete}
                                    data-tour="task-delete-button"
                                    className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                                    aria-label="Delete task"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Row 2: Title ── */}
                    <h3 className="text-sm font-semibold text-gray-800 leading-snug wrap-anywhere line-clamp-3 mb-2.5">
                        {task.title}
                    </h3>

                    {/* ── Row 3: Tags only ── */}
                    {hasTags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {task.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-md border border-slate-200 truncate max-w-20">
                                    #{tag}
                                </span>
                            ))}
                            {task.tags.length > 3 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded-md border border-slate-200">
                                    +{task.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}

                    {dueAt && (
                        <div className="mt-2 flex items-center gap-1.5">
                            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isOverdue ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                {isOverdue ? 'Overdue' : 'Due'} {dueAt.toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    {subtaskTotal > 0 && (
                        <div className="mt-2.5">
                            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                <span>Checklist</span>
                                <span>{subtaskDone}/{subtaskTotal}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${subtaskProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                </div>
            </div>
            <TaskDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                task={task}
                boardId={boardId}
                members={members ?? []}
                currentUserEmail={currentUserEmail}
            />
            {/* 3. The Custom Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} className="max-w-sm">
                <div className="p-6">
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>

                    <h2 className="text-lg font-bold text-gray-900 mb-1">Delete Task</h2>
                    <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                        Are you sure you want to delete{' '}
                        <span className="font-semibold text-gray-800">&ldquo;{task.title}&rdquo;</span>?{' '}
                        This action cannot be undone.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isPendingDelete}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isPendingDelete}
                            className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-red-200 flex items-center gap-1.5 min-w-24 justify-center"
                        >
                            {isPendingDelete ? (
                                <>
                                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Deleting…
                                </>
                            ) : (
                                <> Delete</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
})