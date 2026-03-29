'use client';

import { useState, useTransition } from 'react';
import Modal from '../../../components/ui/Modal';
import {
    addComment,
    updateTaskDescription,
    assignTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addTaskAttachment,
    deleteTaskAttachment,
} from '../../../actions/detailActions';
import { updateTask } from '../../../actions/taskActions';
import { formatDistanceToNow } from 'date-fns';
import { BoardWithColumnsAndTasks } from '../../../types/board';
import { BoardRole } from '../../../generated/prisma/enums';

type TaskType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number] & {
    column?: { title: string } | null;
};
type MemberType = BoardWithColumnsAndTasks['members'][number];
type CommentType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number]['comments'][number];
type SubtaskType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number]['subtasks'][number];
type AttachmentType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number]['attachments'][number];

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: TaskType;
    boardId: string;
    members: MemberType[];
    currentUserEmail?: string | null;
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

// Priority badge shown when the user is not a Leader
function PriorityBadge({ priority }: { priority: string }) {
    const cfg: Record<string, { label: string; cls: string }> = {
        URGENT: { label: 'Urgent', cls: 'bg-red-100 text-red-700 border-red-200' },
        HIGH: { label: 'High', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
        MEDIUM: { label: 'Medium', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
        LOW: { label: 'Low', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
        NONE: { label: 'None', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    };
    const { label, cls } = cfg[priority] ?? cfg.NONE;
    return (
        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
            {label}
        </span>
    );
}

export default function TaskDetailsModal({ isOpen, onClose, task, boardId, members, currentUserEmail }: TaskDetailsModalProps) {
    const [description, setDescription] = useState(task.description || '');
    const [saved, setSaved] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isPending, startTransition] = useTransition();
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [priority, setPriority] = useState<string>(task.priority ?? 'NONE');
    const [tagsInput, setTagsInput] = useState<string>((task.tags ?? []).join(', '));
    const [dueAt, setDueAt] = useState<string>(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '');
    const [reminderAt, setReminderAt] = useState<string>(task.reminderAt ? new Date(task.reminderAt).toISOString().slice(0, 16) : '');
    const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>((task.recurrence as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY') ?? 'NONE');
    const [subtaskTitle, setSubtaskTitle] = useState('');
    const [subtasks, setSubtasks] = useState<SubtaskType[]>(task.subtasks ?? []);
    const [attachmentName, setAttachmentName] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [attachments, setAttachments] = useState<AttachmentType[]>(task.attachments ?? []);

    // Detect @word at the end of the current comment text
    const handleCommentChange = (val: string) => {
        setCommentText(val);
        const match = val.match(/@(\S*)$/);
        setMentionQuery(match ? match[1] : null);
    };

    // Filter members by name or email
    const mentionSuggestions = mentionQuery !== null
        ? members.filter(m =>
            m.user.email?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            m.user.name?.toLowerCase().includes(mentionQuery.toLowerCase())
        )
        : [];

    const insertMention = (email: string) => {
        const newText = commentText.replace(/@(\S*)$/, `@${email} `);
        setCommentText(newText);
        setMentionQuery(null);
    };

    // Render comment text with highlighted @mentions
    const renderCommentText = (text: string) => {
        const parts = text.split(/(@\S+)/g);
        return parts.map((part, i) =>
            part.startsWith('@') && part.length > 1
                ? <span key={i} className="inline-flex items-center text-blue-600 font-semibold bg-blue-50 rounded px-1 text-[12px]">{part}</span>
                : <span key={i}>{part}</span>
        );
    };

    const cat = categoryConfig[task.category] ?? { label: task.category, color: 'bg-gray-100 text-gray-600' };
    const assignee = members.find(m => m.user.id === task.assigneeId);
    const isLeader = members.some(
        (m) => m.user.email === currentUserEmail && m.role === BoardRole.LEADER
    );

    const handleDescriptionSave = () => {
        if (description !== task.description) {
            startTransition(async () => {
                await updateTaskDescription(task.id, boardId, description);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            });
        }
    };

    const handleAddComment = () => {
        if (!commentText.trim()) return;
        startTransition(async () => {
            await addComment(task.id, boardId, commentText);
            setCommentText('');
        });
    };

    const handleAssign = (userId: string) => {
        startTransition(async () => { await assignTask(task.id, boardId, userId); });
    };

    const handlePriorityChange = (newPriority: string) => {
        setPriority(newPriority);
        startTransition(async () => {
            await updateTask(task.id, boardId, task.title, task.category, newPriority, undefined, undefined, undefined, undefined);
        });
    };

    const handleTagsSave = () => {
        const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');
        startTransition(async () => {
            await updateTask(task.id, boardId, task.title, task.category, undefined, tags, undefined, undefined, undefined);
        });
    };

    const handleDueSave = () => {
        startTransition(async () => {
            await updateTask(task.id, boardId, task.title, task.category, undefined, undefined, dueAt || null, undefined, undefined);
        });
    };

    const handleReminderSave = () => {
        startTransition(async () => {
            await updateTask(task.id, boardId, task.title, task.category, undefined, undefined, undefined, reminderAt || null, undefined);
        });
    };

    const handleRecurrenceChange = (next: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
        setRecurrence(next);
        startTransition(async () => {
            await updateTask(task.id, boardId, task.title, task.category, undefined, undefined, undefined, undefined, next);
        });
    };

    const handleAddSubtask = () => {
        if (!subtaskTitle.trim()) return;
        startTransition(async () => {
            const result = await addSubtask(task.id, boardId, subtaskTitle);
            if (result.success && result.subtask) {
                setSubtasks((prev) => [...prev, result.subtask]);
                setSubtaskTitle('');
            }
        });
    };

    const handleToggleSubtask = (subtaskId: string, done: boolean) => {
        setSubtasks((prev) => prev.map((s) => s.id === subtaskId ? { ...s, done } : s));
        startTransition(async () => {
            await toggleSubtask(subtaskId, boardId, done);
        });
    };

    const handleDeleteSubtask = (subtaskId: string) => {
        setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
        startTransition(async () => {
            await deleteSubtask(subtaskId, boardId);
        });
    };

    const handleAddAttachment = () => {
        if (!attachmentName.trim() || !attachmentUrl.trim()) return;
        startTransition(async () => {
            const result = await addTaskAttachment(task.id, boardId, attachmentName, attachmentUrl);
            if (result.success && result.attachment) {
                setAttachments((prev) => [result.attachment, ...prev]);
                setAttachmentName('');
                setAttachmentUrl('');
            }
        });
    };

    const handleDeleteAttachment = (attachmentId: string) => {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        startTransition(async () => {
            await deleteTaskAttachment(attachmentId, boardId);
        });
    };

    const doneSubtasks = subtasks.filter((s) => s.done).length;
    const subtaskProgress = subtasks.length > 0 ? Math.round((doneSubtasks / subtasks.length) * 100) : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl">
            <div className="flex flex-col md:flex-row h-[82vh]">

                {/* ── LEFT: Main content ───────────────────────────────── */}
                <div className="flex-1 flex flex-col min-h-0 p-7 pr-6">

                    {/* Breadcrumb + title */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                            {task.column?.title && (
                                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                    {task.column.title}
                                </span>
                            )}
                            {task.column?.title && <span className="text-gray-300 text-xs">›</span>}
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>
                                {cat.label}
                            </span>
                        </div>
                        <h2 className="text-[22px] font-bold text-gray-900 leading-snug">{task.title}</h2>
                    </div>

                    {/* Description */}
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</h3>
                            <span className={`text-[11px] transition-opacity duration-300 ${saved ? 'text-green-500 opacity-100' : 'opacity-0'}`}>
                                ✓ Saved
                            </span>
                        </div>
                        <textarea
                            data-tour="task-description-field"
                            className={`w-full h-28 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 resize-none transition-all ${isLeader
                                ? 'focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent cursor-text'
                                : 'opacity-60 cursor-not-allowed'
                                }`}
                            placeholder={isLeader ? 'Add a description…' : 'Only Leaders can edit the description.'}
                            value={description}
                            onChange={(e) => isLeader && setDescription(e.target.value)}
                            onBlur={isLeader ? handleDescriptionSave : undefined}
                            readOnly={!isLeader}
                        />
                    </div>

                    {/* Subtasks */}
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Checklist</h3>
                            <span className="text-[11px] text-gray-500">{doneSubtasks}/{subtasks.length} done</span>
                        </div>

                        {subtasks.length > 0 && (
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${subtaskProgress}%` }} />
                            </div>
                        )}

                        <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-1">
                            {subtasks.length === 0 && (
                                <p className="text-xs text-gray-400">No subtasks yet.</p>
                            )}
                            {subtasks.map((sub) => (
                                <div key={sub.id} className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={sub.done}
                                        onChange={(e) => handleToggleSubtask(sub.id, e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className={`text-sm flex-1 ${sub.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                        {sub.title}
                                    </span>
                                    {isLeader && (
                                        <button
                                            onClick={() => handleDeleteSubtask(sub.id)}
                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                            aria-label="Delete subtask"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {isLeader && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={subtaskTitle}
                                    onChange={(e) => setSubtaskTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                    placeholder="Add subtask..."
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                                />
                                <button
                                    onClick={handleAddSubtask}
                                    className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="mb-5">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attachments</h3>

                        <div className="space-y-2 mb-3 max-h-28 overflow-y-auto pr-1">
                            {attachments.length === 0 && (
                                <p className="text-xs text-gray-400">No attachments yet.</p>
                            )}
                            {attachments.map((a) => (
                                <div key={a.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                    <a
                                        href={a.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-blue-600 hover:underline truncate flex-1"
                                    >
                                        {a.name}
                                    </a>
                                    {isLeader && (
                                        <button
                                            onClick={() => handleDeleteAttachment(a.id)}
                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                            aria-label="Delete attachment"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {isLeader && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={attachmentName}
                                    onChange={(e) => setAttachmentName(e.target.value)}
                                    placeholder="Attachment name"
                                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={attachmentUrl}
                                        onChange={(e) => setAttachmentUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddAttachment()}
                                        placeholder="https://..."
                                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                                    />
                                    <button
                                        onClick={handleAddAttachment}
                                        className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Activity */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity</h3>

                        {/* Comment list */}
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-gray-50 rounded-xl p-3">
                            {(!task.comments || task.comments.length === 0) && (
                                <div className="flex flex-col items-center justify-center h-full py-6 gap-1">
                                    <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <p className="text-gray-400 text-sm">No activity yet. Start the conversation.</p>
                                </div>
                            )}
                            {task.comments?.map((comment: CommentType) => (
                                <div key={comment.id} className="flex gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
                                        {comment.user.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-xs font-semibold text-gray-900">{comment.user.name}</span>
                                            <span className="text-[11px] text-gray-400">{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed">{renderCommentText(comment.text)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Comment input */}
                        <div className="relative flex items-center gap-2.5">
                            {/* @mention dropdown */}
                            {mentionQuery !== null && mentionSuggestions.length > 0 && (
                                <div className="absolute bottom-full mb-1.5 left-9 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <div className="px-3 py-1.5 border-b border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mention a member</span>
                                    </div>
                                    {mentionSuggestions.map(m => (
                                        <button
                                            key={m.user.id}
                                            onMouseDown={(e) => { e.preventDefault(); insertMention(m.user.email!); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                                {m.user.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{m.user.name}</p>
                                                <p className="text-[11px] text-gray-400 truncate">{m.user.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="w-7 h-7 rounded-full bg-linear-to-br from-violet-400 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                                {currentUserEmail?.[0]?.toUpperCase() || 'M'}
                            </div>
                            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                <input
                                    type="text"
                                    data-tour="task-comment-input"
                                    className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                                    placeholder="Write a comment… type @ to mention"
                                    value={commentText}
                                    onChange={(e) => handleCommentChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') { setMentionQuery(null); return; }
                                        if (e.key === 'Enter' && mentionQuery === null) handleAddComment();
                                    }}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={isPending || !commentText.trim()}
                                    className="shrink-0 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Sidebar ───────────────────────────────────── */}
                <div className="w-full md:w-60 shrink-0 flex flex-col gap-1 bg-gray-50 border-l border-gray-100 p-5 rounded-r-2xl">

                    {/* Assignee */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assignee</p>
                        {assignee ? (
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[11px] font-bold text-white">
                                    {assignee.user.name?.[0]?.toUpperCase() ?? 'U'}
                                </div>
                                <span className="text-sm font-medium text-gray-800">{assignee.user.name || assignee.user.email}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mb-2 text-gray-400">
                                <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-xs">?</div>
                                <span className="text-sm">Unassigned</span>
                            </div>
                        )}
                        {isLeader ? (
                            <select
                                data-tour="task-assignee-field"
                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                                value={task.assigneeId || ''}
                                onChange={(e) => handleAssign(e.target.value)}
                            >
                                <option value="">Unassigned</option>
                                {members.map((m: MemberType) => (
                                    <option key={m.user.id} value={m.user.id}>
                                        {m.user.name || m.user.email}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-xs text-gray-400 italic mt-1">Only Leaders can reassign tasks.</p>
                        )}
                    </div>

                    {/* Priority */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Priority</p>
                        {isLeader ? (
                            <select
                                data-tour="task-priority-field"
                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                                value={priority}
                                onChange={(e) => handlePriorityChange(e.target.value)}
                            >
                                <option value="URGENT">Urgent</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                                <option value="NONE">None</option>
                            </select>
                        ) : (
                            <PriorityBadge priority={priority} />
                        )}
                    </div>

                    {/* Category (read-only badge) */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Category</p>
                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${cat.color}`}>
                            {cat.label}
                        </span>
                    </div>

                    {/* Tags */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tags</p>
                        {isLeader ? (
                            <>
                                <input
                                    type="text"
                                    data-tour="task-tags-field"
                                    className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                                    placeholder="Frontend, UI…"
                                    value={tagsInput}
                                    onChange={(e) => setTagsInput(e.target.value)}
                                    onBlur={handleTagsSave}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTagsSave()}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Comma separated · blur to save</p>
                            </>
                        ) : (
                            <div className="flex flex-wrap gap-1">
                                {(task.tags ?? []).length === 0
                                    ? <span className="text-xs text-gray-400 italic">No tags</span>
                                    : (task.tags ?? []).map((tag, i) => (
                                        <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded border border-gray-200">#{tag}</span>
                                    ))
                                }
                            </div>
                        )}
                    </div>

                    {/* Due date */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Due Date</p>
                        {isLeader ? (
                            <input
                                type="datetime-local"
                                value={dueAt}
                                onChange={(e) => setDueAt(e.target.value)}
                                onBlur={handleDueSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleDueSave()}
                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                            />
                        ) : (
                            <span className="text-xs text-gray-600">{task.dueAt ? new Date(task.dueAt).toLocaleString() : 'No due date'}</span>
                        )}
                    </div>

                    {/* Reminder */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reminder</p>
                        {isLeader ? (
                            <input
                                type="datetime-local"
                                value={reminderAt}
                                onChange={(e) => setReminderAt(e.target.value)}
                                onBlur={handleReminderSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleReminderSave()}
                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                            />
                        ) : (
                            <span className="text-xs text-gray-600">{task.reminderAt ? new Date(task.reminderAt).toLocaleString() : 'No reminder'}</span>
                        )}
                    </div>

                    {/* Recurrence */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Recurrence</p>
                        {isLeader ? (
                            <select
                                value={recurrence}
                                onChange={(e) => handleRecurrenceChange(e.target.value as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                            >
                                <option value="NONE">None</option>
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                        ) : (
                            <span className="text-xs text-gray-600">{task.recurrence ?? 'NONE'}</span>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-1" />

                    {/* Task ID */}
                    <div className="mt-auto pt-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Task ID</p>
                        <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">
                            #{task.id.slice(-8).toUpperCase()}
                        </code>
                    </div>
                </div>
            </div>
        </Modal>
    );
}   