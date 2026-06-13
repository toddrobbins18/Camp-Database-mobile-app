/** Format HH:mm or HH:mm:ss (24h) for display (e.g. "9:00 AM"). */
export function formatTime12Hour(timeStr?: string | null): string {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const t = timeStr.trim();
    const m = t.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!m) return t;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = (m[3] || '').toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(min).padStart(2, '0')} ${period}`;
}
