import type { SupabaseClient } from '@supabase/supabase-js';
import { mergeMedicationsForDate, type MedicationLogRow } from './medicationSchedule';

const PAGE_SIZE = 1000;

const MEDICATION_SELECT = `
  *,
  children (
    name,
    division_id,
    divisions (name)
  )
`;

async function fetchPaginated<T>(
    run: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
    const rows: T[] = [];
    let from = 0;

    for (;;) {
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await run(from, to);
        if (error) throw error;

        const batch = data || [];
        rows.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    return rows;
}

const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const addDaysYmd = (ymd: string, days: number): string => {
    const [y, m, d] = ymd.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    return formatDateISO(date);
};

const eachDayInclusive = (startYmd: string, endYmd: string): string[] => {
    const [sy, sm, sd] = startYmd.split('-').map(Number);
    const [ey, em, ed] = endYmd.split('-').map(Number);
    const cur = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const days: string[] = [];
    while (cur <= end) {
        days.push(formatDateISO(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
};

export function resolveMedicationReportDateRange(
    startDate: string,
    endDate: string,
): { rangeStart: string; rangeEnd: string } {
    const todayYmd = formatDateISO(new Date());
    const rangeStart = startDate || todayYmd;
    const rangeEnd = endDate || (startDate ? addDaysYmd(startDate, 31) : todayYmd);
    return { rangeStart, rangeEnd };
}

export async function fetchExpandedMedicationSchedule(
    supabase: SupabaseClient,
    companyId: string,
    season: string,
    startYmd: string,
    endYmd: string,
): Promise<MedicationLogRow[]> {
    const { rangeStart, rangeEnd } = resolveMedicationReportDateRange(startYmd, endYmd);

    const [rangeRows, recurringTemplates] = await Promise.all([
        fetchPaginated<MedicationLogRow>((from, to) =>
            supabase
                .from('medication_logs')
                .select(MEDICATION_SELECT)
                .eq('company_id', companyId)
                .eq('season', season)
                .gte('date', rangeStart)
                .lte('date', rangeEnd)
                .order('date')
                .order('id')
                .range(from, to),
        ),
        fetchPaginated<MedicationLogRow>((from, to) =>
            supabase
                .from('medication_logs')
                .select(MEDICATION_SELECT)
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('is_recurring', true)
                .lte('date', rangeEnd)
                .or(`end_date.is.null,end_date.gte.${rangeStart}`)
                .order('date')
                .order('id')
                .range(from, to),
        ),
    ]);

    const expanded: MedicationLogRow[] = [];

    for (const dateYmd of eachDayInclusive(rangeStart, rangeEnd)) {
        const dayRows = rangeRows.filter((row) => row.date === dateYmd);
        const merged = mergeMedicationsForDate(dayRows, recurringTemplates, dateYmd, season);

        for (const row of merged) {
            expanded.push({
                ...row,
                date: dateYmd,
                _displayDate: dateYmd,
            });
        }
    }

    return expanded;
}
