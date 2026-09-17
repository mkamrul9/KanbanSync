type DigestItem = {
    type: string;
    createdAt: Date;
    boardTitle?: string;
    taskTitle?: string;
};

type DigestPayload = {
    toEmail: string;
    toName: string | null;
    unreadCount: number;
    windowHours: number;
    items: DigestItem[];
};

/**
 * Simulates sending an email digest summarizing unread notifications.
 * Currently prints a placeholder payload to the server console.
 * Intended to be replaced with a real email transport (e.g. Resend, SendGrid, SES).
 * 
 * @param {DigestPayload} payload - The compiled digest data.
 * @returns {Promise<{ok: boolean}>} Result of the dispatch.
 */
export async function sendDigestEmail(payload: DigestPayload) {
    const lines = payload.items.slice(0, 8).map((item) => {
        const board = item.boardTitle ? ` in ${item.boardTitle}` : '';
        const task = item.taskTitle ? `: ${item.taskTitle}` : '';
        return `- ${item.type}${board}${task}`;
    });

    const body = [
        `Hi ${payload.toName ?? 'there'},`,
        '',
        `You have ${payload.unreadCount} unread notifications in the last ${payload.windowHours} hours.`,
        '',
        ...lines,
        '',
        'Open KanbanSync to review and clear notifications.',
    ].join('\n');

    // Placeholder transport. Swap with your provider (Resend/SendGrid/SES) later.
    console.log('[email-digest] sending digest email', {
        to: payload.toEmail,
        unreadCount: payload.unreadCount,
        preview: body,
    });

    return { ok: true };
}
