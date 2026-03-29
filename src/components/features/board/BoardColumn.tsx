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

// Derive a stronger visual palette for each column based on its title
function getColumnAccent(title: string): { dot: string; header: string; panel: string; badge: string; border: string } {
    const t = title.toLowerCase();
    if (t.includes('done') || t.includes('complet')) return { dot: 'bg-emerald-500', header: 'text-emerald-800', panel: 'bg-emerald-50/70', badge: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200', border: 'ring-emerald-200/70' };
    if (t.includes('progress') || t.includes('doing') || t.includes('active')) return { dot: 'bg-blue-500', header: 'text-blue-800', panel: 'bg-blue-50/70', badge: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200', border: 'ring-blue-200/70' };
    if (t.includes('review') || t.includes('testing') || t.includes('qa')) return { dot: 'bg-violet-500', header: 'text-violet-800', panel: 'bg-violet-50/70', badge: 'bg-violet-100 text-violet-800 ring-1 ring-violet-200', border: 'ring-violet-200/70' };
    if (t.includes('todo') || t.includes('to do') || t.includes('to-do')) return { dot: 'bg-amber-500', header: 'text-amber-800', panel: 'bg-amber-50/70', badge: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200', border: 'ring-amber-200/70' };
    if (t.includes('backlog')) return { dot: 'bg-slate-500', header: 'text-slate-700', panel: 'bg-slate-100/80', badge: 'bg-slate-200 text-slate-700 ring-1 ring-slate-300', border: 'ring-slate-300/70' };
    if (t.includes('block') || t.includes('hold')) return { dot: 'bg-red-500', header: 'text-red-800', panel: 'bg-red-50/70', badge: 'bg-red-100 text-red-800 ring-1 ring-red-200', border: 'ring-red-200/70' };
    return { dot: 'bg-cyan-500', header: 'text-cyan-800', panel: 'bg-cyan-50/70', badge: 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200', border: 'ring-cyan-200/70' };
}

export default memo(function BoardColumn({ column, boardId, userRole, members, templates, allTasks, currentUserEmail }: { column: ColumnWithTasks; boardId?: string; userRole?: string | null; members?: MemberType[]; templates?: TemplateType[]; allTasks?: TaskType[]; currentUserEmail?: string | null }) {
    const effectiveBoardId = boardId ?? column.boardId;

    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: 'Column', column },
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    const isAtLimit = column.wipLimit !== null && column.tasks.length >= column.wipLimit;
    const isOverLimit = column.wipLimit !== null && column.tasks.length > column.wipLimit;

    const accent = getColumnAccent(column.title);

    return (
        <div
            ref={setNodeRef}
            className={`min-w-0 rounded-2xl flex flex-col shadow-sm transition-colors
                ${isOverLimit
                    ? 'bg-red-50/80 ring-1 ring-red-200'
                    : `${accent.panel} ring-1 ${accent.border}`
                }
            `}
        >
            {/* ── Column Header ── */}
            <div className={`px-4 pt-4 pb-3 flex items-center justify-between border-b
                ${isOverLimit ? 'border-red-200' : 'border-gray-200/70'}
            `}>
                <div className="flex items-center gap-2 min-w-0">
                    {/* Accent dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOverLimit ? 'bg-red-500' : accent.dot}`} />
                    <h2 className={`font-semibold text-sm truncate ${isOverLimit ? 'text-red-700' : accent.header}`}>
                        {column.title}
                    </h2>
                </div>

                {/* Task count / WIP badge */}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2
                    ${isOverLimit ? 'bg-red-500 text-white' : accent.badge}`}
                >
                    {column.wipLimit ? `${column.tasks.length} / ${column.wipLimit}` : column.tasks.length}
                </span>
            </div>

            {/* WIP exceeded warning stripe */}
            {isOverLimit && (
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-100 border-b border-red-200">
                    <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">WIP limit exceeded</span>
                </div>
            )}

            {/* ── Task list ── */}
            <div className="flex-1 px-3 py-3">
                <SortableContext
                    id={column.id}
                    items={column.tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-col gap-2.5 min-h-30">
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
            </div>

            {/* ── Add Task button ── */}
            {userRole === 'LEADER' && (
                <div className="px-3 pb-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={isAtLimit}
                        data-tour="column-add-task"
                        className="w-full py-2 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500
                            hover:text-gray-700 hover:bg-white/70 rounded-xl transition-all duration-150
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent border border-dashed border-gray-300 hover:border-gray-400"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Task
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

