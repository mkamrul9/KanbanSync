const BOARD_ARCHIVE_PREFIX = '__ARCHIVED_BOARD__|';
const COLUMN_ARCHIVE_PREFIX = '__ARCHIVED_COLUMN__|';

type ArchiveParse = {
    archived: boolean;
    archivedAt: Date | null;
    original: string;
};

function safeDecode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function safeEncode(value: string): string {
    return encodeURIComponent(value);
}

function parseMarkedValue(value: string | null | undefined, prefix: string): ArchiveParse {
    if (!value || !value.startsWith(prefix)) {
        return {
            archived: false,
            archivedAt: null,
            original: value ?? '',
        };
    }

    const body = value.slice(prefix.length);
    const parts = body.split('|');
    const archivedAtRaw = parts.shift() ?? '';
    const archivedAt = archivedAtRaw ? new Date(archivedAtRaw) : null;
    const originalRaw = parts.join('|');

    return {
        archived: true,
        archivedAt: archivedAt && !Number.isNaN(archivedAt.getTime()) ? archivedAt : null,
        original: safeDecode(originalRaw),
    };
}

function markValue(original: string | null | undefined, prefix: string, archivedAt = new Date()): string {
    const normalized = original ?? '';
    return `${prefix}${archivedAt.toISOString()}|${safeEncode(normalized)}`;
}

export function markBoardArchived(description: string | null | undefined, archivedAt = new Date()): string {
    return markValue(description, BOARD_ARCHIVE_PREFIX, archivedAt);
}

export function parseBoardArchive(description: string | null | undefined): ArchiveParse {
    return parseMarkedValue(description, BOARD_ARCHIVE_PREFIX);
}

export function isBoardArchived(description: string | null | undefined): boolean {
    return parseBoardArchive(description).archived;
}

export function markColumnArchived(title: string, archivedAt = new Date()): string {
    return markValue(title, COLUMN_ARCHIVE_PREFIX, archivedAt);
}

export function parseColumnArchive(title: string): ArchiveParse {
    return parseMarkedValue(title, COLUMN_ARCHIVE_PREFIX);
}

export function isColumnArchived(title: string): boolean {
    return parseColumnArchive(title).archived;
}

export function isArchiveExpired(archivedAt: Date | null, retentionDays: number): boolean {
    if (!archivedAt) return true;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    return archivedAt.getTime() < cutoff;
}
