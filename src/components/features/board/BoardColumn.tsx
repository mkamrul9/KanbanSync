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

export default memo(function BoardColumn({ column, boardId, userRole, members, currentUserEmail }: { column: ColumnWithTasks; boardId?: string; userRole?: string | null; members?: MemberType[]; currentUserEmail?: string | null }) {
    console.log("Rendering Column:", column.id);
    const effectiveBoardId = boardId ?? column.boardId;
    // Make the entire column a drop target
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: {
            type: 'Column',
            column,
        },
    });
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Calculate if the column is at or over its WIP limit
    const isAtLimit = column.wipLimit !== null && column.tasks.length >= column.wipLimit;
    const isOverLimit = column.wipLimit !== null && column.tasks.length > column.wipLimit;

    return (
        <div
            ref={setNodeRef}
            className={`min-w-0 rounded-xl p-4 flex flex-col gap-4 shadow-sm transition-colors
                ${isOverLimit ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-200/80 border-2 border-transparent'}
            `}
        >
            <div className="flex justify-between items-center px-1">
                <h2 className={`font-semibold ${isOverLimit ? 'text-red-700' : 'text-gray-700'}`}>
                    {column.title}
                </h2>

                {/* WIP Display (e.g., 2/3 or just 2) */}
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isOverLimit ? 'bg-red-200 text-red-800' : 'bg-gray-300 text-gray-700'}`}>
                    {column.wipLimit ? `${column.tasks.length} / ${column.wipLimit}` : column.tasks.length}
                </span>
            </div>

            {isOverLimit && (
                <div className="text-xs font-bold text-red-600 px-1 uppercase tracking-wider">
                    WIP Limit Exceeded
                </div>
            )}

            <SortableContext
                id={column.id}
                items={column.tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
            >
                {/* min-h ensures the column always has a drop area, even when empty */}
                <div className="flex flex-col gap-3 min-h-37.5">
                    {column.tasks.map((task) => (
                        <SortableTask key={task.id} task={task} boardId={effectiveBoardId} members={members} currentUserEmail={currentUserEmail} />
                    ))}
                </div>
            </SortableContext>
            {/* The Add Button */}
            {/* GUARD: Only show the "Add Task" button if the user is a LEADER */}
            {userRole === 'LEADER' && (
                <button
                    onClick={() => setIsModalOpen(true)}
                    disabled={isAtLimit}
                    className="mt-2 w-full py-2 text-gray-500 hover:text-gray-800 hover:bg-gray-300/50 p-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                    + Add Task
                </button>
            )}

            {/* The Portal Modal */}
            <NewTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                boardId={effectiveBoardId}
                columnId={column.id}
                columnTitle={column.title}
                members={members}
            />
        </div >
    );
})

