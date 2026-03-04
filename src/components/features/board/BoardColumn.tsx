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

// Derive a subtle accent color for each column based on its title
function getColumnAccent(title: string): { dot: string; header: string } {
    const t = title.toLowerCase();
    if (t.includes('done') || t.includes('complet')) return { dot: 'bg-emerald-500', header: 'text-emerald-700' };
    if (t.includes('progress') || t.includes('doing') || t.includes('active')) return { dot: 'bg-blue-500', header: 'text-blue-700' };
    if (t.includes('review') || t.includes('testing') || t.includes('qa')) return { dot: 'bg-violet-500', header: 'text-violet-700' };
    if (t.includes('todo') || t.includes('to do') || t.includes('to-do')) return { dot: 'bg-amber-500', header: 'text-amber-700' };
    if (t.includes('backlog')) return { dot: 'bg-slate-400', header: 'text-slate-600' };
    if (t.includes('block') || t.includes('hold')) return { dot: 'bg-red-500', header: 'text-red-700' };
    return { dot: 'bg-gray-400', header: 'text-gray-600' };
}

export default memo(function BoardColumn({ column, boardId, userRole, members, currentUserEmail }: { column: ColumnWithTasks; boardId?: string; userRole?: string | null; members?: MemberType[]; currentUserEmail?: string | null }) {
    console.log("Rendering Column:", column.id);
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
                    : 'bg-gray-100/90 ring-1 ring-gray-200/60'
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
                    <h2 className={`font-semibold text-sm truncate ${isOverLimit ? 'text-red-700' : 'text-gray-700'}`}>
                        {column.title}
                    </h2>
                </div>

                {/* Task count / WIP badge */}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2
                    ${isOverLimit
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-600 ring-1 ring-gray-200'
                    }`}
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
            />
        </div>
    );
})

