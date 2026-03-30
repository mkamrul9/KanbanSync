import { prisma } from './db';
import { BoardRole, Priority, RecurrenceRule, TaskActivityType, TaskCategory } from '../generated/prisma/client';
import { markColumnArchived } from './archiveMarkers';

export const EXAMPLE_BOARD_TITLE = 'KanbanSync Example Board';

export async function createExampleBoardForUser(userId: string) {
    const existing = await prisma.board.findFirst({
        where: {
            userId,
            title: EXAMPLE_BOARD_TITLE,
        },
        select: { id: true },
    });

    if (existing) return existing.id;

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const board = await prisma.board.create({
        data: {
            userId,
            title: EXAMPLE_BOARD_TITLE,
            description: 'Hands-on sample board: explore search, filters, dependencies, AI assist, reminders, recurrence, archives, timesheet, and metrics.',
            columns: {
                create: [
                    { title: 'Backlog', order: 0 },
                    { title: 'In Progress', order: 1, wipLimit: 3 },
                    { title: 'Review', order: 2, wipLimit: 2 },
                    { title: 'Done', order: 3 },
                    { title: markColumnArchived('Archived Experiments'), order: 4 },
                ],
            },
        },
        include: {
            columns: {
                orderBy: { order: 'asc' },
            },
        },
    });

    await prisma.boardMember.upsert({
        where: {
            boardId_userId: {
                boardId: board.id,
                userId,
            },
        },
        update: { role: BoardRole.LEADER },
        create: {
            boardId: board.id,
            userId,
            role: BoardRole.LEADER,
        },
    });

    const backlog = board.columns[0];
    const inProgress = board.columns[1];
    const review = board.columns[2];
    const done = board.columns[3];
    const archivedCol = board.columns[4];

    const task1 = await prisma.task.create({
        data: {
            title: 'Start Here: Explore KanbanSync Features',
            description: 'Open this task first. It demonstrates category, priority, tags, comments, reminders, recurrence, and AI assist.',
            status: 'TODO',
            category: TaskCategory.STORY,
            priority: Priority.HIGH,
            tags: ['onboarding', 'tutorial', 'workflow'],
            recurrence: RecurrenceRule.WEEKLY,
            dueAt: nextWeek,
            reminderAt: nextTwoDays,
            columnId: backlog.id,
            order: 0,
            assigneeId: userId,
        },
    });

    const task2 = await prisma.task.create({
        data: {
            title: 'Dependency Demo: API Contract Validation',
            description: 'This task is blocked by the Start Here task. Try dependency controls in task details.',
            status: 'IN_PROGRESS',
            category: TaskCategory.TASK,
            priority: Priority.MEDIUM,
            tags: ['dependency', 'backend'],
            recurrence: RecurrenceRule.NONE,
            startedAt: now,
            columnId: inProgress.id,
            order: 0,
            assigneeId: userId,
        },
    });

    const task3 = await prisma.task.create({
        data: {
            title: 'Time Tracking + AI Assist Demo',
            description: 'Use timer/manual logs and generate AI subtasks, risk summary, and standup draft.',
            status: 'IN_PROGRESS',
            category: TaskCategory.TASK,
            priority: Priority.HIGH,
            tags: ['time-tracking', 'ai-assist'],
            recurrence: RecurrenceRule.NONE,
            startedAt: now,
            dueAt: nextWeek,
            columnId: inProgress.id,
            order: 1,
            assigneeId: userId,
        },
    });

    await prisma.task.create({
        data: {
            title: 'Review Demo: Metrics and Audit Readiness',
            description: 'Move this through review to see cycle-time and throughput changes in metrics.',
            status: 'IN_PROGRESS',
            category: TaskCategory.ENHANCEMENT,
            priority: Priority.LOW,
            tags: ['metrics', 'audit'],
            recurrence: RecurrenceRule.NONE,
            startedAt: now,
            columnId: review.id,
            order: 0,
            assigneeId: userId,
        },
    });

    const task5 = await prisma.task.create({
        data: {
            title: 'Completed Example: Release Notes Published',
            description: 'A completed task to illustrate done flow and historical metrics.',
            status: 'DONE',
            category: TaskCategory.TASK,
            priority: Priority.NONE,
            tags: ['done', 'release'],
            recurrence: RecurrenceRule.NONE,
            startedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
            completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            columnId: done.id,
            order: 0,
            assigneeId: userId,
        },
    });

    const archivedTask = await prisma.task.create({
        data: {
            title: 'Archived Task Example',
            description: 'Use the Archived tab to restore this task.',
            status: 'ARCHIVED',
            category: TaskCategory.TASK,
            priority: Priority.LOW,
            tags: ['archive'],
            recurrence: RecurrenceRule.NONE,
            columnId: backlog.id,
            order: 99,
            assigneeId: userId,
        },
    });

    await prisma.task.create({
        data: {
            title: 'Archived Column Task Example',
            description: 'This task lives in an archived column and appears in archive management.',
            status: 'ARCHIVED',
            category: TaskCategory.SUB_TASK,
            priority: Priority.NONE,
            tags: ['archive-column'],
            recurrence: RecurrenceRule.NONE,
            columnId: archivedCol.id,
            order: 0,
            assigneeId: userId,
        },
    });

    await prisma.taskDependency.create({
        data: {
            taskId: task2.id,
            dependsOnTaskId: task1.id,
            createdById: userId,
        },
    });

    await prisma.subtask.createMany({
        data: [
            { taskId: task3.id, title: 'Start timer and log a session', done: false, order: 0 },
            { taskId: task3.id, title: 'Generate AI suggestions', done: false, order: 1 },
            { taskId: task3.id, title: 'Apply suggested subtasks', done: false, order: 2 },
        ],
    });

    await prisma.attachment.createMany({
        data: [
            {
                taskId: task3.id,
                name: 'Git: PR',
                url: 'https://github.com/example/repo/pull/123',
            },
            {
                taskId: task1.id,
                name: 'Feature spec',
                url: 'https://example.com/spec',
            },
        ],
    });

    await prisma.comment.createMany({
        data: [
            {
                taskId: task1.id,
                userId,
                text: 'Welcome! Use @mentions in comments to notify teammates.',
            },
            {
                taskId: task2.id,
                userId,
                text: 'Blocked until the onboarding task is completed.',
            },
            {
                taskId: task3.id,
                userId,
                text: 'Try the AI Assist button and then log a timer entry.',
            },
        ],
    });

    await prisma.timeEntry.createMany({
        data: [
            { taskId: task3.id, userId, minutes: 25, note: 'Timer session example' },
            { taskId: task5.id, userId, minutes: 40, note: 'Completed work example' },
        ],
    });

    await prisma.taskActivity.createMany({
        data: [
            {
                taskId: task1.id,
                actorId: userId,
                action: TaskActivityType.CREATED,
                message: 'Created onboarding sample task',
            },
            {
                taskId: task2.id,
                actorId: userId,
                action: TaskActivityType.DEPENDENCY_ADDED,
                message: 'Added dependency to onboarding task',
            },
            {
                taskId: archivedTask.id,
                actorId: userId,
                action: TaskActivityType.UPDATED,
                message: 'Archived sample task for archive-flow demo',
            },
        ],
    });

    return board.id;
}
