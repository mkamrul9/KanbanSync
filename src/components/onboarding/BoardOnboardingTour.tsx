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
            title: 'Search and filter tasks',
            description: 'Use search and filters to quickly narrow by title, assignee, category, priority, tags, date, age, and comments.',
            selector: '[data-tour="board-search"]',
        },
        {
            title: 'Metrics and insights',
            description: 'Open Board Metrics to review cycle-time and throughput trends for better planning.',
            selector: '[data-tour="board-metrics-button"]',
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
            title: 'Edit and delete flow',
            description: 'Use card quick actions and detail controls to edit task content or delete when it is no longer needed.',
            selector: '[data-tour="task-inline-actions"]',
            missingHint: 'Hover a task card to reveal quick action buttons.',
        },
        {
            title: 'You are ready',
            description: 'You now have the full workflow: create, categorize, prioritize, assign, tag, describe, comment, edit, move, and delete tasks.',
        },
    ]), []);

    const handleStepChange = useCallback((stepIndex: number) => {
        const isDetailsRange = stepIndex >= 6 && stepIndex <= 8;

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
