import type { SupabaseClient } from '@supabase/supabase-js';
import { Camper } from '../api/campers';

export type SportsAcademyEnrollment = {
    id?: string;
    child_id: string;
    sport_name: string;
    child?: Camper | null;
    children?: Camper | null;
    [key: string]: unknown;
};

const CHILD_BATCH_SIZE = 500;

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
