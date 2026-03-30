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
