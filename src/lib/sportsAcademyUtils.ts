import type { SupabaseClient } from '@supabase/supabase-js';
import { format, parseISO, startOfDay } from 'date-fns';
import { Camper } from '../api/campers';

export type SportsAcademyEnrollment = {
    id?: string;
    child_id: string;
    sport_name: string;
    instructor?: string | null;
    schedule_periods?: string[] | null;
    start_date?: string | null;
    end_date?: string | null;
    weekdays?: string[] | null;
    notes?: string | null;
    child?: Camper | null;
    children?: Camper | null;
    [key: string]: unknown;
};

const CHILD_BATCH_SIZE = 500;

export function normalizeSessionDateYmd(date: string | null | undefined): string | null {
    if (!date) return null;
    const trimmed = String(date).trim();
    if (!trimmed) return null;
    return trimmed.split('T')[0];
}

export function isLegacySportsAcademyRange(
    enrollment: Pick<SportsAcademyEnrollment, 'start_date' | 'end_date'>,
): boolean {
    const start = normalizeSessionDateYmd(enrollment.start_date);
    const end = normalizeSessionDateYmd(enrollment.end_date);
    if (!start || !end) return false;
    return end !== start;
}

export function formatSportsAcademySessionDate(
    enrollment: Pick<SportsAcademyEnrollment, 'start_date' | 'end_date'>,
): string {
    const start = normalizeSessionDateYmd(enrollment.start_date);
    const end = normalizeSessionDateYmd(enrollment.end_date);
    if (!start && !end) return 'No session date';

    const fmt = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-US');

    if (start && isLegacySportsAcademyRange(enrollment) && end) {
        return `${fmt(start)} - ${fmt(end)}`;
    }

    return fmt(start || end!);
}

export function buildSportsAcademySessionDates(sessionDate: string | null | undefined): {
    start_date: string | null;
    end_date: string | null;
} {
    const normalized = normalizeSessionDateYmd(sessionDate);
    return {
        start_date: normalized,
        end_date: normalized,
    };
}

function matchesWeekdayFilter(enrollment: SportsAcademyEnrollment, day: Date): boolean {
    const weekdays = (enrollment.weekdays || []).filter(Boolean);
    if (weekdays.length === 0) return true;
    return weekdays.includes(format(day, 'EEEE'));
}

export function enrollmentOccursOnDate(enrollment: SportsAcademyEnrollment, date: Date): boolean {
    if (!enrollment.start_date) return false;

    const day = startOfDay(date);
    const start = startOfDay(parseISO(normalizeSessionDateYmd(enrollment.start_date)!));

    if (!isLegacySportsAcademyRange(enrollment)) {
        return day.getTime() === start.getTime() && matchesWeekdayFilter(enrollment, day);
    }

    const end = startOfDay(parseISO(normalizeSessionDateYmd(enrollment.end_date)!));
    if (day < start || day > end) return false;
    return matchesWeekdayFilter(enrollment, day);
}

export function sportsAcademyCamperName(enrollment: SportsAcademyEnrollment): string {
    const child = enrollment.child ?? enrollment.children;
    const name = String(child?.name ?? '').trim();
    return name || 'Unknown Camper';
}

export function enrollmentMatchesSpecialistSports(
    enrollment: SportsAcademyEnrollment,
    assignedSports: string[] | null,
): boolean {
    if (!assignedSports || assignedSports.length === 0) return true;
    return assignedSports.includes(enrollment.sport_name);
}

export async function enrichSportsAcademyEnrollments(
    client: SupabaseClient,
    enrollments: SportsAcademyEnrollment[],
    companyId: string,
    season: string,
): Promise<SportsAcademyEnrollment[]> {
    if (enrollments.length === 0) return [];

    const childIds = Array.from(new Set(enrollments.map((e) => e.child_id).filter(Boolean)));
    const childMap = new Map<string, Camper>();

    for (let i = 0; i < childIds.length; i += CHILD_BATCH_SIZE) {
        const batch = childIds.slice(i, i + CHILD_BATCH_SIZE);
        const { data, error } = await client
            .from('children')
            .select('*, division:divisions(id, name, gender, sort_order)')
            .eq('company_id', companyId)
            .eq('season', season)
            .in('id', batch);

        if (error) throw error;
        (data || []).forEach((row) => {
            childMap.set(row.id as string, row as Camper);
        });
    }

    return enrollments.map((enrollment) => {
        const embedded = enrollment.child ?? enrollment.children;
        const embeddedName = String(embedded?.name ?? '').trim();
        const resolved = embeddedName ? embedded : childMap.get(enrollment.child_id) ?? embedded ?? null;
        return {
            ...enrollment,
            child: resolved,
            children: resolved,
        };
    });
}
