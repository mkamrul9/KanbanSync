/**
 * Utility for classifying board columns based on their titles.
 */

/**
 * Normalizes a column title and classifies it into a standard stage of work.
 * 
 * @param {string} title - The raw column title (e.g. "To Do", "QA", "Done").
 * @returns {'backlog' | 'inProgress' | 'done'} The classification of the column.
 */
export function classifyColumn(title = ''): 'backlog' | 'inProgress' | 'done' {
    const t = title.toLowerCase();
    
    // Done / Complete states
    if (t.includes('done') || t.includes('complete') || t.includes('completed')) {
        return 'done';
    }
    
    // Backlog / To Do states
    if (t.includes('todo') || t.includes('backlog') || t.includes('to do') || t.includes('to-do')) {
        return 'backlog';
    }
    
    // Everything else (In Progress, Review, QA, Testing, etc.)
    return 'inProgress';
}
