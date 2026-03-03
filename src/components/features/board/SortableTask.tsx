'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useState, useTransition } from 'react';
import type { TaskCategory } from '../../../generated/prisma/browser';
import { deleteTask } from '@/src/actions/taskActions';
// EditTaskModal replaced by TaskDetailsModal for unified edit flow
import TaskDetailsModal from './TaskDetailsModal';
import Modal from '../../ui/Modal';
import { BoardWithColumnsAndTasks } from '../../../types/board';
import { BoardRole } from '../../../generated/prisma/enums';

type TaskType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number];
type MemberType = BoardWithColumnsAndTasks['members'][number];

// Helper function to color-code categories
const getCategoryColor = (category: TaskCategory) => {
    switch (category) {
        case 'BUG': return 'bg-red-100 text-red-700 border-red-200';
        case 'NEW_FEATURE': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'TASK': return 'bg-gray-100 text-gray-700 border-gray-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

export default memo(function SortableTask({ task, boardId, members, currentUserEmail
}: { task: TaskType; boardId: string; members?: MemberType[]; currentUserEmail?: string | null }) {
    console.log("Rendering Task:", task.id);

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    // New function to actually execute the delete
    const confirmDelete = () => {
        startTransition(async () => {
            await deleteTask(task.id, boardId);
            setIsDeleteModalOpen(false); // Close modal when done
        });
    };
    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={`relative group bg-white p-4 rounded-lg shadow-sm border transition-shadow cursor-grab active:cursor-grabbing
                ${isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:shadow-md'}
            `}
                onClick={() => setIsDetailsOpen(true)}
            >
                <div className="flex justify-between items-start mb-2">
                    {/* The Task Category Badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${getCategoryColor(task.category)}`}>
                        {task.category}
                    </span>
                    {/* Action Buttons (Visible on hover) */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onPointerDown={(e) => e.stopPropagation()} // CRITICAL: Stops drag-and-drop
                            onClick={(e) => { e.stopPropagation(); setIsDetailsOpen(true); }}
                            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-1 rounded disabled:opacity-50"
                            title="Edit"
                            aria-label="Edit task"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                        </button>
                        {isLeader && (
                            <button
                                onPointerDown={(e) => e.stopPropagation()} // CRITICAL: Stops drag-and-drop
                                onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
                                disabled={isPendingDelete}
                                className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1 rounded disabled:opacity-50"
                                title="Delete"
                                aria-label="Delete task"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                {/* Small assignee avatar (initial) */}
                {task.assignee && (
                    <div className="absolute bottom-2 right-2 w-5 h-5 bg-blue-600 rounded-full text-[8px] text-white flex items-center justify-center border border-white">
                        {task.assignee.name?.[0] ?? 'U'}
                    </div>
                )}

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
                    <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center text-2xl mb-4">
                        🗑️
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