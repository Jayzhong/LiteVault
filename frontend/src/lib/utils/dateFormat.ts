/**
 * Date formatting utilities with timezone support.
 * 
 * Uses user's timezone preference for consistent display across the app.
 */

export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
    locale?: string;
}

/**
 * Format a date using the user's timezone preference.
 * 
 * @param date - Date to format (Date, string, or null)
 * @param userTimezone - User's timezone preference (e.g., 'America/New_York')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string or placeholder
 */
export function formatDate(
    date: Date | string | null | undefined,
    userTimezone: string = 'UTC',
    options: FormatDateOptions = {}
): string {
    if (!date) return '—';

    const d = typeof date === 'string' ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(d.getTime())) return '—';

    const { locale = 'en-US', ...formatOptions } = options;

    return new Intl.DateTimeFormat(locale, {
        timeZone: userTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...formatOptions,
    }).format(d);
}

/**
 * Format a date with time using the user's timezone preference.
 */
export function formatDateTime(
    date: Date | string | null | undefined,
    userTimezone: string = 'UTC',
    options: FormatDateOptions = {}
): string {
    return formatDate(date, userTimezone, {
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    });
}

/**
 * Format a date as relative label (Today, Yesterday, etc.) based on user timezone.
 * Falls back to formatted date for older dates.
 */
export function formatRelativeDate(
    date: Date | string | null | undefined,
    userTimezone: string = 'UTC'
): string {
    if (!date) return '—';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';

    // Get current date in user's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const nowParts = formatter.formatToParts(now);
    const dateParts = formatter.formatToParts(d);

    const getDateString = (parts: Intl.DateTimeFormatPart[]) => {
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}-${month}-${day}`;
    };

    const nowStr = getDateString(nowParts);
    const dateStr = getDateString(dateParts);

    // Check if same day
    if (nowStr === dateStr) {
        return 'Today';
    }

    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayParts = formatter.formatToParts(yesterday);
    if (dateStr === getDateString(yesterdayParts)) {
        return 'Yesterday';
    }

    // Check if within last 7 days
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (d >= weekAgo) {
        return 'Last 7 days';
    }

    // Check if within last 30 days
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    if (d >= monthAgo) {
        return 'Last 30 days';
    }

    // Default to formatted date
    return formatDate(d, userTimezone);
}

/**
 * Get the relative time label for grouping (used in Library).
 */
export function getTimelineGroupLabel(
    date: Date | string | null | undefined,
    userTimezone: string = 'UTC'
): 'today' | 'yesterday' | 'last7days' | 'older' {
    if (!date) return 'older';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'older';

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const nowParts = formatter.formatToParts(now);
    const dateParts = formatter.formatToParts(d);

    const getDateString = (parts: Intl.DateTimeFormatPart[]) => {
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}-${month}-${day}`;
    };

    const nowStr = getDateString(nowParts);
    const dateStr = getDateString(dateParts);

    if (nowStr === dateStr) return 'today';

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === getDateString(formatter.formatToParts(yesterday))) {
        return 'yesterday';
    }

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (d >= weekAgo) {
        return 'last7days';
    }

    return 'older';
}
