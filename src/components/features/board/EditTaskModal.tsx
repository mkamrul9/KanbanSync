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
    const priorityRef = useRef<HTMLSelectElement>(null);
    const tagsRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        const title = inputRef.current?.value;
        const category = categoryRef.current?.value as TaskCategory;
        const priority = priorityRef.current?.value;
        const tagsRaw = tagsRef.current?.value ?? '';
        const tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t !== '');

        if (!title || title.trim() === '') return;

        startTransition(async () => {
            const result = await updateTask(task.id, boardId, title, category, priority, tags);
            if (result.success) {
                onClose();
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
            {/* Header */}
            <div className="px-7 pt-7 pb-4">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Edit Task</h2>
                <p className="text-sm text-gray-400 mt-0.5">Update title, category, priority and tags.</p>
            </div>

            <div className="px-7 pb-7 flex flex-col gap-5">
                {/* Title */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Task Title <span className="text-red-500">*</span></label>
                    <input
                        ref={inputRef}
                        type="text"
                        defaultValue={task.title}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Category</label>
                    <select
                        ref={categoryRef}
                        defaultValue={task.category}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-all"
                    >
                        <option value={TaskCategory.NEW_FEATURE}>Feature</option>
                        <option value={TaskCategory.EPIC}>Epic</option>
                        <option value={TaskCategory.STORY}>Story</option>
                        <option value={TaskCategory.TASK}>Task</option>
                        <option value={TaskCategory.SUB_TASK}>Sub-task</option>
                        <option value={TaskCategory.BUG}>Bug</option>
                        <option value={TaskCategory.ENHANCEMENT}>Enhancement</option>
                        <option value={TaskCategory.PATCH}>Patch</option>
                        <option value={TaskCategory.HOTFIX}>Hotfix</option>
                    </select>
                </div>

                {/* Priority */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Priority</label>
                    <select
                        ref={priorityRef}
                        defaultValue={task.priority}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-all"
                    >
                        <option value="URGENT">Urgent</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                        <option value="NONE">None</option>
                    </select>
                </div>

                {/* Tags */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Tags</label>
                    <input
                        ref={tagsRef}
                        type="text"
                        defaultValue={task.tags?.join(', ') ?? ''}
                        placeholder="Frontend, UI, Backend…"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Comma separated</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-200"
                    >
                        {isPending ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Saving…
                            </span>
                        ) : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}


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
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
            {/* Header */}
            <div className="px-7 pt-7 pb-4">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Edit Task</h2>
                <p className="text-sm text-gray-400 mt-0.5">Update the title and category below.</p>
            </div>

            <div className="px-7 pb-7 flex flex-col gap-5">
                {/* Title */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Task Title <span className="text-red-500">*</span></label>
                    <input
                        ref={inputRef}
                        type="text"
                        defaultValue={task.title}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Category</label>
                    <select
                        ref={categoryRef}
                        defaultValue={task.category}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-all"
                    >
                        <option value={TaskCategory.NEW_FEATURE}>Feature</option>
                        <option value={TaskCategory.EPIC}>Epic</option>
                        <option value={TaskCategory.STORY}>Story</option>
                        <option value={TaskCategory.TASK}>Task</option>
                        <option value={TaskCategory.SUB_TASK}>Sub-task</option>
                        <option value={TaskCategory.BUG}>Bug</option>
                        <option value={TaskCategory.ENHANCEMENT}>Enhancement</option>
                        <option value={TaskCategory.PATCH}>Patch</option>
                        <option value={TaskCategory.HOTFIX}>Hotfix</option>
                    </select>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-200"
                    >
                        {isPending ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Saving…
                            </span>
                        ) : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}