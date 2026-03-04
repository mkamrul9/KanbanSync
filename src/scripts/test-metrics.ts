import computeBoardMetrics from '../lib/metrics';

// Minimal mock of BoardWithColumnsAndTasks shape used by computeBoardMetrics
const board = {
    id: 'board1',
    members: [],
    columns: [
        {
            id: 'col1',
            title: 'Backlog',
            tasks: [
                { id: 't1', title: 'Task 1', columnId: 'col1', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() },
            ],
        },
        {
            id: 'col2',
            title: 'In Progress',
            tasks: [
                { id: 't2', title: 'Task 2', columnId: 'col2', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
            ],
        },
        {
            id: 'col3',
            title: 'Done',
            tasks: [
                { id: 't3', title: 'Task 3', columnId: 'col3', createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
                { id: 't4', title: 'Task 4', columnId: 'col3', createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
            ],
        },
    ],
};

try {
    const metrics = computeBoardMetrics(board as unknown as Parameters<typeof computeBoardMetrics>[0], { throughputDays: 7, cfdDays: 7 });

    console.log('Computed metrics:', JSON.stringify(metrics, null, 2));

    // Basic assertions
    console.assert(typeof metrics.leadTime.avgDays === 'number', 'leadTime.avgDays should be number');
    console.assert(metrics.wip.total === 2, 'WIP total should equal tasks not in Done (2)');
    console.assert(metrics.throughput.count >= 0, 'throughput.count should be >= 0');
    console.assert(Array.isArray(metrics.workItemAges), 'workItemAges should be an array');

    // Expect samples equal to number of completed tasks (2)
    console.assert(metrics.leadTime.samples === 2, `expected 2 completed samples but got ${metrics.leadTime.samples}`);
    console.assert(metrics.cycleTime.samples === 2, `expected 2 cycle samples but got ${metrics.cycleTime.samples}`);

    console.log('All metric assertions passed.');
    process.exit(0);
} catch (err) {
    console.error('Metrics test failed:', err);
    process.exit(1);
}
