'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTask from './SortableTask';
import { useState } from 'react';
import NewTaskModal from './NewTaskModal';
import { memo } from 'react';
import { BoardWithColumnsAndTasks } from '../../../types/board';

type ColumnWithTasks = BoardWithColumnsAndTasks['columns'][number];
type MemberType = BoardWithColumnsAndTasks['members'][number];
type TemplateType = BoardWithColumnsAndTasks['taskTemplates'][number];
type TaskType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number];

// Unified dot color per column state (all columns share the same background token)
function getColumnDot(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('done') || t.includes('complet')) return 'bg-emerald-500';
    if (t.includes('progress') || t.includes('doing') || t.includes('active')) return 'bg-indigo-500';
    if (t.includes('review') || t.includes('testing') || t.includes('qa')) return 'bg-violet-500';
    if (t.includes('todo') || t.includes('to do') || t.includes('to-do')) return 'bg-amber-500';
    if (t.includes('backlog')) return 'bg-slate-400';
    if (t.includes('block') || t.includes('hold')) return 'bg-red-500';
    return 'bg-indigo-400';
}

/**
 * Renders a single column (swimlane) on the Kanban board.
 * Acts as a droppable container for tasks using `@dnd-kit/core`.
 */
export default memo(function BoardColumn({ column, boardId, userRole, members, templates, allTasks, currentUserEmail, onArchiveColumn }: { column: ColumnWithTasks; boardId?: string; userRole?: string | null; members?: MemberType[]; templates?: TemplateType[]; allTasks?: TaskType[]; currentUserEmail?: string | null; onArchiveColumn?: (columnId: string) => void }) {
    const effectiveBoardId = boardId ?? column.boardId;

    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: 'Column', column },
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    const isAtLimit = column.wipLimit !== null && column.tasks.length >= column.wipLimit;
    const isOverLimit = column.wipLimit !== null && column.tasks.length > column.wipLimit;

    const dotColor = getColumnDot(column.title);

    return (
        <div
            ref={setNodeRef}
            className={`min-w-0 rounded-[18px] flex flex-col transition-colors bg-[--ks-bg-card] border border-[--ks-border] shadow-[--ks-shadow]
                ${isOverLimit ? 'ring-1 ring-red-500/40' : ''}
            `}
        >
            {/* ── Column Header ── */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[--ks-border]">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Accent dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOverLimit ? 'bg-red-500' : dotColor}`} />
                    <h2 className="font-semibold text-[13px] tracking-wide uppercase text-[--ks-text-secondary] truncate">
                        {column.title}
                    </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                    {userRole === 'LEADER' && onArchiveColumn && (
                        <button
                            type="button"
                            onClick={() => onArchiveColumn(column.id)}
                            className="text-[11px] px-2 py-0.5 rounded-md border border-[--ks-border] bg-[--ks-bg-overlay] text-[--ks-text-muted] hover:text-[--ks-text-primary] hover:bg-[--ks-bg-elevated] transition-colors"
                            title="Archive this column"
                        >
                            Archive
                        </button>
                    )}

                    {/* Task count / WIP badge */}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isOverLimit
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-[--ks-bg-overlay] text-[--ks-text-muted] border border-[--ks-border]'
                    }`}>
                        {column.wipLimit ? `${column.tasks.length} / ${column.wipLimit}` : column.tasks.length}
                    </span>
                </div>
            </div>

            {/* WIP exceeded warning stripe */}
            {isOverLimit && (
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/10 border-b border-red-500/20">
                    <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                    <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">Over WIP limit</span>
                </div>
            )}

            {/* ── Task list ── */}
            <div className="flex-1 px-3 py-3">
                {column.tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center select-none">
                        <div className="w-8 h-8 rounded-full bg-[--ks-bg-overlay] border border-[--ks-border] flex items-center justify-center text-[--ks-text-muted]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <p className="text-xs font-medium text-[--ks-text-secondary]">No tasks</p>
                        <p className="text-[11px] text-[--ks-text-muted]">Drag tasks here or click add</p>
                    </div>
                ) : (
                    <SortableContext
                        id={column.id}
                        items={column.tasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="flex flex-col gap-2 min-h-20">
                            {column.tasks.map((task) => (
                                <SortableTask
                                    key={task.id}
                                    task={task}
                                    boardId={effectiveBoardId}
                                    members={members}
                                    allTasks={allTasks}
                                    currentUserEmail={currentUserEmail}
                                />
                            ))}
                        </div>
                    </SortableContext>
                )}
            </div>

            {/* ── Add Task button ── */}
            {userRole === 'LEADER' && (
                <div className="px-3 pb-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={isAtLimit}
                        data-tour="column-add-task"
                        className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-[--ks-text-muted]
                            hover:text-[--ks-primary] hover:bg-[--ks-bg-overlay] rounded-[10px] transition-all duration-150
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent border border-dashed border-[--ks-border] hover:border-[--ks-primary]/40"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add task
                    </button>
                </div>
            )}

            <NewTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                boardId={effectiveBoardId}
                columnId={column.id}
                columnTitle={column.title}
                members={members}
                templates={templates}
            />
        </div>
    );
})

