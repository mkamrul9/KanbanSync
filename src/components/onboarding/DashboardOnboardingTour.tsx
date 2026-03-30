'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import GuidedTour, { GuidedTourStep } from './GuidedTour';

interface DashboardOnboardingTourProps {
    userId: string;
    firstBoardId?: string;
    boardCount: number;
    autoStart?: boolean;
    forceStart?: boolean;
}

export default function DashboardOnboardingTour({ userId, firstBoardId, boardCount, autoStart = false, forceStart = false }: DashboardOnboardingTourProps) {
    const router = useRouter();
    const [forceStartToken, setForceStartToken] = useState(0);

    useEffect(() => {
        const handler = () => setForceStartToken((prev) => prev + 1);
        window.addEventListener('ks-open-dashboard-tour', handler as EventListener);
        return () => window.removeEventListener('ks-open-dashboard-tour', handler as EventListener);
    }, []);

    const steps = useMemo<GuidedTourStep[]>(() => {
        const hasBoards = boardCount > 0;
        return [
            {
                title: 'Welcome to KanbanSync',
                description: 'This quick walkthrough shows how to create boards, open workspaces, and use advanced task features.',
                selector: '[data-tour="dashboard-title"]',
            },
            {
                title: 'Create your first board',
                description: 'Use Create Board to add columns and invite teammates in one place.',
                selector: '[data-tour="create-board-button"]',
            },
            hasBoards
                ? {
                    title: 'Open a board',
                    description: 'Click any board card to enter the Kanban workspace and start managing tasks.',
                    selector: '[data-tour="open-board-card"]',
                }
                : {
                    title: 'Create a board to continue',
                    description: 'After creating your first board, you can open it from this dashboard and start the full board tour.',
                    selector: '[data-tour="dashboard-empty-state"]',
                },
            {
                title: 'Pin important boards first',
                description: 'Use the pin icon on a board card to keep priority boards at the top of your dashboard.',
                selector: '[data-tour="dashboard-pin-board"]',
                missingHint: 'Create at least one board card to use pin/unpin controls.',
            },
            {
                title: 'Archive and restore boards safely',
                description: 'Archive older boards from the card action, then manage them from Archived Boards with restore and purge options.',
                selector: '[data-tour="dashboard-archive-board"]',
                missingHint: 'Create at least one board card to see archive controls.',
            },
            {
                title: 'Help, About, and Contact',
                description: 'Need guidance or support? Open Help Center, About Us, and Contact Us directly from dashboard quick links.',
                selector: '[data-tour="dashboard-help-links"]',
            },
            {
                title: 'Ready for full feature tour',
                description: hasBoards
                    ? 'When you continue, we will open your board and cover global search, archive hub, cycles, time tracking, AI assist, and full task workflows.'
                    : 'When your first board is ready, open it and the full board feature tour will start automatically.',
            },
        ];
    }, [boardCount]);

    return (
        <GuidedTour
            userId={userId}
            storageKey="dashboard-onboarding-v2"
            tourName="Dashboard Tour"
            steps={steps}
            autoStartWhenUnseen={autoStart}
            forceStart={forceStart}
            forceStartToken={forceStartToken}
            finishLabel={firstBoardId ? 'Open board tour' : 'Finish'}
            onFinish={() => {
                if (firstBoardId) {
                    router.push(`/board/${firstBoardId}?tour=1`);
                }
            }}
        />
    );
}
