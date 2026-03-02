'use client';

import { useRef, useTransition } from 'react';
import Modal from '../../../components/ui/Modal';
import { updateTask } from '../../../actions/taskActions';
import type { Prisma } from '../../../generated/prisma/browser';
import { TaskCategory } from '../../../generated/prisma/enums';

type TaskType = Prisma.TaskModel;

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: TaskType;
    boardId: string;
}

export default function EditTaskModal({ isOpen, onClose, task, boardId }: EditTaskModalProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const categoryRef = useRef<HTMLSelectElement>(null);
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        const title = inputRef.current?.value;
        const category = categoryRef.current?.value as TaskCategory;

        if (!title || title.trim() === '') return;

        startTransition(async () => {
            const result = await updateTask(task.id, boardId, title, category);
            if (result.success) {
                onClose();
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2 className="text-xl font-bold mb-4">Edit Task</h2>

            <div className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                    <input
                        ref={inputRef}
                        type="text"
                        defaultValue={task.title}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        ref={categoryRef}
                        defaultValue={task.category}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-blue-500 bg-white"
                    >
                        <option value={TaskCategory.NEW_FEATURE}>✨ Feature</option>
                        <option value={TaskCategory.BUG}>🐛 Bug</option>
                        <option value={TaskCategory.TASK}>🧹 Chore</option>
                    </select>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}