import { format, parseISO } from 'date-fns';
import { isAsNeededMedication } from './medicationMealTimeDisplay';
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
    dosage?: string | null;
    scheduled_time?: string | null;
    notes?: string | null;
    administered?: boolean;
    administered_by?: string | null;
    administered_at?: string | null;
    _fromRecurringTemplate?: boolean;
    _templateId?: string;
    _displayDate?: string;
};

function normalizeMealTimeEntries(mealTime: unknown): string[] {
    if (mealTime == null) return [];
    if (Array.isArray(mealTime)) {
        return mealTime.map((entry) => String(entry).trim()).filter(Boolean).sort();
    }
    if (typeof mealTime === 'string') {
        const trimmed = mealTime.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed) as unknown;
                if (Array.isArray(parsed)) {
                    return parsed.map((entry) => String(entry).trim()).filter(Boolean).sort();
                }
            } catch {
                /* use raw string */
            }
        }
        return [trimmed];
    }
    const single = String(mealTime).trim();
    return single ? [single] : [];
}

function mealTimeKey(mealTime: unknown): string {
    return normalizeMealTimeEntries(mealTime).join('|');
}

function preferMedicationRow(a: MedicationLogRow, b: MedicationLogRow): boolean {
    if (Boolean(a.administered) !== Boolean(b.administered)) {
        return Boolean(a.administered);
    }
    if (Boolean(a.is_recurring) !== Boolean(b.is_recurring)) {
        return !a.is_recurring;
    }
    if (Boolean(a._fromRecurringTemplate) !== Boolean(b._fromRecurringTemplate)) {
        return !a._fromRecurringTemplate;
    }
    return false;
}

export function dedupeMedicationSlots(rows: MedicationLogRow[]): MedicationLogRow[] {
    const byKey = new Map<string, MedicationLogRow>();
    for (const row of rows) {
        const key = medicationSlotKey(row);
        const existing = byKey.get(key);
        if (!existing || preferMedicationRow(row, existing)) {
            byKey.set(key, row);
        }
    }
    return [...byKey.values()];
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
    const dedupedDateRows = dedupeMedicationSlots(dateRows);
    const result: MedicationLogRow[] = [...dedupedDateRows];
    const existingKeys = new Set(dedupedDateRows.map((row) => medicationSlotKey(row)));

    for (const template of recurringRows) {
        if (!template.is_recurring) continue;
        if (isAsNeededMedication(template)) continue;
        if (template.date === dateYmd) continue;
        if (!medicationAppliesOnDate(template, dateYmd, season)) continue;
        const key = medicationSlotKey(template);
        if (existingKeys.has(key)) continue;

        const dayLog = dedupedDateRows.find((row) => medicationSlotKey(row) === key);
        if (dayLog?.administered === true) continue;

        result.push({
            ...template,
            administered: false,
            administered_by: null,
            administered_at: null,
            _fromRecurringTemplate: true,
            _templateId: template.id,
            _displayDate: dateYmd,
        });
        existingKeys.add(key);
    }

    return dedupeMedicationSlots(result);
}

export function findDaySpecificMedicationLog(
    dayRows: Pick<MedicationLogRow, 'id' | 'child_id' | 'medication_name' | 'meal_time'>[],
    med: Pick<MedicationLogRow, 'child_id' | 'medication_name' | 'meal_time'>,
): Pick<MedicationLogRow, 'id'> | undefined {
    const slotKey = medicationSlotKey(med);
    return dayRows.find((row) => medicationSlotKey(row) === slotKey);
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
