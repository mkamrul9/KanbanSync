'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import GuidedTour, { GuidedTourStep } from './GuidedTour';

interface BoardOnboardingTourProps {
    userId: string;
    forceStart?: boolean;
}

export default function BoardOnboardingTour({ userId, forceStart = false }: BoardOnboardingTourProps) {
    const [forceStartToken, setForceStartToken] = useState(0);

    useEffect(() => {
        const handler = () => setForceStartToken((prev) => prev + 1);
        window.addEventListener('ks-open-board-tour', handler as EventListener);
        return () => window.removeEventListener('ks-open-board-tour', handler as EventListener);
    }, []);

    const steps = useMemo<GuidedTourStep[]>(() => ([
        {
            title: 'Welcome to your board',
            description: 'This is your main workspace. Everything important happens here: planning, collaboration, execution, and reporting.',
            selector: '[data-tour="board-navbar"]',
        },
        {
            title: 'Run this tutorial anytime',
            description: 'Click Tutorial whenever you need a guided walkthrough again.',
            selector: '[data-tour="board-tutorial-button"]',
        },
        {
            title: 'Invite teammates',
            description: 'Leaders can invite members so work is shared and visible to the whole team.',
            selector: '[data-tour="board-invite-button"]',
            missingHint: 'The Invite button is available for Leaders. If you are a Member/Reviewer, ask a Leader to invite teammates.',
        },
        {
            title: 'Notifications',
            description: 'Open notifications for mentions, assignments, reminders, and digests so you do not miss updates.',
            selector: '[data-tour="board-notifications"]',
        },
        {
            title: 'Unified search bar',
            description: 'Use one search bar for full board lookup across task titles, descriptions, and comments.',
            selector: '[data-tour="board-search"]',
        },
        {
            title: 'Saved filter views',
            description: 'Save your filter combinations and reuse them in one click.',
            selector: '[data-tour="board-saved-views-button"]',
        },
        {
            title: 'Advanced filters',
            description: 'Filter by assignee, category, priority, tags, dates, age, and comment presence to focus fast.',
            selector: '[data-tour="board-filter-button"]',
        },
        {
            title: 'Metrics and insights',
            description: 'Use metrics to track throughput, lead/cycle time, workload, and SLA risk.',
            selector: '[data-tour="board-metrics-button"]',
        },
        {
            title: 'Audit trail',
            description: 'Audit Log records key changes so your workflow stays transparent.',
            selector: '[data-tour="board-audit-button"]',
        },
        {
            title: 'Plan with cycles',
            description: 'Use cycles for sprint-style planning and focused execution windows.',
            selector: '[data-tour="board-cycles-button"]',
        },
        {
            title: 'Team timesheet',
            description: 'Use timesheet for day-level summaries and CSV export.',
            selector: '[data-tour="board-timesheet-button"]',
        },
        {
            title: 'Unified archive hub',
            description: 'Manage archived tasks and archived columns in one place. Restore or purge expired items here.',
            selector: '[data-tour="board-archive-button"]',
        },
        {
            title: 'Create tasks',
            description: 'Add tasks from any column, then enrich them with details in Task Details.',
            selector: '[data-tour="column-add-task"]',
        },
        {
            title: 'Task cards and drag-and-drop',
            description: 'Move tasks across columns with drag-and-drop. Use quick actions for edit/delete.',
            selector: '[data-tour="task-card"]',
            missingHint: 'Create at least one task to see task-card steps in action.',
        },
        {
            title: 'Open task details',
            description: 'Open task details to manage everything for a task in one place.',
            selector: '[data-tour="task-description-field"]',
            missingHint: 'Open any task card, then click Next to continue this part of the tour.',
        },
        {
            title: 'Save reusable templates',
            description: 'Leaders can save a task as a template for repeatable work.',
            selector: '[data-tour="task-template-save"]',
            missingHint: 'Task details modal must be open and you must be a Leader.',
        },
        {
            title: 'Checklist execution',
            description: 'Break work into subtasks and track progress with the checklist.',
            selector: '[data-tour="task-checklist"]',
            missingHint: 'Task details modal must be open to highlight checklist.',
        },
        {
            title: 'Attachments and references',
            description: 'Attach docs, links, and external references directly to tasks.',
            selector: '[data-tour="task-attachments"]',
            missingHint: 'Task details modal must be open to highlight attachments.',
        },
        {
            title: 'Comments and mentions',
            description: 'Discuss work directly in the task and mention teammates with @email.',
            selector: '[data-tour="task-comment-input"]',
            missingHint: 'Task details modal must be open to highlight this input.',
        },
        {
            title: 'Priority, assignee, and tags',
            description: 'Update ownership and urgency quickly from the sidebar.',
            selector: '[data-tour="task-priority-field"]',
            missingHint: 'Task details modal must be open to highlight sidebar fields.',
        },
        {
            title: 'Reminder scheduling',
            description: 'Set reminders to notify the right people before deadlines.',
            selector: '[data-tour="task-reminder"]',
            missingHint: 'Task details modal must be open to highlight reminder controls.',
        },
        {
            title: 'Recurrence automation',
            description: 'Use recurrence for repeating work like weekly checks or monthly tasks.',
            selector: '[data-tour="task-recurrence"]',
            missingHint: 'Task details modal must be open to highlight recurrence controls.',
        },
        {
            title: 'Dependency management',
            description: 'Set blockers between tasks so completion flow follows real dependency order.',
            selector: '[data-tour="task-dependencies"]',
            missingHint: 'Task details modal must be open to highlight dependency controls.',
        },
        {
            title: 'AI assist and summaries',
            description: 'Generate subtasks, risk analysis, thread summaries, and follow-up actions in one click.',
            selector: '[data-tour="task-ai-assist"]',
            missingHint: 'Task details modal must be open to highlight AI assist controls.',
        },
        {
            title: 'Timer and time logging',
            description: 'Log time with live timer or manual entries to keep effort tracking accurate.',
            selector: '[data-tour="task-time-tracking"]',
            missingHint: 'Task details modal must be open to highlight time tracking controls.',
        },
        {
            title: 'Git links on tasks',
            description: 'Connect PRs, commits, and branches to tasks for end-to-end traceability.',
            selector: '[data-tour="task-git-links"]',
            missingHint: 'Task details modal must be open to highlight Git links section.',
        },
        {
            title: 'Edit and delete flow',
            description: 'Use card quick actions and detail controls to edit task content or delete when it is no longer needed.',
            selector: '[data-tour="task-inline-actions"]',
            missingHint: 'Hover a task card to reveal quick action buttons.',
        },
        {
            title: 'You can now use the full app',
            description: 'You are ready to run the complete workflow: plan, execute, collaborate, automate, report, and ship with confidence.',
        },
    ]), []);

    const handleStepChange = useCallback((stepIndex: number) => {
        const isDetailsRange = stepIndex >= 14 && stepIndex <= 25;

        if (isDetailsRange) {
            window.dispatchEvent(new Event('ks-tour-request-open-task-details'));
            return;
        }

        window.dispatchEvent(new Event('ks-tour-close-task-details'));
    }, []);

    return (
        <GuidedTour
            userId={userId}
            storageKey="board-onboarding-v1"
            tourName="Board Feature Tour"
            steps={steps}
            autoStartWhenUnseen={false}
            forceStart={forceStart}
            forceStartToken={forceStartToken}
            finishLabel="Start working"
            onStepChange={handleStepChange}
            onFinish={() => {
                window.dispatchEvent(new Event('ks-tour-close-task-details'));
            }}
        />
    );
}
