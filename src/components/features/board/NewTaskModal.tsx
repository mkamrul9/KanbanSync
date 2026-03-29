'use client';

import { useTransition, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { createTask } from '../../../actions/taskActions';
import { TaskStatus, TaskCategory } from '../../../generated/prisma/enums';
import { BoardWithColumnsAndTasks } from '../../../types/board';

type MemberType = BoardWithColumnsAndTasks['members'][number];
type TemplateType = BoardWithColumnsAndTasks['taskTemplates'][number];

interface NewTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    columnId: string;
    columnTitle: string;
    members?: MemberType[];
    templates?: TemplateType[];
}

const categoryConfig: Record<string, { label: string; color: string }> = {
    NEW_FEATURE: { label: 'Feature', color: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' },
    EPIC: { label: 'Epic', color: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' },
    STORY: { label: 'Story', color: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200' },
    TASK: { label: 'Task', color: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
    SUB_TASK: { label: 'Sub-task', color: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
    BUG: { label: 'Bug', color: 'bg-red-100 text-red-700 ring-1 ring-red-200' },
    ENHANCEMENT: { label: 'Enhancement', color: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' },
    PATCH: { label: 'Patch', color: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200' },
    HOTFIX: { label: 'Hotfix', color: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200' },
};

export default function NewTaskModal({ isOpen, onClose, boardId, columnId, columnTitle, members = [], templates = [] }: NewTaskModalProps) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<TaskCategory>(TaskCategory.NEW_FEATURE);
    const [description, setDescription] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [priority, setPriority] = useState('NONE');
    const [tagsInput, setTagsInput] = useState('');
    const [dueAt, setDueAt] = useState('');
    const [reminderAt, setReminderAt] = useState('');
    const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [isPending, startTransition] = useTransition();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const cat = categoryConfig[category] ?? { label: category, color: 'bg-gray-100 text-gray-600' };
    const selectedMember = members.find(m => m.user.id === assigneeId);

    const reset = () => {
        setTitle(''); setCategory(TaskCategory.NEW_FEATURE);
        setDescription(''); setAssigneeId(''); setErrorMsg(null);
        setPriority('NONE'); setTagsInput('');
        setDueAt(''); setReminderAt(''); setRecurrence('NONE');
        setSelectedTemplateId('');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleSave = () => {
        if (!title.trim()) return;
        setErrorMsg(null);

        let status: TaskStatus = TaskStatus.TODO;
        if (columnTitle === 'In Progress') status = TaskStatus.IN_PROGRESS;
        if (columnTitle === 'Done') status = TaskStatus.DONE;

        startTransition(async () => {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');
            const result = await createTask(
                boardId,
                columnId,
                title,
                status,
                category,
                description,
                assigneeId || undefined,
                priority,
                tags,
                dueAt || undefined,
                reminderAt || undefined,
                recurrence,
            );
            if (result.success) { reset(); onClose(); }
            else setErrorMsg(result.error ?? 'Something went wrong');
        });
    };

    const handleApplyTemplate = () => {
        if (!selectedTemplateId) return;
        const template = templates.find((t) => t.id === selectedTemplateId);
        if (!template) return;

        setTitle(template.title);
        setDescription(template.description ?? '');
        setCategory(template.category);
        setPriority(template.priority);
        setTagsInput((template.tags ?? []).join(', '));
        setRecurrence((template.recurrence as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY') ?? 'NONE');
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-5xl">
            <div className="flex flex-col md:flex-row h-[82vh] max-h-[82vh] overflow-hidden app-bg" data-tour="new-task-modal">

                {/* ── LEFT: Main content ───────────────────────────────── */}
                <div className="flex-1 flex flex-col min-h-0 p-7 pr-6 overflow-y-auto">

                    {/* Breadcrumb + title input */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{columnTitle}</span>
                            <span className="text-gray-300 text-xs">›</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>
                                {cat.label}
                            </span>
                        </div>
                        <input
                            type="text"
                            autoFocus
                            placeholder="What needs to be done?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            className="w-full text-[22px] font-bold text-gray-900 placeholder-gray-300 bg-transparent border-0 border-b-2 border-transparent focus:border-blue-500 focus:outline-none pb-1 transition-colors"
                        />
                    </div>

                    {errorMsg && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            {errorMsg}
                        </div>
                    )}

                    {/* Description */}
                    <div className="mb-5 app-surface rounded-2xl border border-slate-200/70 p-4">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Description</h3>
                        <textarea
                            data-tour="new-task-description"
                            className="w-full h-36 px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent text-sm text-gray-700 placeholder-gray-400 resize-none transition-all"
                            placeholder="Add a more detailed description…"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Comments placeholder */}
                    <div className="flex-1 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 min-h-44">
                        <svg className="w-9 h-9 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm text-slate-500 font-medium">Comments unlock after the task is created.</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-5 mt-4 border-t border-gray-100">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isPending || !title.trim()}
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
                            ) : 'Save Task'}
                        </button>
                    </div>
                </div>

                {/* ── RIGHT: Sidebar ───────────────────────────────────── */}
                <div className="w-full md:w-72 shrink-0 flex flex-col gap-1 bg-slate-50 border-l border-slate-200 p-5 rounded-r-2xl overflow-y-auto">

                    {/* Template */}
                    <div className="mb-5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Template</p>
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                        >
                            <option value="">Start blank</option>
                            {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleApplyTemplate}
                            disabled={!selectedTemplateId}
                            className="mt-2 w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Apply Template
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1">Pick one and click Apply to prefill this form.</p>
                    </div>

                    {/* Category */}
                    <div className="mb-5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Category</p>
                        <select
                            data-tour="new-task-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value as TaskCategory)}
                            className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
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
                    <div className="mb-5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Priority</p>
                        <select
                            data-tour="new-task-priority"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                        >
                            <option value="URGENT">!! Urgent</option>
                            <option value="HIGH">! High</option>
                            <option value="MEDIUM">~ Medium</option>
                            <option value="LOW">v Low</option>
                            <option value="NONE">- None</option>
                        </select>
                    </div>

                    {/* Assignee */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assignee</p>
                        {selectedMember ? (
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white">
                                    {selectedMember.user.name?.[0]?.toUpperCase() ?? 'U'}
                                </div>
                                <span className="text-xs font-medium text-gray-700 truncate">{selectedMember.user.name || selectedMember.user.email}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mb-2 text-gray-400">
                                <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-[10px]">?</div>
                                <span className="text-xs">Unassigned</span>
                            </div>
                        )}
                        <select
                            data-tour="new-task-assignee"
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                        >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                                <option key={m.user.id} value={m.user.id}>
                                    {m.user.name || m.user.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tags */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tags</p>
                        <input
                            type="text"
                            data-tour="new-task-tags"
                            placeholder="Frontend, UI, Backend…"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Comma separated</p>
                    </div>

                    {/* Due date */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Due Date</p>
                        <input
                            type="datetime-local"
                            value={dueAt}
                            onChange={(e) => setDueAt(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                        />
                    </div>

                    {/* Reminder */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reminder</p>
                        <input
                            type="datetime-local"
                            value={reminderAt}
                            onChange={(e) => setReminderAt(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                        />
                    </div>

                    {/* Recurrence */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Recurrence</p>
                        <select
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                            className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                        >
                            <option value="NONE">None</option>
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                        </select>
                    </div>

                    <div className="border-t border-gray-200 mt-auto pt-4">
                        <p className="text-[10px] text-gray-400 text-center">New task · {columnTitle}</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
}