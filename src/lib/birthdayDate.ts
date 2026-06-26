/**
 * Calendar month/day/year from DB date values (matches lovable-web-app Dashboard intent).
 * Handles YYYY-MM-DD, ISO timestamps, and MM/DD/YYYY — avoids Number('25T00:00:00') => NaN.
 */
export function parseBirthdayCalendarParts(value: unknown): { year: number; month: number; day: number } | null {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
        const year = parseInt(iso[1], 10);
        const month = parseInt(iso[2], 10);
        const day = parseInt(iso[3], 10);
        if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
            return { year, month, day };
        }
    }

    const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (us) {
        const month = parseInt(us[1], 10);
        const day = parseInt(us[2], 10);
        const year = parseInt(us[3], 10);
        if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
            return { year, month, day };
        }
    }

    return null;
}

/** Age on a given calendar day (local), same logic as web Dashboard calculateAge. */
export function ageOnLocalDate(
    parts: { year: number; month: number; day: number },
    now: Date = new Date()
): number {
    let age = now.getFullYear() - parts.year;
    const tm = now.getMonth() + 1;
    const td = now.getDate();
    if (tm < parts.month || (tm === parts.month && td < parts.day)) {
        age--;
    }
    return age;
}

/** Display a birthday without UTC timezone shifts from `new Date("YYYY-MM-DD")`. */
export function formatBirthdayDisplay(
    value: unknown,
    options?: Intl.DateTimeFormatOptions
): string {
    const parts = parseBirthdayCalendarParts(value);
    if (!parts) return '';
    const date = new Date(parts.year, parts.month - 1, parts.day);
    const defaultOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options || defaultOptions);
}

export { isActiveRosterStatus } from './rosterStatus';
