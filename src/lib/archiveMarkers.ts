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

/**
 * Encodes original text and appends it to a prefix alongside a timestamp.
 * Used to store archive metadata in a single string column.
 * 
 * @param {string | null | undefined} description - The original board description.
 * @param {Date} [archivedAt=new Date()] - The archival timestamp.
 * @returns {string} The formatted archive marker string.
 */
export function markBoardArchived(description: string | null | undefined, archivedAt = new Date()): string {
    return markValue(description, BOARD_ARCHIVE_PREFIX, archivedAt);
}

/**
 * Parses a marked board description to extract archive status, timestamp, and original content.
 * 
 * @param {string | null | undefined} description - The potentially marked string.
 * @returns {ArchiveParse} The parsed archive metadata.
 */
export function parseBoardArchive(description: string | null | undefined): ArchiveParse {
    return parseMarkedValue(description, BOARD_ARCHIVE_PREFIX);
}

/**
 * Checks if a board description contains the archive prefix.
 * 
 * @param {string | null | undefined} description - The board description.
 * @returns {boolean} True if archived.
 */
export function isBoardArchived(description: string | null | undefined): boolean {
    return parseBoardArchive(description).archived;
}

/**
 * Encodes original column title and appends it to a prefix alongside a timestamp.
 * 
 * @param {string} title - The original column title.
 * @param {Date} [archivedAt=new Date()] - The archival timestamp.
 * @returns {string} The formatted archive marker string.
 */
export function markColumnArchived(title: string, archivedAt = new Date()): string {
    return markValue(title, COLUMN_ARCHIVE_PREFIX, archivedAt);
}

/**
 * Parses a marked column title to extract archive status, timestamp, and original content.
 * 
 * @param {string} title - The potentially marked string.
 * @returns {ArchiveParse} The parsed archive metadata.
 */
export function parseColumnArchive(title: string): ArchiveParse {
    return parseMarkedValue(title, COLUMN_ARCHIVE_PREFIX);
}

/**
 * Checks if a column title contains the archive prefix.
 * 
 * @param {string} title - The column title.
 * @returns {boolean} True if archived.
 */
export function isColumnArchived(title: string): boolean {
    return parseColumnArchive(title).archived;
}

/**
 * Determines if an archived item has exceeded its retention period.
 * 
 * @param {Date | null} archivedAt - The date it was archived.
 * @param {number} retentionDays - The number of days before expiry.
 * @returns {boolean} True if expired or if archivedAt is invalid.
 */
export function isArchiveExpired(archivedAt: Date | null, retentionDays: number): boolean {
    if (!archivedAt) return true;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    return archivedAt.getTime() < cutoff;
}
