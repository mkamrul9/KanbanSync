import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? process.env.SMTP_FROM ?? '';

function toMailtoUrl(subject: string, message: string) {
    const to = CONTACT_TO_EMAIL || 'support@kanbansync.app';
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as {
            name?: string;
            email?: string;
            subject?: string;
            message?: string;
        };

        const name = body.name?.trim() ?? '';
        const email = body.email?.trim() ?? '';
        const subject = body.subject?.trim() ?? '';
        const message = body.message?.trim() ?? '';

        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { success: false, message: 'All fields are required.' },
                { status: 400 }
            );
        }

        if (message.length < 15) {
            return NextResponse.json(
                { success: false, message: 'Please provide at least 15 characters in your message.' },
                { status: 400 }
            );
        }

        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = Number(process.env.SMTP_PORT ?? '587');
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM ?? 'KanbanSync <noreply@kanbansync.app>';

        const emailBody = [
            `Name: ${name}`,
            `Email: ${email}`,
            '',
            'Message:',
            message,
        ].join('\n');

        if (smtpHost && smtpUser && smtpPass && CONTACT_TO_EMAIL) {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });

            await transporter.sendMail({
                from: smtpFrom,
                to: CONTACT_TO_EMAIL,
                subject: `[Contact] ${subject}`,
                text: emailBody,
                replyTo: email,
            });

            return NextResponse.json({
                success: true,
                message: 'Thanks! Your message was sent successfully.',
            });
        }

        console.info('[CONTACT_FALLBACK]', emailBody);

        return NextResponse.json({
            success: true,
            message: 'SMTP is not configured yet. We opened your email app so you can send the message directly.',
            mailtoUrl: toMailtoUrl(`[Contact] ${subject}`, emailBody),
        });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Unable to process your request right now.' },
            { status: 500 }
        );
    }
}
