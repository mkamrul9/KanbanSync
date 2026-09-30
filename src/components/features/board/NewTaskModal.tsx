'use client';

import { useTransition, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Tooltip from '../../ui/Tooltip';
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
    NEW_FEATURE: { label: 'Feature', color: 'bg-[--ks-primary-subtle] text-[--ks-primary] ring-1 ring-[--ks-primary]/30' },
    EPIC: { label: 'Epic', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/30' },
    STORY: { label: 'Story', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/30' },
    TASK: { label: 'Task', color: 'bg-[--ks-bg-card] text-[--ks-text-secondary] ring-1 ring-[--ks-border]' },
    SUB_TASK: { label: 'Sub-task', color: 'bg-[--ks-bg-card] text-[--ks-text-muted] ring-1 ring-[--ks-border]' },
    BUG: { label: 'Bug', color: 'bg-red-500/15 text-red-600 dark:text-red-300 ring-1 ring-red-500/30' },
    ENHANCEMENT: { label: 'Enhancement', color: 'bg-[--ks-accent-subtle] text-[--ks-accent] ring-1 ring-[--ks-accent]/30' },
    PATCH: { label: 'Patch', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 ring-1 ring-orange-500/30' },
    HOTFIX: { label: 'Hotfix', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/30' },
};

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
    return null;
}

function SideSectionTitle({ label, dotColor }: { label: string; dotColor: string }) {
    return (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[--ks-text-muted] mb-2 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {label}
        </p>
    );
}

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
    const priorityOptions = [
        { value: 'URGENT', label: 'Urgent' },
        { value: 'HIGH', label: 'High' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'LOW', label: 'Low' },
        { value: 'NONE', label: 'None' },
    ];

    const cat = categoryConfig[category] ?? { label: category, color: 'bg-[--ks-bg-card] text-[--ks-text-secondary]' };
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
                            <span className="text-xs text-[--ks-text-muted] font-medium uppercase tracking-wide">{columnTitle}</span>
                            <span className="text-[--ks-text-muted] text-xs">›</span>
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
                            className="w-full text-xl font-semibold text-[--ks-text-primary] placeholder-[--ks-text-muted] bg-transparent border-0 border-b-2 border-transparent focus:border-[--ks-primary] focus:outline-none pb-1 transition-colors"
                        />
                    </div>

                    {errorMsg && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            </svg>
                            {errorMsg}
                        </div>
                    )}

                    {/* Description */}
                    <div className="mb-5 app-surface rounded-2xl border border-[--ks-border] p-4">
                        <h3 className="text-xs font-semibold text-[--ks-text-muted] uppercase tracking-wide mb-1.5">Description</h3>
                        <textarea
                            data-tour="new-task-description"
                            className="w-full h-36 px-3 py-2.5 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl focus:ring-2 focus:ring-[--ks-primary] focus:bg-[--ks-bg-card] focus:border-transparent text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] resize-none transition-all"
                            placeholder="Add a more detailed description…"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Comments placeholder */}
                    <div className="flex-1 bg-[--ks-bg-overlay] rounded-2xl flex flex-col items-center justify-center gap-2 border border-dashed border-[--ks-border] min-h-44">
                        <svg className="w-9 h-9 text-[--ks-text-muted]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm text-[--ks-text-muted] font-medium">Comments unlock after the task is created.</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-5 mt-4 border-t border-[--ks-border]">
                        <Tooltip text="Close without creating this task" position="top">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm text-[--ks-text-secondary] font-medium hover:bg-[--ks-bg-overlay] rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </Tooltip>
                        <Tooltip text="Create task in this column" position="top">
                            <button
                                onClick={handleSave}
                                disabled={isPending || !title.trim()}
                                className="px-5 py-2 ui-btn-primary active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
                        </Tooltip>
                    </div>
                </div>

                {/* ── RIGHT: Sidebar ───────────────────────────────────── */}
                <div className="w-full md:w-80 shrink-0 flex flex-col gap-2 bg-[--ks-bg-elevated] border-l border-[--ks-border] p-5 rounded-r-2xl overflow-y-auto">

                    <p className="text-[11px] font-semibold text-[--ks-text-muted] uppercase tracking-widest mb-1">Task Settings</p>

                    {/* Template */}
                    <div className="mb-3 rounded-xl border border-[--ks-border] bg-[--ks-bg-card] p-3">
                        <SideSectionTitle label="Template" dotColor="bg-slate-500" />
                        <Tooltip text="Choose a template to prefill task details" position="left">
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] cursor-pointer hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                            >
                                <option value="">Start blank</option>
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                        </Tooltip>
                        <Tooltip text="Apply selected template fields to this task" position="left">
                            <button
                                type="button"
                                onClick={handleApplyTemplate}
                                disabled={!selectedTemplateId}
                                className="mt-2 w-full px-3 py-2 rounded-lg bg-[--ks-bg-overlay] border border-[--ks-border] text-xs font-semibold text-[--ks-text-secondary] hover:text-[--ks-text-primary] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply Template
                            </button>
                        </Tooltip>
                        <p className="text-[11px] text-[--ks-text-muted] mt-1">Pick one and click Apply to prefill this form.</p>
                    </div>

                    {/* Category */}
                    <div className="mb-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                        <SideSectionTitle label="Category" dotColor="bg-indigo-500" />
                        <Tooltip text="Set task type to improve reporting and filtering" position="left">
                            <select
                                data-tour="new-task-category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                                className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] cursor-pointer hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
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
                        </Tooltip>
                    </div>

                    {/* Priority */}
                    <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                        <SideSectionTitle label="Priority" dotColor="bg-rose-500" />
                        <div data-tour="new-task-priority" className="grid grid-cols-2 gap-1.5">
                            {priorityOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setPriority(opt.value)}
                                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${priority === opt.value
                                        ? 'bg-[--ks-primary] text-white border-[--ks-primary]'
                                        : 'bg-[--ks-bg-card] text-[--ks-text-secondary] border border-[--ks-border] hover:border-[--ks-primary] hover:text-[--ks-text-primary]'
                                        }`}
                                >
                                    {opt.value !== 'NONE' ? (
                                        <PriorityIcon priority={opt.value} className={priority === opt.value ? 'text-white' : ''} />
                                    ) : (
                                        <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-[11px]">-</span>
                                    )}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Assignee */}
                    <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <SideSectionTitle label="Assignee" dotColor="bg-emerald-500" />
                        {selectedMember ? (
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[11px] font-semibold text-white">
                                    {selectedMember.user.name?.[0]?.toUpperCase() ?? 'U'}
                                </div>
                                <span className="text-xs font-medium text-[--ks-text-primary] truncate">{selectedMember.user.name || selectedMember.user.email}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mb-2 text-[--ks-text-muted]">
                                <div className="w-6 h-6 rounded-full border-2 border-dashed border-[--ks-border] flex items-center justify-center text-[11px]">?</div>
                                <span className="text-xs">Unassigned</span>
                            </div>
                        )}
                        <Tooltip text="Assign an owner for accountability" position="left">
                            <select
                                data-tour="new-task-assignee"
                                value={assigneeId}
                                onChange={(e) => setAssigneeId(e.target.value)}
                                className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] cursor-pointer hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                            >
                                <option value="">Unassigned</option>
                                {members.map((m) => (
                                    <option key={m.user.id} value={m.user.id}>
                                        {m.user.name || m.user.email}
                                    </option>
                                ))}
                            </select>
                        </Tooltip>
                    </div>

                    {/* Tags */}
                    <div className="mb-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-50/30 p-3">
                        <SideSectionTitle label="Tags" dotColor="bg-fuchsia-500" />
                        <input
                            type="text"
                            data-tour="new-task-tags"
                            placeholder="Frontend, UI, Backend…"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                        />
                        <p className="text-[11px] text-[--ks-text-muted] mt-1">Comma separated</p>
                    </div>

                    {/* Due date */}
                    <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <SideSectionTitle label="Due Date" dotColor="bg-amber-500" />
                        <input
                            type="datetime-local"
                            value={dueAt}
                            onChange={(e) => setDueAt(e.target.value)}
                            className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                        />
                    </div>

                    {/* Reminder */}
                    <div className="mb-3 rounded-xl border border-[--ks-primary]/25 bg-[--ks-primary-subtle] p-3">
                        <SideSectionTitle label="Reminder" dotColor="bg-[--ks-primary]" />
                        <input
                            type="datetime-local"
                            value={reminderAt}
                            onChange={(e) => setReminderAt(e.target.value)}
                            className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                        />
                    </div>

                    {/* Recurrence */}
                    <div className="mb-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                        <SideSectionTitle label="Recurrence" dotColor="bg-violet-500" />
                        <select
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                            className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] cursor-pointer hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                        >
                            <option value="NONE">None</option>
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                        </select>
                    </div>

                    <div className="border-t border-[--ks-border] mt-auto pt-4">
                        <p className="text-[11px] text-[--ks-text-muted] text-center">New task · {columnTitle}</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
}