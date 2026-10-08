/** YYYY-MM-DD from Postgres DATE or timestamp strings. */
export function calendarDateOnly(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value).trim());
  return match?.[1] ?? String(value).trim().slice(0, 10);
}

/** Calendar YYYY-MM-DD in local time — never use toISOString() for date-only fields. */
export function dateToLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDateYmd(value: string): Date {
  return new Date(`${calendarDateOnly(value)}T00:00:00`);
}
