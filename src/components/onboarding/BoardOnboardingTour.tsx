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
            title: 'Board workspace overview',
            description: 'This board is your active workspace. You can invite members, monitor progress, and keep all task context in one place.',
            selector: '[data-tour="board-navbar"]',
        },
        {
            title: 'Invite teammates',
            description: 'Use Invite to add members to this board so they can collaborate in real time.',
            selector: '[data-tour="board-invite-button"]',
            missingHint: 'The Invite button is available for Leaders. If you are a Member/Reviewer, ask a Leader to invite teammates.',
        },
        {
            title: 'Unified search bar',
            description: 'Use this single search bar for global board search across task titles, descriptions, and comment text.',
            selector: '[data-tour="board-search"]',
        },
        {
            title: 'Saved filter views',
            description: 'Save and reuse complex filter combinations for quick context switching between workflows.',
            selector: '[data-tour="board-saved-views-button"]',
        },
        {
            title: 'Advanced filters',
            description: 'Use filters to narrow by assignee, category, priority, tags, date, age, and comment presence.',
            selector: '[data-tour="board-filter-button"]',
        },
        {
            title: 'Metrics and insights',
            description: 'Open Board Metrics to review cycle-time and throughput trends for better planning.',
            selector: '[data-tour="board-metrics-button"]',
        },
        {
            title: 'Audit trail',
            description: 'Open Audit Log to review important task events and role-sensitive workflow changes.',
            selector: '[data-tour="board-audit-button"]',
        },
        {
            title: 'Plan with cycles',
            description: 'Create and activate cycles to focus board views on current planning windows.',
            selector: '[data-tour="board-cycles-button"]',
        },
        {
            title: 'Team timesheet',
            description: 'Use Timesheet for day-level time summaries and exports to share progress externally.',
            selector: '[data-tour="board-timesheet-button"]',
        },
        {
            title: 'Unified archive hub',
            description: 'The Archived tab now includes both archived tasks and archived columns with restore and purge controls.',
            selector: '[data-tour="board-archive-button"]',
        },
        {
            title: 'Create tasks with full details',
            description: 'Use Add Task to set title, category, priority, assignee, tags, and initial description.',
            selector: '[data-tour="column-add-task"]',
        },
        {
            title: 'Task cards and quick actions',
            description: 'Every card supports drag-and-drop status changes. Hover cards to access quick edit and delete controls.',
            selector: '[data-tour="task-card"]',
            missingHint: 'Create at least one task to see task-card steps in action.',
        },
        {
            title: 'Open task details',
            description: 'Click a task card to open details, then manage long-form description and comments after creation.',
            selector: '[data-tour="task-description-field"]',
            missingHint: 'Open any task card, then click Next to continue this part of the tour.',
        },
        {
            title: 'Comments and mentions',
            description: 'Post comments and mention teammates with @email to keep communication linked directly to each task.',
            selector: '[data-tour="task-comment-input"]',
            missingHint: 'Task details modal must be open to highlight this input.',
        },
        {
            title: 'Priority, assignee, and tags',
            description: 'In the task sidebar you can adjust assignee, priority, and tags without leaving the board.',
            selector: '[data-tour="task-priority-field"]',
            missingHint: 'Task details modal must be open to highlight sidebar fields.',
        },
        {
            title: 'Dependency management',
            description: 'Track blockers between tasks so completion flow respects task dependencies.',
            selector: '[data-tour="task-dependencies"]',
            missingHint: 'Task details modal must be open to highlight dependency controls.',
        },
        {
            title: 'AI assist and summaries',
            description: 'Generate subtasks, risk summaries, thread summaries, and follow-up actions from task context.',
            selector: '[data-tour="task-ai-assist"]',
            missingHint: 'Task details modal must be open to highlight AI assist controls.',
        },
        {
            title: 'Timer and time logging',
            description: 'Use live timer and manual entries to capture work time directly on each task.',
            selector: '[data-tour="task-time-tracking"]',
            missingHint: 'Task details modal must be open to highlight time tracking controls.',
        },
        {
            title: 'Edit and delete flow',
            description: 'Use card quick actions and detail controls to edit task content or delete when it is no longer needed.',
            selector: '[data-tour="task-inline-actions"]',
            missingHint: 'Hover a task card to reveal quick action buttons.',
        },
        {
            title: 'You are ready',
            description: 'You now have the full workflow: search globally, filter, archive/restore tasks and columns, plan cycles, track time, use AI assist, and ship tasks confidently.',
        },
    ]), []);

    const handleStepChange = useCallback((stepIndex: number) => {
        const isDetailsRange = stepIndex >= 12 && stepIndex <= 16;

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
