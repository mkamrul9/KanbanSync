'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useEffect, useState, useTransition } from 'react';
import type { TaskCategory } from '../../../generated/prisma/browser';
import { deleteTask, updateTask } from '@/src/actions/taskActions';
// EditTaskModal replaced by TaskDetailsModal for unified edit flow
import TaskDetailsModal from './TaskDetailsModal';
import Modal from '../../ui/Modal';
import { BoardWithColumnsAndTasks } from '../../../types/board';
import { BoardRole } from '../../../generated/prisma/enums';

type TaskType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number];
type MemberType = BoardWithColumnsAndTasks['members'][number];

// Priority dot + label helper
function PriorityIcon({ priority, className = '' }: { priority: string; className?: string }) {
    if (priority === 'URGENT') return (
        <span className={`flex items-center gap-1 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span className="text-[11px] font-medium text-red-500">Urgent</span>
        </span>
    );
    if (priority === 'HIGH') return (
        <span className={`flex items-center gap-1 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
            <span className="text-[11px] font-medium text-orange-500">High</span>
        </span>
    );
    if (priority === 'MEDIUM') return (
        <span className={`flex items-center gap-1 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            <span className="text-[11px] font-medium text-sky-500">Med</span>
        </span>
    );
    if (priority === 'LOW') return (
        <span className={`flex items-center gap-1 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span className="text-[11px] font-medium text-slate-400">Low</span>
        </span>
    );
    return null;
}

// Category badge styles using subtle opacity variants
const getCategoryColor = (category: TaskCategory) => {
    switch (category) {
        case 'BUG':
        case 'HOTFIX':
            return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'NEW_FEATURE':
            return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
        case 'EPIC':
            return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case 'ENHANCEMENT':
            return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
        case 'PATCH':
            return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'STORY':
            return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case 'SUB_TASK':
            return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        default:
            return 'bg-[--ks-bg-overlay] text-[--ks-text-secondary] border-[--ks-border]';
    }
};

const tagPalettes = [
    'bg-[--ks-primary-subtle] text-[--ks-primary] border-[--ks-primary]/25',
    'bg-[--ks-success-subtle] text-[--ks-success] border-[--ks-success]/25',
    'bg-[--ks-accent-subtle] text-[--ks-accent] border-[--ks-accent]/25',
    'bg-[--ks-warning-subtle] text-[--ks-warning] border-[--ks-warning]/25',
    'bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-500/30',
];

const tagColorFor = (tag: string) => {
    const idx = Array.from(tag).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % tagPalettes.length;
    return tagPalettes[idx];
};

// Assignee avatar with tooltip
function AssigneeAvatar({ name, image }: { name?: string | null; image?: string | null }) {
    const initial = name?.[0]?.toUpperCase() ?? '?';
    return (
        <div
            className="w-6 h-6 rounded-full bg-linear-to-br from-[--ks-primary] to-[--ks-accent] text-[11px] font-semibold text-white flex items-center justify-center ring-2 ring-[--ks-bg-card] shrink-0 overflow-hidden"
            title={name ?? 'Assigned'}
        >
            {image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={image} alt={name ?? 'Assignee'} className="w-full h-full object-cover" />
                : initial}
        </div>
    );
}

/**
 * Renders an individual task card that can be dragged between columns.
 * Integrates with `@dnd-kit/sortable` for drag-and-drop interactions.
 * 
 * Responsibilities:
 * - Displays high-level task info (title, category, priority, assignee, due date).
 * - Highlights overdue tasks and tasks approaching their due date.
 * - Triggers the TaskDetailsModal upon click.
 * - Handles optimistic updates during deletion.
 * 
 * @param {object} props
 * @param {TaskType} props.task - The task data to display.
 * @param {string} props.boardId - The ID of the board containing the task.
 * @param {MemberType[]} props.members - List of board members (used for permissions/assignment display).
 * @param {string | null} [props.currentUserEmail] - Identifies if the current user is assigned.
 */
export default memo(function SortableTask({ task, boardId, members, currentUserEmail
    , allTasks
}: { task: TaskType; boardId: string; members?: MemberType[]; allTasks?: TaskType[]; currentUserEmail?: string | null }) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [isUpdatingTitle, startUpdatingTitle] = useTransition();
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
    const hasGitLink = (task.attachments ?? []).some((a) =>
        /github|gitlab|bitbucket|\/pull\/|\/merge_requests\/|\/commit\//i.test(a.url) ||
        a.name.startsWith('Git:')
    );

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                data-tour="task-card"
                className={`group rounded-[10px] bg-[--ks-bg-elevated] text-[--ks-text-primary] border border-[--ks-border]
                    hover:border-[--ks-primary]/40 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.25)]
                    transition-all duration-[150ms] cursor-grab active:cursor-grabbing select-none shadow-[--ks-shadow]
                    ${isOverdue ? 'ring-1 ring-red-500/30' : ''}
                    ${isDragging ? 'opacity-50 scale-[0.98] ring-2 ring-[--ks-primary]/40' : ''}
                `}
                onClick={() => setIsDetailsOpen(true)}
            >
                <div className="p-3">

                    {/* ── Row 1: Category badge · priority icon · assignee · action buttons ── */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                        {/* Left cluster: badge + priority + avatar */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide border shrink-0 ${getCategoryColor(task.category)}`}>
                                {task.category.replace(/_/g, ' ')}
                            </span>
                            {hasPriority && (
                                <span className="inline-flex items-center rounded-full bg-[--ks-bg-overlay] border border-[--ks-border] px-1.5 py-0.5">
                                    <PriorityIcon priority={task.priority} />
                                </span>
                            )}
                            {task.assignee && (
                                <AssigneeAvatar name={task.assignee.name} image={task.assignee.image} />
                            )}
                        </div>

                        {/* Right cluster: action buttons — always visible on hover */}
                        <div data-tour="task-inline-actions" className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); setIsDetailsOpen(true); }}
                                data-tour="task-edit-button"
                                className="p-1 rounded-md text-[--ks-text-muted] hover:text-[--ks-primary] hover:bg-[--ks-bg-overlay] transition-colors"
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
                                    className="p-1 rounded-md text-[--ks-text-muted] hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
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
                    {isEditingTitle ? (
                        <input
                            autoFocus
                            className="text-sm font-medium text-[--ks-text-primary] leading-snug w-full mb-2 p-1 border-b-2 border-[--ks-primary] focus:outline-none bg-transparent"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => {
                                setIsEditingTitle(false);
                                if (editTitle.trim() !== task.title) {
                                    startUpdatingTitle(async () => {
                                        await updateTask(task.id, boardId, editTitle.trim(), task.category, task.priority ?? undefined, task.tags, task.dueAt ? task.dueAt.toISOString() : null);
                                    });
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                }
                                if (e.key === 'Escape') {
                                    setEditTitle(task.title);
                                    setIsEditingTitle(false);
                                }
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <h3 
                            className="text-sm font-medium text-[--ks-text-primary] leading-snug wrap-anywhere line-clamp-2 mb-2 hover:bg-[--ks-bg-overlay] rounded px-1 -mx-1 cursor-text transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingTitle(true);
                            }}
                            title="Click to edit title"
                        >
                            {task.title}
                            {isUpdatingTitle && <span className="ml-2 text-xs text-[--ks-primary] font-normal">Saving...</span>}
                        </h3>
                    )}

                    {/* ── Row 3: Tags only ── */}
                    {hasTags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {task.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-md border truncate max-w-20 ${tagColorFor(tag)}`}>
                                    #{tag}
                                </span>
                            ))}
                            {task.tags.length > 3 && (
                                <span className="px-1.5 py-0.5 bg-[--ks-bg-card] text-[--ks-text-muted] text-[11px] rounded-md border border-[--ks-border]">
                                    +{task.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}

                    {dueAt && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${isOverdue ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'}`}>
                                {isOverdue ? 'Overdue' : 'Due'} {dueAt.toLocaleDateString()}
                            </span>
                            {hasGitLink && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30 shadow-sm">
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d="M8 17l-5 5V2h20v20l-5-5" />
                                    </svg>
                                    Git linked
                                </span>
                            )}
                        </div>
                    )}

                    {!dueAt && hasGitLink && (
                        <div className="mt-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30 shadow-sm">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M8 17l-5 5V2h20v20l-5-5" />
                                </svg>
                                Git linked
                            </span>
                        </div>
                    )}

                    {subtaskTotal > 0 && (
                        <div className="mt-2.5">
                            <div className="flex items-center justify-between text-[11px] text-[--ks-text-muted] mb-1">
                                <span>Checklist</span>
                                <span>{subtaskDone}/{subtaskTotal}</span>
                            </div>
                            <div className="w-full h-1.5 bg-[--ks-border] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[--ks-primary] transition-all duration-200"
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
                allTasks={allTasks ?? []}
                currentUserEmail={currentUserEmail}
            />
            {/* 3. The Custom Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} className="max-w-md">
                <div className="bg-[--ks-bg-elevated] text-[--ks-text-primary]">
                    <div className="px-6 pt-6 pb-5 border-b border-[--ks-border] bg-red-500/10">
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shadow-sm shrink-0">
                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-[17px] font-semibold text-[--ks-text-primary]">Archive Task</h2>
                                <p className="text-sm text-[--ks-text-muted] mt-1 leading-relaxed">
                                    You are about to archive
                                    <span className="font-semibold text-[--ks-text-primary]"> &ldquo;{task.title}&rdquo;</span>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-5">
                        <div className="app-surface border border-red-500/20 bg-red-500/10 rounded-xl px-4 py-3 mb-5">
                            <p className="text-xs text-red-400 font-medium">You can restore this task anytime from the Archived menu.</p>
                        </div>

                        <div className="flex items-center justify-end gap-2.5">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isPendingDelete}
                                className="px-4 py-2 text-sm font-medium text-[--ks-text-secondary] bg-[--ks-bg-card] border border-[--ks-border] hover:bg-[--ks-bg-overlay] hover:text-[--ks-text-primary] rounded-xl transition-colors disabled:opacity-50"
                            >
                                Keep Task
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isPendingDelete}
                                className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-red-200 flex items-center gap-1.5 min-w-28 justify-center"
                            >
                                {isPendingDelete ? (
                                    <>
                                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Archiving...
                                    </>
                                ) : (
                                    <>Archive Task</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
})