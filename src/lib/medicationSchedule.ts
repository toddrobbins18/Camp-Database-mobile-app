import { format, parseISO } from 'date-fns';
import { campProgramStartDate } from './medicationStartDate';

function parseSeasonYear(season: string): number {
    const match = String(season).match(/(\d{4})/);
    if (match) return Number(match[1]);
    return new Date().getFullYear();
}

export function campProgramEndDate(season: string): string {
    const year = parseSeasonYear(season);
    return `${year}-08-12`;
}

export type MedicationLogRow = {
    id: string;
    child_id: string;
    date: string;
    end_date?: string | null;
    season?: string;
    is_recurring?: boolean | null;
    frequency?: string | null;
    days_of_week?: string[] | null;
    medication_name?: string;
    meal_time?: string[] | string | null;
    administered?: boolean;
    _fromRecurringTemplate?: boolean;
    _templateId?: string;
    _displayDate?: string;
};

function mealTimeKey(mealTime: unknown): string {
    if (Array.isArray(mealTime)) return mealTime.join('|');
    return String(mealTime ?? '');
}

export function medicationSlotKey(
    med: Pick<MedicationLogRow, 'child_id' | 'medication_name' | 'meal_time'>,
): string {
    return `${med.child_id}|${med.medication_name ?? ''}|${mealTimeKey(med.meal_time)}`;
}

function weekdayName(dateYmd: string): string {
    return format(parseISO(dateYmd), 'EEEE');
}

export function medicationAppliesOnDate(med: MedicationLogRow, dateYmd: string, season: string): boolean {
    const start = med.date;
    if (!start || dateYmd < start) return false;
    const end = med.end_date || campProgramEndDate(season);
    if (dateYmd > end) return false;
    if (!med.is_recurring) return med.date === dateYmd;
    const freq = med.frequency || 'daily';
    if (freq === 'daily' || freq === 'weekly') return true;
    if (freq === 'custom') {
        const days = med.days_of_week || [];
        if (days.length === 0) return true;
        return days.includes(weekdayName(dateYmd));
    }
    return true;
}

export function mergeMedicationsForDate(
    dateRows: MedicationLogRow[],
    recurringRows: MedicationLogRow[],
    dateYmd: string,
    season: string,
): MedicationLogRow[] {
    const result: MedicationLogRow[] = [...dateRows];
    const existingKeys = new Set(dateRows.map((row) => medicationSlotKey(row)));

    for (const template of recurringRows) {
        if (!template.is_recurring) continue;
        if (template.date === dateYmd) continue;
        if (!medicationAppliesOnDate(template, dateYmd, season)) continue;
        const key = medicationSlotKey(template);
        if (existingKeys.has(key)) continue;
        result.push({
            ...template,
            _fromRecurringTemplate: true,
            _templateId: template.id,
            _displayDate: dateYmd,
        });
        existingKeys.add(key);
    }

    return result;
}

export function applyDailyMedicationDefaults(row: Record<string, unknown>, season: string): void {
    const hasSchedule = Boolean(row.meal_time) || Boolean(row.scheduled_time);
    const freq = String(row.frequency ?? '').toLowerCase();
    const isDaily = freq === 'daily' || !freq || freq === 'null';

    if (hasSchedule && isDaily) {
        row.is_recurring = true;
        row.frequency = 'daily';
        if (!row.end_date) row.end_date = campProgramEndDate(season);
    }

    if (row.is_recurring && !row.end_date) {
        row.end_date = campProgramEndDate(season);
    }
}

export function childMatchesGenderFilter(
    child: { gender?: string | null; division?: { gender?: string | null } | null },
    filter: 'all' | 'boys' | 'girls',
): boolean {
    if (filter === 'all') return true;
    const g = String(child.gender ?? child.division?.gender ?? '')
        .trim()
        .toLowerCase();
    if (filter === 'boys') {
        return g.includes('boy') || g === 'male' || g === 'm' || g.startsWith('boy');
    }
    return g.includes('girl') || g === 'female' || g === 'f' || g.startsWith('girl');
}
