import type { BoardWithColumnsAndTasks } from '../types/board';

type MetricsOptions = {
    throughputDays?: number;
    cfdDays?: number;
};

function toDate(d: string | Date | null | undefined): Date | null {
    if (!d) return null;
    return d instanceof Date ? d : new Date(d);
}

function daysBetween(a: Date, b: Date) {
    const ms = Math.max(0, b.getTime() - a.getTime());
    return ms / (1000 * 60 * 60 * 24);
}

function classifyColumn(title = ''): 'backlog' | 'inProgress' | 'done' {
    const t = title.toLowerCase();
    if (t.includes('done') || t.includes('complete') || t.includes('completed')) return 'done';
    if (t.includes('in progress') || t.includes('in_progress') || t.includes('progress') || t.includes('doing')) return 'inProgress';
    if (t.includes('todo') || t.includes('backlog')) return 'backlog';
    return 'inProgress';
}

export function computeBoardMetrics(board: BoardWithColumnsAndTasks, opts?: MetricsOptions) {
    const throughputDays = opts?.throughputDays ?? 7;
    const cfdDays = opts?.cfdDays ?? 14;

    const now = new Date();

    // Helper to get completedAt from task: if task is in a 'done' column, use updatedAt
    const columnById = new Map(board.columns.map(c => [c.id, c]));

    const allTasks = board.columns.flatMap(c => c.tasks.map(t => ({ ...t, columnTitle: c.title })));

    const completedTasks = allTasks.filter((t) => {
        const col = columnById.get(t.columnId);
        const type = col ? classifyColumn(col.title) : classifyColumn(t.columnTitle);
        return type === 'done';
    });

    const completedWithTimes = completedTasks.map(t => {
        const created = toDate(t.createdAt);
        // prefer completedAt if present (server-side), else fallback to updatedAt
        const completed = toDate(t.completedAt) ?? toDate(t.updatedAt) ?? null;
        const started = toDate(t.startedAt) ?? null;
        return { id: t.id, title: t.title, created, started, completed };
    }).filter(x => x.created && x.completed);

    const leadTimes = completedWithTimes.map(t => daysBetween(t.created!, t.completed!));
    const cycleTimes = completedWithTimes.map(t => (t.started ? daysBetween(t.started, t.completed!) : daysBetween(t.created!, t.completed!)));

    const average = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const median = (arr: number[]) => {
        if (!arr.length) return 0;
        const s = [...arr].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
    };

    const leadTimeAvg = average(leadTimes);
    const leadTimeMedian = median(leadTimes);

    const cycleTimeAvg = average(cycleTimes);
    const cycleTimeMedian = median(cycleTimes);

    // WIP: tasks not in done
    const wipPerColumn: Record<string, number> = {};
    let wipTotal = 0;
    for (const col of board.columns) {
        const type = classifyColumn(col.title);
        const count = col.tasks.length;
        wipPerColumn[col.title] = count;
        if (type !== 'done') wipTotal += count;
    }

    // Throughput: completed tasks in the last throughputDays (using updatedAt as completed)
    const cutoff = new Date(now.getTime() - throughputDays * 24 * 60 * 60 * 1000);
    const throughput = completedWithTimes.filter(t => t.completed! >= cutoff).length;

    // Work item age: for active tasks (not done), age = now - createdAt
    const activeTasks = allTasks.filter(t => {
        const col = columnById.get(t.columnId);
        const type = col ? classifyColumn(col.title) : classifyColumn(t.columnTitle);
        return type !== 'done';
    }).map(t => ({ id: t.id, title: t.title, created: toDate(t.createdAt) }));

    const workItemAges = activeTasks.map(t => ({ id: t.id, title: t.title, ageDays: t.created ? daysBetween(t.created, now) : 0 }));

    // Blocked items: we don't have explicit blocked flag — return empty list for now
    const blocked: Array<{ id: string; title: string }> = [];

    // Cumulative Flow Diagram (approx): snapshots for last cfdDays using current column classification
    const dates: string[] = [];
    const series = { backlog: [] as number[], inProgress: [] as number[], done: [] as number[] };
    for (let i = cfdDays - 1; i >= 0; i--) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        dates.push(day.toISOString().slice(0, 10));

        // Because we don't have historical movement, we approximate CFD using current column for all tasks
        let backlogCount = 0; let inProgressCount = 0; let doneCount = 0;
        for (const t of allTasks) {
            const col = columnById.get(t.columnId);
            const type = col ? classifyColumn(col.title) : classifyColumn(t.columnTitle);
            if (type === 'backlog') backlogCount++;
            else if (type === 'done') doneCount++;
            else inProgressCount++;
        }
        series.backlog.push(backlogCount);
        series.inProgress.push(inProgressCount);
        series.done.push(doneCount);
    }

    return {
        leadTime: { avgDays: leadTimeAvg, medianDays: leadTimeMedian, samples: leadTimes.length },
        cycleTime: { avgDays: cycleTimeAvg, medianDays: cycleTimeMedian, samples: cycleTimes.length },
        wip: { total: wipTotal, perColumn: wipPerColumn },
        throughput: { count: throughput, periodDays: throughputDays },
        workItemAges: workItemAges.sort((a, b) => b.ageDays - a.ageDays),
        blocked,
        cfd: { dates, series }
    };
}

export type BoardMetrics = ReturnType<typeof computeBoardMetrics>;

export default computeBoardMetrics;
