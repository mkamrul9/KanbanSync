'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
    saveTaskAsTemplate,
    addTaskDependency,
    removeTaskDependency,
    addTaskTimeEntry,
    deleteTaskTimeEntry,
} from '../../../actions/detailActions';
import { archiveTask, updateTask } from '../../../actions/taskActions';
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
type ActivityType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number]['activities'][number];
type DependencyType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number]['blocking'][number];
type BlockedByType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number]['blockedBy'][number];
type TimeEntryType = BoardWithColumnsAndTasks['columns'][number]['tasks'][number]['timeEntries'][number];

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: TaskType;
    boardId: string;
    members: MemberType[];
    allTasks: TaskType[];
    currentUserEmail?: string | null;
}

/**
 * Interactive modal for viewing and editing a specific task's details.
 * 
 * Features:
 * - Real-time activity feed & comments.
 * - Subtask checklists.
 * - Time tracking entries.
 * - Dependency graph (blocked by / blocking).
 * - Attachment management.
 * - In-place editing of title, description, category, and priority (gated by role).
 * 
 * @param {TaskDetailsModalProps} props - The modal props.
 */

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

const priorityConfig: Record<string, { label: string; sign: string; cls: string }> = {
    URGENT: { label: 'Urgent', sign: '!!', cls: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30' },
    HIGH: { label: 'High', sign: '!', cls: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30' },
    MEDIUM: { label: 'Medium', sign: '~', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30' },
    LOW: { label: 'Low', sign: 'v', cls: 'bg-[--ks-info-subtle] text-[--ks-info] border-[--ks-info]/30' },
    NONE: { label: 'None', sign: '-', cls: 'bg-[--ks-bg-card] text-[--ks-text-muted] border-[--ks-border]' },
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

// Priority badge shown when the user is not a Leader
function PriorityBadge({ priority }: { priority: string }) {
    const { label, cls, sign } = priorityConfig[priority] ?? priorityConfig.NONE;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
            <span className="font-bold">{sign}</span>
            <span>{label}</span>
        </span>
    );
}

function SideSectionTitle({ label, dotColor }: { label: string; dotColor: string }) {
    return (
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.16em] mb-2 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {label}
        </p>
    );
}

export default function TaskDetailsModal({ isOpen, onClose, task, boardId, members, allTasks, currentUserEmail }: TaskDetailsModalProps) {
    const [timerBoot] = useState(() => {
        if (typeof window === 'undefined') {
            return {
                timerSeconds: 0,
                timerRunning: false,
                lastActivityAt: 0,
                timerAdjustmentMinutes: '0',
                timerSessionNote: '',
            };
        }
        try {
            const raw = localStorage.getItem(`ks-task-timer-${task.id}`);
            if (!raw) {
                return {
                    timerSeconds: 0,
                    timerRunning: false,
                    lastActivityAt: 0,
                    timerAdjustmentMinutes: '0',
                    timerSessionNote: '',
                };
            }
            const parsed = JSON.parse(raw) as {
                timerSeconds?: number;
                timerRunning?: boolean;
                lastActivityAt?: number;
                timerAdjustmentMinutes?: string;
                timerSessionNote?: string;
            };
            return {
                timerSeconds: typeof parsed.timerSeconds === 'number' ? parsed.timerSeconds : 0,
                timerRunning: typeof parsed.timerRunning === 'boolean' ? parsed.timerRunning : false,
                lastActivityAt: typeof parsed.lastActivityAt === 'number' ? parsed.lastActivityAt : 0,
                timerAdjustmentMinutes: typeof parsed.timerAdjustmentMinutes === 'string' ? parsed.timerAdjustmentMinutes : '0',
                timerSessionNote: typeof parsed.timerSessionNote === 'string' ? parsed.timerSessionNote : '',
            };
        } catch {
            return {
                timerSeconds: 0,
                timerRunning: false,
                lastActivityAt: 0,
                timerAdjustmentMinutes: '0',
                timerSessionNote: '',
            };
        }
    });

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
    const [templateName, setTemplateName] = useState(`${task.title} Template`);
    const [templateSaved, setTemplateSaved] = useState<string | null>(null);
    const [blocking, setBlocking] = useState<DependencyType[]>(task.blocking ?? []);
    const [blockedBy] = useState<BlockedByType[]>(task.blockedBy ?? []);
    const [dependsOnTaskId, setDependsOnTaskId] = useState('');
    const [timeEntries, setTimeEntries] = useState<TimeEntryType[]>(task.timeEntries ?? []);
    const [timeMinutes, setTimeMinutes] = useState('');
    const [manualTimeNote, setManualTimeNote] = useState('');
    const [timerSessionNote, setTimerSessionNote] = useState(timerBoot.timerSessionNote);
    const [timerSeconds, setTimerSeconds] = useState(timerBoot.timerSeconds);
    const [timerRunning, setTimerRunning] = useState(timerBoot.timerRunning);
    const [lastActivityAt, setLastActivityAt] = useState<number>(timerBoot.lastActivityAt);
    const lastActivityRef = useRef(timerBoot.lastActivityAt);
    const [timerAdjustmentMinutes, setTimerAdjustmentMinutes] = useState(timerBoot.timerAdjustmentMinutes);
    const [timerStatusMsg, setTimerStatusMsg] = useState<string | null>(null);
    const [gitLinkType, setGitLinkType] = useState<'PR' | 'Commit' | 'Branch'>('PR');
    const [gitLinkUrl, setGitLinkUrl] = useState('');
    const [archiveError, setArchiveError] = useState<string | null>(null);
    const [aiSubtasks, setAiSubtasks] = useState<string[]>([]);
    const [aiRiskSummary, setAiRiskSummary] = useState<string>('');
    const [aiPrioritySuggestion, setAiPrioritySuggestion] = useState<string>('');
    const [aiStandupDraft, setAiStandupDraft] = useState<string>('');
    const [aiThreadSummary, setAiThreadSummary] = useState<string>('');
    const [aiActionItems, setAiActionItems] = useState<string[]>([]);

    const priorityOptions = [
        { value: 'URGENT', label: 'Urgent' },
        { value: 'HIGH', label: 'High' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'LOW', label: 'Low' },
        { value: 'NONE', label: 'None' },
    ];

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
                ? <span key={i} className="inline-flex items-center text-[--ks-primary] font-semibold bg-[--ks-primary-subtle] rounded px-1 text-[12px]">{part}</span>
                : <span key={i}>{part}</span>
        );
    };

    const cat = categoryConfig[task.category] ?? { label: task.category, color: 'bg-[--ks-bg-card] text-[--ks-text-secondary]' };
    const assignee = members.find(m => m.user.id === task.assigneeId);
    const currentMember = members.find((m) => m.user.email === currentUserEmail);
    const isLeader = members.some(
        (m) => m.user.email === currentUserEmail && m.role === BoardRole.LEADER
    );
    const canManageArchive = currentMember?.role === BoardRole.LEADER || currentMember?.role === BoardRole.REVIEWER;

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

    const gitLinks = attachments.filter((a) =>
        /github|gitlab|bitbucket|\/pull\/|\/merge_requests\/|\/commit\//i.test(a.url) ||
        a.name.startsWith('Git:')
    );

    const handleAddGitLink = () => {
        if (!gitLinkUrl.trim()) return;
        startTransition(async () => {
            const result = await addTaskAttachment(task.id, boardId, `Git: ${gitLinkType}`, gitLinkUrl.trim());
            if (result.success && result.attachment) {
                setAttachments((prev) => [result.attachment, ...prev]);
                setGitLinkUrl('');
            }
        });
    };

    const doneSubtasks = subtasks.filter((s) => s.done).length;
    const subtaskProgress = subtasks.length > 0 ? Math.round((doneSubtasks / subtasks.length) * 100) : 0;

    const timeline = [
        ...(task.activities ?? []).map((a) => ({ kind: 'activity' as const, id: `activity-${a.id}`, createdAt: new Date(a.createdAt), value: a })),
        ...(task.comments ?? []).map((c) => ({ kind: 'comment' as const, id: `comment-${c.id}`, createdAt: new Date(c.createdAt), value: c })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const handleSaveTemplate = () => {
        if (!templateName.trim()) return;
        startTransition(async () => {
            const result = await saveTaskAsTemplate(task.id, boardId, templateName);
            setTemplateSaved(result.success ? 'Template saved' : result.error ?? 'Failed to save');
            setTimeout(() => setTemplateSaved(null), 2200);
        });
    };

    const availableDependencyTargets = allTasks.filter(
        (candidate) =>
            candidate.id !== task.id &&
            !blocking.some((dep) => dep.dependsOnTaskId === candidate.id)
    );

    const totalTrackedMinutes = timeEntries.reduce((sum, entry) => sum + entry.minutes, 0);

    const handleAddDependency = () => {
        if (!dependsOnTaskId) return;
        startTransition(async () => {
            const result = await addTaskDependency(task.id, dependsOnTaskId, boardId);
            if (result.success && result.dependency) {
                setBlocking((prev) => [...prev, result.dependency]);
                setDependsOnTaskId('');
            }
        });
    };

    const handleRemoveDependency = (dependencyId: string) => {
        setBlocking((prev) => prev.filter((dep) => dep.id !== dependencyId));
        startTransition(async () => {
            await removeTaskDependency(dependencyId, boardId);
        });
    };

    const handleAddTimeEntry = () => {
        const minutes = Number(timeMinutes);
        if (!Number.isFinite(minutes) || minutes <= 0) return;
        startTransition(async () => {
            const result = await addTaskTimeEntry(task.id, boardId, minutes, manualTimeNote);
            if (result.success && result.timeEntry) {
                setTimeEntries((prev) => [result.timeEntry, ...prev]);
                setTimeMinutes('');
                setManualTimeNote('');
            }
        });
    };

    const handleDeleteTimeEntry = (timeEntryId: string) => {
        setTimeEntries((prev) => prev.filter((entry) => entry.id !== timeEntryId));
        startTransition(async () => {
            await deleteTaskTimeEntry(timeEntryId, boardId);
        });
    };

    const timerStorageKey = `ks-task-timer-${task.id}`;

    useEffect(() => {
        try {
            localStorage.setItem(timerStorageKey, JSON.stringify({
                timerSeconds,
                timerRunning,
                lastActivityAt,
                timerAdjustmentMinutes,
                timerSessionNote,
            }));
        } catch {
            // Ignore persistence errors.
        }
    }, [timerStorageKey, timerSeconds, timerRunning, lastActivityAt, timerAdjustmentMinutes, timerSessionNote]);

    useEffect(() => {
        lastActivityRef.current = lastActivityAt;
    }, [lastActivityAt]);

    useEffect(() => {
        if (!timerRunning) return;

        const onActivity = () => {
            const now = Date.now();
            setLastActivityAt(now);
            lastActivityRef.current = now;
        };
        const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'mousedown', 'scroll'];
        activityEvents.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

        const tick = window.setInterval(() => {
            setTimerSeconds((prev) => prev + 1);

            const idleForMs = Date.now() - (lastActivityRef.current || Date.now());
            if (idleForMs >= 5 * 60 * 1000) {
                setTimerRunning(false);
                setTimerStatusMsg('Timer auto-paused after 5 minutes of inactivity.');
            }
        }, 1000);

        return () => {
            window.clearInterval(tick);
            activityEvents.forEach((event) => window.removeEventListener(event, onActivity));
        };
    }, [timerRunning]);

    const formatTimer = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return [hrs, mins, secs].map((n) => n.toString().padStart(2, '0')).join(':');
    };

    const handleStartTimer = () => {
        setTimerStatusMsg(null);
        const now = Date.now();
        setLastActivityAt(now);
        lastActivityRef.current = now;
        setTimerRunning(true);
    };

    const handlePauseTimer = () => {
        setTimerRunning(false);
        setTimerStatusMsg('Timer paused.');
    };

    const handleStopAndLogTimer = () => {
        setTimerRunning(false);

        const baseMinutes = Math.max(1, Math.round(timerSeconds / 60));
        const adjustment = Number(timerAdjustmentMinutes || '0');
        const safeAdjustment = Number.isFinite(adjustment) ? adjustment : 0;
        const totalMinutes = Math.max(1, baseMinutes + safeAdjustment);

        startTransition(async () => {
            const timerNote = (timerSessionNote?.trim() ? `Timer session: ${timerSessionNote.trim()}` : 'Timer session');
            const result = await addTaskTimeEntry(task.id, boardId, totalMinutes, timerNote);
            if (result.success && result.timeEntry) {
                setTimeEntries((prev) => [result.timeEntry, ...prev]);
                setTimerSeconds(0);
                setTimerAdjustmentMinutes('0');
                setTimerSessionNote('');
                setLastActivityAt(0);
                lastActivityRef.current = 0;
                localStorage.removeItem(timerStorageKey);
                setTimerStatusMsg(`Logged ${totalMinutes} min from timer.`);
            } else {
                setTimerStatusMsg('Failed to log timer session.');
            }
        });
    };

    const handleApplyAll = () => {
        handleDescriptionSave();
        handleTagsSave();
        handleDueSave();
        handleReminderSave();
    };

    const handleSaveAndClose = () => {
        handleApplyAll();
        onClose();
    };

    const handleArchiveAndClose = () => {
        setArchiveError(null);
        startTransition(async () => {
            const result = await archiveTask(task.id, boardId);
            if (!result?.success) {
                setArchiveError(result?.error ?? 'Failed to archive task');
                return;
            }
            onClose();
        });
    };

    const runAiAssist = () => {
        const text = `${task.title} ${description} ${(task.tags ?? []).join(' ')}`.toLowerCase();
        const baseSubtasks = [
            'Define acceptance criteria',
            'Implement core changes',
            'Add or update tests',
            'Review and prepare release notes',
        ];

        const keywordSubtasks: string[] = [];
        if (/bug|fix|error|crash/.test(text)) keywordSubtasks.push('Reproduce issue and confirm root cause');
        if (/api|backend|server|db|prisma/.test(text)) keywordSubtasks.push('Validate API/database behavior and edge cases');
        if (/ui|ux|modal|style|design|frontend/.test(text)) keywordSubtasks.push('Verify responsive UI behavior and visual consistency');
        if (/notify|email|reminder/.test(text)) keywordSubtasks.push('Validate notification delivery and fallback behavior');

        const candidateSubtasks = [...keywordSubtasks, ...baseSubtasks]
            .filter((value, index, array) => array.indexOf(value) === index)
            .slice(0, 6);

        const overdue = dueAt ? new Date(dueAt).getTime() < Date.now() : false;
        const hasDependencies = blocking.length > 0;
        const riskSignals: string[] = [];
        if (overdue) riskSignals.push('Due date has already passed.');
        if (hasDependencies) riskSignals.push(`${blocking.length} dependency blocker${blocking.length === 1 ? '' : 's'} detected.`);
        if ((task.comments ?? []).length > 8) riskSignals.push('High discussion volume may indicate unclear requirements.');
        if ((task.attachments ?? []).length === 0) riskSignals.push('No supporting links/attachments captured yet.');

        let suggestedPriority = 'MEDIUM';
        if (overdue || /urgent|blocker|critical|prod/.test(text)) suggestedPriority = 'URGENT';
        else if (hasDependencies || /high|important|security/.test(text)) suggestedPriority = 'HIGH';
        else if (/low|minor|nice-to-have/.test(text)) suggestedPriority = 'LOW';

        const standup = [
            `Yesterday: progressed \"${task.title}\" and aligned context from activity/comments.`,
            `Today: ${candidateSubtasks.slice(0, 2).join(' + ')}.`,
            `Blockers: ${hasDependencies ? blocking.map((b) => b.dependsOn.title).slice(0, 2).join(', ') : 'None currently flagged.'}`,
        ].join(' ');

        const latestComments = [...(task.comments ?? [])]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 8);

        const unresolvedSignals = latestComments.filter((comment) => /\?|block|stuck|waiting|need|todo|follow up/i.test(comment.text));
        const decisionSignals = latestComments.filter((comment) => /decided|approved|merged|done|shipped|fixed/i.test(comment.text));

        const threadSummary = latestComments.length === 0
            ? 'No comment thread yet. Use comments to capture decisions and blockers.'
            : `Recent thread activity: ${latestComments.length} comment${latestComments.length === 1 ? '' : 's'} reviewed, ${decisionSignals.length} decision/update signal${decisionSignals.length === 1 ? '' : 's'}, ${unresolvedSignals.length} unresolved question/blocker signal${unresolvedSignals.length === 1 ? '' : 's'}.`;

        const actionCandidates = latestComments
            .filter((comment) => /\?|todo|action|follow up|next|please|need to|should/i.test(comment.text))
            .map((comment) => comment.text.trim())
            .filter(Boolean)
            .slice(0, 4)
            .map((text, index) => {
                const normalized = text.replace(/\s+/g, ' ').slice(0, 110);
                return `Action ${index + 1}: ${normalized}${normalized.endsWith('.') ? '' : '.'}`;
            });

        const fallbackActions = [
            `Action 1: Clarify open points in the latest discussion for "${task.title}".`,
            'Action 2: Confirm owner and due date for the next deliverable.',
        ];

        setAiSubtasks(candidateSubtasks);
        setAiPrioritySuggestion(suggestedPriority);
        setAiRiskSummary(riskSignals.length > 0 ? riskSignals.join(' ') : 'No immediate risk flags detected.');
        setAiStandupDraft(standup);
        setAiThreadSummary(threadSummary);
        setAiActionItems(actionCandidates.length > 0 ? actionCandidates : fallbackActions);
    };

    const handleApplyAiSubtasks = () => {
        if (aiSubtasks.length === 0) return;

        startTransition(async () => {
            const created: SubtaskType[] = [];
            for (const title of aiSubtasks) {
                const result = await addSubtask(task.id, boardId, title);
                if (result.success && result.subtask) created.push(result.subtask);
            }
            if (created.length > 0) {
                setSubtasks((prev) => [...prev, ...created]);
                setAiSubtasks([]);
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-7xl">
            <div className="flex flex-col md:flex-row h-[92vh] max-h-[92vh] overflow-hidden app-bg">

                {/* ── LEFT: Main content ───────────────────────────────── */}
                <div className="flex-1 flex flex-col min-h-0 px-7 pb-10 pt-4 overflow-y-auto">

                    {/* Breadcrumb + title */}
                    <div className="sticky top-0 z-20 -mx-7 px-7 pt-3 pb-4 mb-5 bg-[--ks-bg-elevated]/90 backdrop-blur-md border-b border-[--ks-border]">
                        <div className="flex items-center gap-2 mb-2">
                            {task.column?.title && (
                                <span className="text-xs text-[--ks-text-muted] font-medium uppercase tracking-wide">
                                    {task.column.title}
                                </span>
                            )}
                            {task.column?.title && <span className="text-[--ks-text-muted] text-xs">›</span>}
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>
                                {cat.label}
                            </span>
                        </div>
                        <h2 className="text-[24px] font-bold text-[--ks-text-primary] leading-tight">{task.title}</h2>
                        {isLeader && (
                            <div data-tour="task-template-save" className="mt-3 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Template name"
                                    className="w-full max-w-xs px-3 py-1.5 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-xs text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] outline-none"
                                />
                                <button
                                    onClick={handleSaveTemplate}
                                    disabled={isPending || !templateName.trim()}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[--ks-primary] text-white hover:bg-[--ks-primary-hover] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Save as Template
                                </button>
                                {templateSaved && <span className="text-[11px] text-[--ks-text-muted]">{templateSaved}</span>}
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div data-tour="task-checklist" className="mb-4 app-surface rounded-2xl border border-[--ks-border] p-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-xs font-bold text-[--ks-text-secondary] uppercase tracking-[0.16em] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[--ks-primary]" />Description</h3>
                            <span className={`text-[11px] transition-opacity duration-300 ${saved ? 'text-green-500 opacity-100' : 'opacity-0'}`}>
                                ✓ Saved
                            </span>
                        </div>
                        <textarea
                            data-tour="task-description-field"
                            className={`w-full h-32 px-3 py-2.5 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] resize-none transition-all ${isLeader
                                ? 'focus:ring-2 focus:ring-[--ks-primary] focus:bg-[--ks-bg-card] focus:border-transparent cursor-text'
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
                    <div data-tour="task-attachments" className="mb-4 app-surface rounded-2xl border border-[--ks-border] p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-[--ks-text-secondary] uppercase tracking-[0.16em] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[--ks-accent]" />Checklist</h3>
                            <span className="text-[11px] text-[--ks-text-muted]">{doneSubtasks}/{subtasks.length} done</span>
                        </div>

                        {subtasks.length > 0 && (
                            <div className="w-full h-2 bg-[--ks-bg-overlay] rounded-full overflow-hidden mb-3">
                                <div className="h-full bg-[--ks-primary] transition-all" style={{ width: `${subtaskProgress}%` }} />
                            </div>
                        )}

                        <div className="space-y-2 mb-3 max-h-52 min-h-24 overflow-y-auto pr-1.5">
                            {subtasks.length === 0 && (
                                <p className="text-xs text-[--ks-text-muted]">No subtasks yet.</p>
                            )}
                            {subtasks.map((sub) => (
                                <div key={sub.id} className="flex items-center gap-2.5 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl px-3 py-2.5">
                                    <input
                                        type="checkbox"
                                        checked={sub.done}
                                        onChange={(e) => handleToggleSubtask(sub.id, e.target.checked)}
                                        className="w-4 h-4 rounded border-[--ks-border] text-[--ks-primary] focus:ring-[--ks-primary]"
                                    />
                                    <span className={`text-sm flex-1 ${sub.done ? 'text-[--ks-text-muted] line-through' : 'text-[--ks-text-primary]'}`}>
                                        {sub.title}
                                    </span>
                                    {isLeader && (
                                        <button
                                            onClick={() => handleDeleteSubtask(sub.id)}
                                            className="text-[--ks-text-muted] hover:text-red-500 transition-colors"
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
                                    className="flex-1 px-3 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                                />
                                <button
                                    onClick={handleAddSubtask}
                                    className="px-3.5 py-2 bg-[--ks-primary] text-white text-xs font-semibold rounded-xl hover:bg-[--ks-primary-hover] transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="mb-4 app-surface rounded-2xl border border-[--ks-border] p-4">
                        <h3 className="text-xs font-bold text-[--ks-text-secondary] uppercase tracking-[0.16em] flex items-center gap-2 mb-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Attachments</h3>

                        <div className="space-y-2 mb-3 max-h-44 min-h-24 overflow-y-auto pr-1.5">
                            {attachments.length === 0 && (
                                <p className="text-xs text-[--ks-text-muted]">No attachments yet.</p>
                            )}
                            {attachments.map((a) => (
                                <div key={a.id} className="flex items-center gap-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl px-3 py-2.5">
                                    <a
                                        href={a.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-[--ks-primary] hover:underline truncate flex-1"
                                    >
                                        {a.name}
                                    </a>
                                    {isLeader && (
                                        <button
                                            onClick={() => handleDeleteAttachment(a.id)}
                                            className="text-[--ks-text-muted] hover:text-red-500 transition-colors"
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
                                    className="px-3 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={attachmentUrl}
                                        onChange={(e) => setAttachmentUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddAttachment()}
                                        placeholder="https://..."
                                        className="flex-1 px-3 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-xl text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                                    />
                                    <button
                                        onClick={handleAddAttachment}
                                        className="px-3.5 py-2 bg-[--ks-primary] text-white text-xs font-semibold rounded-xl hover:bg-[--ks-primary-hover] transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Activity */}
                    <div className="flex flex-col app-surface rounded-2xl border border-[--ks-border] p-4 min-h-96 overflow-hidden pb-4">
                        <h3 className="text-xs font-bold text-[--ks-text-secondary] uppercase tracking-[0.16em] mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Activity</h3>

                        <div className="bg-[--ks-bg-overlay] rounded-2xl border border-[--ks-border] p-3 flex flex-col min-h-76 max-h-96">
                            {/* Comment list */}
                            <div className="overflow-y-auto space-y-3 mb-3 px-2 py-2">
                                {timeline.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full py-12 gap-3 text-center">
                                        <svg className="w-14 h-14 text-[--ks-text-muted]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        <p className="text-[--ks-text-primary] text-lg font-semibold">No activity yet</p>
                                        <p className="text-[--ks-text-muted] text-sm max-w-md">Start the conversation by posting the first comment. Updates, comments, assignments, and checklist changes will appear here.</p>
                                    </div>
                                )}
                                {timeline.map((item) => {
                                    if (item.kind === 'comment') {
                                        const comment = item.value as CommentType;
                                        return (
                                            <div key={item.id} className="flex gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
                                                    {comment.user.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div className="flex-1 bg-[--ks-bg-card] rounded-xl px-3 py-2 shadow-sm border border-[--ks-border]">
                                                    <div className="flex items-baseline gap-2 mb-1">
                                                        <span className="text-xs font-semibold text-[--ks-text-primary]">{comment.user.name}</span>
                                                        <span className="text-[11px] text-[--ks-text-muted]">{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                                                    </div>
                                                    <p className="text-sm text-[--ks-text-primary] leading-relaxed">{renderCommentText(comment.text)}</p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const activity = item.value as ActivityType;
                                    return (
                                        <div key={item.id} className="flex gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-linear-to-br from-[--ks-primary] to-[--ks-accent] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                                                {(activity.actor?.name?.[0] ?? activity.actor?.email?.[0] ?? 'S').toUpperCase()}
                                            </div>
                                            <div className="flex-1 bg-[--ks-bg-card] rounded-xl px-3 py-2 border border-[--ks-border]">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className="text-xs font-semibold text-[--ks-text-primary]">{activity.actor?.name ?? activity.actor?.email ?? 'System'}</span>
                                                    <span className="text-[11px] text-[--ks-text-muted]">{formatDistanceToNow(new Date(activity.createdAt))} ago</span>
                                                </div>
                                                <p className="text-sm text-[--ks-text-secondary]">{activity.message}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Comment input */}
                            <div className="relative flex items-center gap-2.5 bg-[--ks-bg-card] rounded-xl px-2 py-2 border border-[--ks-border] shadow-sm">
                                {/* @mention dropdown */}
                                {mentionQuery !== null && mentionSuggestions.length > 0 && (
                                    <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-[--ks-bg-elevated] border border-[--ks-border] rounded-xl shadow-xl z-50 overflow-hidden">
                                        <div className="px-3 py-1.5 border-b border-[--ks-border]">
                                            <span className="text-[10px] font-bold text-[--ks-text-muted] uppercase tracking-widest">Mention a member</span>
                                        </div>
                                        {mentionSuggestions.map(m => (
                                            <button
                                                key={m.user.id}
                                                onMouseDown={(e) => { e.preventDefault(); insertMention(m.user.email!); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[--ks-bg-overlay] transition-colors text-left"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                                    {m.user.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-[--ks-text-primary] leading-tight truncate">{m.user.name}</p>
                                                    <p className="text-[11px] text-[--ks-text-muted] truncate">{m.user.email}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="w-7 h-7 rounded-full bg-linear-to-br from-violet-400 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                                    {currentUserEmail?.[0]?.toUpperCase() || 'M'}
                                </div>
                                <div className="flex-1 flex items-center gap-2 bg-[--ks-bg-overlay] border border-[--ks-border] rounded-xl px-3 py-2 focus-within:border-[--ks-primary] focus-within:ring-2 focus-within:ring-[--ks-primary]/20 transition-all shadow-xs">
                                    <input
                                        type="text"
                                        data-tour="task-comment-input"
                                        className="flex-1 bg-transparent text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:outline-none"
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
                                         className="shrink-0 px-3 py-1 bg-[--ks-primary] text-white text-xs font-medium rounded-lg hover:bg-[--ks-primary-hover] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                     >
                                         Post
                                     </button>
                                 </div>
                             </div>
                         </div>
                     </div>
                </div>

                {/* ── RIGHT: Sidebar ───────────────────────────────────── */}
                <div className="w-full md:w-80 shrink-0 flex flex-col gap-2 bg-[--ks-bg-elevated] border-l border-[--ks-border] p-5 rounded-r-2xl overflow-y-auto">

                    <p className="text-[10px] font-bold text-[--ks-text-muted] uppercase tracking-[0.18em] mb-1">Task Settings</p>

                    {/* Assignee */}
                    <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <SideSectionTitle label="Assignee" dotColor="bg-emerald-500" />
                        {assignee ? (
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[11px] font-bold text-white">
                                    {assignee.user.name?.[0]?.toUpperCase() ?? 'U'}
                                </div>
                                <span className="text-sm font-medium text-[--ks-text-primary]">{assignee.user.name || assignee.user.email}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mb-2 text-[--ks-text-muted]">
                                <div className="w-7 h-7 rounded-full border-2 border-dashed border-[--ks-border] flex items-center justify-center text-xs">?</div>
                                <span className="text-sm">Unassigned</span>
                            </div>
                        )}
                        {isLeader ? (
                            <select
                                data-tour="task-assignee-field"
                                className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] cursor-pointer hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
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
                            <p className="text-xs text-[--ks-text-muted] italic mt-1">Only Leaders can reassign tasks.</p>
                        )}
                    </div>

                    {/* Priority */}
                    <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                        <SideSectionTitle label="Priority" dotColor="bg-rose-500" />
                        {isLeader ? (
                            <div data-tour="task-priority-field" className="grid grid-cols-2 gap-1.5">
                                {priorityOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handlePriorityChange(opt.value)}
                                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${priority === opt.value
                                            ? 'bg-[--ks-primary] text-white border-[--ks-primary]'
                                            : 'bg-[--ks-bg-card] text-[--ks-text-secondary] border-[--ks-border] hover:border-[--ks-primary] hover:text-[--ks-text-primary]'
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
                        ) : (
                            <div className="flex items-center gap-2">
                                <PriorityBadge priority={priority} />
                                {priority !== 'NONE' && <PriorityIcon priority={priority} />}
                            </div>
                        )}
                    </div>

                    {/* Category (read-only badge) */}
                    <div className="mb-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                        <SideSectionTitle label="Category" dotColor="bg-indigo-500" />
                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${cat.color}`}>
                            {cat.label}
                        </span>
                    </div>

                    {/* Tags */}
                    <div className="mb-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3">
                        <SideSectionTitle label="Tags" dotColor="bg-fuchsia-500" />
                        {isLeader ? (
                            <>
                                <input
                                    type="text"
                                    data-tour="task-tags-field"
                                    className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                                    placeholder="Frontend, UI…"
                                    value={tagsInput}
                                    onChange={(e) => setTagsInput(e.target.value)}
                                    onBlur={handleTagsSave}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTagsSave()}
                                />
                                <p className="text-[10px] text-[--ks-text-muted] mt-1">Comma separated · blur to save</p>
                            </>
                        ) : (
                            <div className="flex flex-wrap gap-1">
                                {(task.tags ?? []).length === 0
                                    ? <span className="text-xs text-[--ks-text-muted] italic">No tags</span>
                                    : (task.tags ?? []).map((tag, i) => (
                                        <span key={i} className="px-1.5 py-0.5 bg-[--ks-bg-card] text-[--ks-text-secondary] text-[10px] rounded border border-[--ks-border]">#{tag}</span>
                                    ))
                                }
                            </div>
                        )}
                    </div>

                    {/* Due date */}
                    <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <SideSectionTitle label="Due Date" dotColor="bg-amber-500" />
                        {isLeader ? (
                            <input
                                type="datetime-local"
                                value={dueAt}
                                onChange={(e) => setDueAt(e.target.value)}
                                onBlur={handleDueSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleDueSave()}
                                className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                            />
                        ) : (
                            <span className="text-xs text-[--ks-text-secondary]">{task.dueAt ? new Date(task.dueAt).toLocaleString() : 'No due date'}</span>
                        )}
                    </div>

                    {/* Reminder */}
                    <div data-tour="task-reminder" className="mb-3 rounded-xl border border-[--ks-primary]/25 bg-[--ks-primary-subtle] p-3">
                        <SideSectionTitle label="Reminder" dotColor="bg-[--ks-primary]" />
                        {isLeader ? (
                            <input
                                type="datetime-local"
                                value={reminderAt}
                                onChange={(e) => setReminderAt(e.target.value)}
                                onBlur={handleReminderSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleReminderSave()}
                                className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                            />
                        ) : (
                            <span className="text-xs text-[--ks-text-secondary]">{task.reminderAt ? new Date(task.reminderAt).toLocaleString() : 'No reminder'}</span>
                        )}
                    </div>

                    {/* Recurrence */}
                    <div data-tour="task-recurrence" className="mb-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                        <SideSectionTitle label="Recurrence" dotColor="bg-violet-500" />
                        {isLeader ? (
                            <select
                                value={recurrence}
                                onChange={(e) => handleRecurrenceChange(e.target.value as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                                className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] cursor-pointer hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                            >
                                <option value="NONE">None</option>
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                        ) : (
                            <span className="text-xs text-[--ks-text-secondary]">{task.recurrence ?? 'NONE'}</span>
                        )}
                    </div>

                    {/* Dependencies */}
                    <div data-tour="task-dependencies" className="mb-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                        <SideSectionTitle label="Dependencies" dotColor="bg-orange-500" />
                        <p className="text-[11px] text-[--ks-text-muted] mb-2">
                            Dependency means this task cannot move forward until its blocker task is completed.
                        </p>

                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {blocking.length === 0 ? (
                                <p className="text-xs text-[--ks-text-muted]">No blockers.</p>
                            ) : (
                                blocking.map((dep) => (
                                    <div key={dep.id} className="flex items-start justify-between gap-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg px-2 py-1.5">
                                        <span className="text-xs text-[--ks-text-primary] wrap-break-word pr-1">Blocked by: {dep.dependsOn.title}</span>
                                        {isLeader && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDependency(dep.id)}
                                                className="text-[11px] text-[--ks-text-muted] hover:text-red-500"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {blockedBy.length > 0 && (
                            <div className="mt-2">
                                <p className="text-[11px] text-[--ks-text-muted] mb-1">This task blocks:</p>
                                <div className="space-y-1">
                                    {blockedBy.slice(0, 3).map((dep) => (
                                        <p key={dep.id} className="text-[11px] text-[--ks-text-primary] bg-[--ks-bg-card] border border-[--ks-border] rounded-md px-2 py-1 truncate">{dep.task.title}</p>
                                    ))}
                                    {blockedBy.length > 3 && <p className="text-[10px] text-[--ks-text-muted]">+{blockedBy.length - 3} more</p>}
                                </div>
                            </div>
                        )}

                        {isLeader && (
                            <div className="mt-2 flex flex-col gap-2 min-w-0">
                                <select
                                    value={dependsOnTaskId}
                                    onChange={(e) => setDependsOnTaskId(e.target.value)}
                                    className="w-full min-w-0 max-w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] cursor-pointer hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                                >
                                    <option value="">Select blocker task</option>
                                    {availableDependencyTargets.map((candidate) => (
                                        <option key={candidate.id} value={candidate.id}>
                                            {`${candidate.title.length > 34 ? `${candidate.title.slice(0, 34)}...` : candidate.title} · ${(candidate.column?.title ?? 'Task')} · ${candidate.priority}`}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAddDependency}
                                    disabled={!dependsOnTaskId}
                                    className="w-full px-3 py-2 bg-[--ks-primary] text-white text-xs font-semibold rounded-lg hover:bg-[--ks-primary-hover] disabled:opacity-40"
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </div>

                    {/* AI Assist */}
                    <div data-tour="task-ai-assist" className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                        <SideSectionTitle label="AI Assist" dotColor="bg-sky-500" />
                        <p className="text-[11px] text-[--ks-text-muted] mb-2">Generate practical subtasks, risk hints, and a standup draft from current task context.</p>
                        <button
                            type="button"
                            onClick={runAiAssist}
                            className="w-full px-3 py-2 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700"
                        >
                            Generate Suggestions
                        </button>

                        {(aiSubtasks.length > 0 || aiRiskSummary || aiStandupDraft || aiThreadSummary || aiActionItems.length > 0) && (
                            <div className="mt-2 space-y-2">
                                {aiSubtasks.length > 0 && (
                                    <div className="bg-[--ks-bg-card] border border-[--ks-border] rounded-lg px-2.5 py-2">
                                        <p className="text-[11px] font-semibold text-[--ks-text-primary] mb-1">Suggested Subtasks</p>
                                        <ul className="space-y-1">
                                            {aiSubtasks.map((item) => (
                                                <li key={item} className="text-xs text-[--ks-text-secondary]">- {item}</li>
                                            ))}
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={handleApplyAiSubtasks}
                                            disabled={isPending}
                                            className="mt-2 w-full px-2.5 py-1.5 text-[11px] font-semibold rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 disabled:opacity-50"
                                        >
                                            Apply Suggested Subtasks
                                        </button>
                                    </div>
                                )}

                                {aiPrioritySuggestion && (
                                    <div className="bg-[--ks-bg-card] border border-[--ks-border] rounded-lg px-2.5 py-2">
                                        <p className="text-[11px] font-semibold text-[--ks-text-primary]">Priority Suggestion</p>
                                        <p className="text-xs text-[--ks-text-secondary] mt-0.5">Suggested level: {aiPrioritySuggestion}</p>
                                    </div>
                                )}

                                {aiThreadSummary && (
                                    <div className="bg-[--ks-bg-card] border border-[--ks-border] rounded-lg px-2.5 py-2">
                                        <p className="text-[11px] font-semibold text-[--ks-text-primary]">Thread Summary</p>
                                        <p className="text-xs text-[--ks-text-secondary] mt-0.5 leading-relaxed">{aiThreadSummary}</p>
                                    </div>
                                )}

                                {aiActionItems.length > 0 && (
                                    <div className="bg-[--ks-bg-card] border border-[--ks-border] rounded-lg px-2.5 py-2">
                                        <p className="text-[11px] font-semibold text-[--ks-text-primary] mb-1">Suggested Follow-ups</p>
                                        <ul className="space-y-1">
                                            {aiActionItems.map((item) => (
                                                <li key={item} className="text-xs text-[--ks-text-secondary]">- {item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {aiRiskSummary && (
                                    <div className="bg-[--ks-bg-card] border border-[--ks-border] rounded-lg px-2.5 py-2">
                                        <p className="text-[11px] font-semibold text-[--ks-text-primary]">Risk Summary</p>
                                        <p className="text-xs text-[--ks-text-secondary] mt-0.5">{aiRiskSummary}</p>
                                    </div>
                                )}

                                {aiStandupDraft && (
                                    <div className="bg-[--ks-bg-card] border border-[--ks-border] rounded-lg px-2.5 py-2">
                                        <p className="text-[11px] font-semibold text-[--ks-text-primary]">Standup Draft</p>
                                        <p className="text-xs text-[--ks-text-secondary] mt-0.5">{aiStandupDraft}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Time tracking */}
                    <div data-tour="task-time-tracking" className="mb-3 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <SideSectionTitle label="Time Tracking" dotColor="bg-teal-500" />
                            <span className="text-[11px] text-[--ks-text-muted] font-semibold">{totalTrackedMinutes} min total</span>
                        </div>

                        <div className="mb-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg p-2.5">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-xs font-semibold text-teal-400">Live Timer</p>
                                <span className="text-sm font-mono font-bold text-[--ks-text-primary]">{formatTimer(timerSeconds)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 mb-2">
                                <button
                                    type="button"
                                    onClick={handleStartTimer}
                                    disabled={timerRunning}
                                    className="px-2 py-1.5 text-[11px] rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-40"
                                >
                                    Start
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePauseTimer}
                                    disabled={!timerRunning}
                                    className="px-2 py-1.5 text-[11px] rounded-md bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-40"
                                >
                                    Pause
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStopAndLogTimer}
                                    disabled={timerSeconds <= 0}
                                    className="px-2 py-1.5 text-[11px] rounded-md bg-[--ks-primary] text-white font-semibold hover:bg-[--ks-primary-hover] disabled:opacity-40"
                                >
                                    Stop & Log
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <input
                                    type="number"
                                    value={timerAdjustmentMinutes}
                                    onChange={(e) => setTimerAdjustmentMinutes(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-[--ks-bg-overlay] border border-[--ks-border] rounded-md text-xs text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 outline-none"
                                    placeholder="Adjustment min"
                                />
                                <input
                                    type="text"
                                    value={timerSessionNote}
                                    onChange={(e) => setTimerSessionNote(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-[--ks-bg-overlay] border border-[--ks-border] rounded-md text-xs text-[--ks-text-primary] placeholder-[--ks-text-muted] focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 outline-none"
                                    placeholder="Timer note"
                                />
                            </div>
                            {timerStatusMsg && <p className="text-[11px] text-teal-400 mt-2">{timerStatusMsg}</p>}
                        </div>

                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            {timeEntries.length === 0 ? (
                                <p className="text-xs text-[--ks-text-muted]">No time logged yet.</p>
                            ) : (
                                timeEntries.map((entry) => (
                                    <div key={entry.id} className="bg-[--ks-bg-card] border border-[--ks-border] rounded-lg px-2.5 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-semibold text-[--ks-text-primary]">{entry.minutes} min</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-[--ks-text-muted]">{formatDistanceToNow(new Date(entry.createdAt))} ago</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteTimeEntry(entry.id)}
                                                    className="text-[11px] text-[--ks-text-muted] hover:text-red-500"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-[--ks-text-muted] mt-0.5 truncate">{entry.user?.name ?? entry.user?.email ?? 'Member'}</p>
                                        {entry.note && <p className="text-xs text-[--ks-text-secondary] mt-1">{entry.note}</p>}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-2">
                            <input
                                type="number"
                                min={1}
                                value={timeMinutes}
                                onChange={(e) => setTimeMinutes(e.target.value)}
                                placeholder="Minutes"
                                className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                            />
                            <div className="space-y-2">
                                <textarea
                                    value={manualTimeNote}
                                    onChange={(e) => setManualTimeNote(e.target.value)}
                                    placeholder="Optional note"
                                    rows={3}
                                    className="w-full px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none resize-y min-h-20"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTimeEntry}
                                    disabled={!timeMinutes || Number(timeMinutes) <= 0}
                                    className="w-full px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                                >
                                    Log
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Git integration */}
                    <div data-tour="task-git-links" className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                        <SideSectionTitle label="Git Links" dotColor="bg-sky-500" />
                        <p className="text-[11px] text-[--ks-text-muted] mb-2">Attach PRs, commits, or branch links to this task.</p>

                        <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                            {gitLinks.length === 0 ? (
                                <p className="text-xs text-[--ks-text-muted]">No Git links yet.</p>
                            ) : (
                                gitLinks.map((link) => (
                                    <div key={link.id} className="flex items-center justify-between gap-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg px-2 py-1.5">
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-[--ks-primary] hover:underline truncate"
                                        >
                                            {link.name}
                                        </a>
                                        {isLeader && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAttachment(link.id)}
                                                className="text-[11px] text-[--ks-text-muted] hover:text-red-500"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {isLeader && (
                            <div className="mt-2 space-y-2">
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(['PR', 'Commit', 'Branch'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setGitLinkType(type)}
                                            className={`px-2 py-1.5 text-[11px] rounded-lg border font-semibold transition-colors ${gitLinkType === type
                                                ? 'bg-[--ks-primary] text-white border-[--ks-primary]'
                                                : 'bg-[--ks-bg-card] text-[--ks-text-secondary] border border-[--ks-border] hover:border-[--ks-primary] hover:text-[--ks-text-primary]'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="url"
                                        value={gitLinkUrl}
                                        onChange={(e) => setGitLinkUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddGitLink()}
                                        placeholder="https://github.com/..."
                                        className="flex-1 px-2.5 py-2 bg-[--ks-bg-card] border border-[--ks-border] rounded-lg text-sm text-[--ks-text-primary] placeholder-[--ks-text-muted] hover:border-[--ks-primary] focus:ring-2 focus:ring-[--ks-primary]/20 focus:border-[--ks-primary] transition-all outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddGitLink}
                                        disabled={!gitLinkUrl.trim()}
                                        className="px-3 py-2 bg-[--ks-primary] text-white text-xs font-semibold rounded-lg hover:bg-[--ks-primary-hover] disabled:opacity-40"
                                    >
                                        Link
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {canManageArchive && task.status !== 'ARCHIVED' && (
                        <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                            <SideSectionTitle label="Archive" dotColor="bg-rose-500" />
                            <p className="text-[11px] text-[--ks-text-muted] mb-2">Archive removes this task from active columns without deleting history.</p>
                            <button
                                type="button"
                                onClick={handleArchiveAndClose}
                                disabled={isPending}
                                className="w-full px-3 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-40"
                            >
                                {isPending ? 'Archiving...' : 'Archive Task'}
                            </button>
                            {archiveError && <p className="text-[11px] text-rose-500 mt-2">{archiveError}</p>}
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-[--ks-border] my-1" />

                    {/* Sticky actions */}
                    <div className="mt-1 app-surface rounded-xl border border-[--ks-border] p-3 space-y-2">
                        <button
                            type="button"
                            onClick={handleApplyAll}
                            className="w-full px-3.5 py-2 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                        >
                            Apply Changes
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAndClose}
                            className="w-full px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            Save and Close
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full px-3.5 py-2 bg-[--ks-bg-card] text-[--ks-text-secondary] border border-[--ks-border] text-xs font-semibold rounded-lg hover:bg-[--ks-bg-overlay] hover:text-[--ks-text-primary] transition-colors"
                        >
                            Close
                        </button>
                    </div>

                    {/* Task ID */}
                    <div className="mt-auto pt-3 app-surface rounded-xl border border-[--ks-border] p-3">
                        <p className="text-[10px] font-bold text-[--ks-text-muted] uppercase tracking-widest mb-1">Task ID</p>
                        <code className="text-xs text-[--ks-text-muted] bg-[--ks-bg-overlay] px-2 py-0.5 rounded font-mono">
                            #{task.id.slice(-8).toUpperCase()}
                        </code>
                    </div>
                </div>
            </div>
        </Modal>
    );
}   