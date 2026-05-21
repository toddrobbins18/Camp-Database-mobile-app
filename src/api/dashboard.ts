import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ageOnLocalDate, isActiveRosterStatus, parseBirthdayCalendarParts } from '../lib/birthdayDate';
import { getCachedJson, setCachedJson } from '../offline/engine';

/** Same as lovable-web-app usePermissions fullDivisionAccessRoles. */
const FULL_DIVISION_ACCESS_ROLES = new Set([
    'admin',
    'super_admin',
    'specialist',
    'staff',
    'health_center',
]);

async function readThroughCache<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
    try {
        const value = await fetcher();
        await setCachedJson(cacheKey, value);
        return value;
    } catch {
        const cached = await getCachedJson<T>(cacheKey);
        if (cached != null) return cached;
        throw new Error('No cached data available');
    }
}

/**
 * Mirrors Dashboard.tsx getDivisionFilter + birthday branch:
 * - null → full division access, do not add .in('division_id', …)
 * - array (possibly empty) → restricted role; add .in only when length > 0
 */
async function resolveDashboardDivisionFilter(companyId: string): Promise<string[] | null> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return [];

    const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', companyId);

    const roles = (roleRows ?? []).map((r) => r.role as string);
    if (roles.some((r) => FULL_DIVISION_ACCESS_ROLES.has(r))) {
        return null;
    }

    const { data: dp } = await supabase
        .from('division_permissions')
        .select('division_id')
        .eq('user_id', user.id)
        .eq('can_access', true);

    const ids = [...new Set((dp ?? []).map((r) => r.division_id).filter(Boolean))] as string[];
    return ids;
}

// Fetch today's birthdays from children and staff — same roster pool as Dashboard + Daily News web (season + calendar DOB parsing).
export const useTodayBirthdays = (
  companyId: string | null,
  season: string | null,
  todayMonth: number,
  todayDay: number,
) => {
  return useQuery({
    queryKey: ['dashboard_birthdays', companyId, season ?? '', todayMonth, todayDay],
        queryFn: async () => {
            if (!companyId) return [];
            const cacheKey = `dashboard_birthdays:${companyId}:${season ?? ''}:${todayMonth}:${todayDay}`;
            return readThroughCache<any[]>(cacheKey, async () => {
                const divisionFilter = await resolveDashboardDivisionFilter(companyId);
                const hasFullAccess = divisionFilter === null;

                let childrenQuery = supabase
                    .from('children')
                    .select('id, name, date_of_birth, division_id, status')
                    .eq('company_id', companyId)
                    .not('date_of_birth', 'is', null);

                if (season != null && String(season).trim() !== '') {
                    childrenQuery = childrenQuery.eq('season', season);
                }

                if (!hasFullAccess && divisionFilter && divisionFilter.length > 0) {
                    childrenQuery = childrenQuery.in('division_id', divisionFilter);
                }

                const { data: childrenRaw, error: childrenError } = await childrenQuery;
                if (childrenError) {
                    console.warn('Birthday children query failed:', childrenError.message);
                }
                const childrenData = (childrenRaw ?? []).filter((c: { status?: string | null }) =>
                    isActiveRosterStatus(c.status),
                );

                let staffQuery = supabase
                    .from('staff')
                    .select('id, name, date_of_birth, status')
                    .eq('company_id', companyId)
                    .not('date_of_birth', 'is', null);

                if (season != null && String(season).trim() !== '') {
                    staffQuery = staffQuery.eq('season', season);
                }

                const { data: staffRaw, error: staffError } = await staffQuery;

                if (staffError) {
                    console.warn('Birthday staff query failed:', staffError.message);
                }
                const staffData = (staffRaw ?? []).filter((s: { status?: string | null }) =>
                    isActiveRosterStatus(s.status),
                );

                const now = new Date();
                const birthdays: any[] = [];

                (childrenData ?? []).forEach((person: any) => {
                    const parts = parseBirthdayCalendarParts(person.date_of_birth);
                    if (!parts) return;
                    if (parts.month !== todayMonth || parts.day !== todayDay) return;
                    birthdays.push({
                        id: person.id,
                        name: person.name || 'Unknown',
                        type: 'child',
                        age: ageOnLocalDate(parts, now),
                    });
                });

                (staffData ?? []).forEach((person: any) => {
                    const parts = parseBirthdayCalendarParts(person.date_of_birth);
                    if (!parts) return;
                    if (parts.month !== todayMonth || parts.day !== todayDay) return;
                    birthdays.push({
                        id: person.id,
                        name: person.name || 'Unknown',
                        type: 'staff',
                        age: ageOnLocalDate(parts, now),
                    });
                });

                return birthdays;
            });
        },
        enabled: !!companyId,
    });
};

// Fetch today's activities / field trips (activities_field_trips — uses event_date + season, not legacy `date`)
export const useTodayEvents = (
    companyId: string | null,
    todayString: string,
    season: string | null,
    /** When true (e.g. dashboard focused), poll so rows added on web show without app reload. */
    pollWhileFocused = false,
) => {
    const seasonKey = season ?? '';
    return useQuery({
        queryKey: ['dashboard_events', companyId, todayString, seasonKey],
        queryFn: async () => {
            if (!companyId) return [];
            const cacheKey = `dashboard_events:${companyId}:${todayString}:${seasonKey}`;
            return readThroughCache<any[]>(cacheKey, async () => {
                let q = supabase
                    .from('activities_field_trips')
                    .select('id, title, description, event_date, time, location')
                    .eq('company_id', companyId)
                    .eq('event_date', todayString)
                    .order('time', { ascending: true });
                if (seasonKey) {
                    q = q.eq('season', seasonKey);
                }
                const { data, error } = await q;
                if (error) throw error;
                return data || [];
            });
        },
        enabled: !!companyId,
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchInterval: pollWhileFocused ? 45_000 : false,
        refetchIntervalInBackground: false,
    });
};

/** Upcoming transportation trips from `trips` (Timber Lake Camp dashboard). */
export const useUpcomingTripsForDashboard = (
    companyId: string | null,
    todayString: string,
    season: string | null,
    enabled: boolean,
) => {
    const seasonKey = season ?? '';
    return useQuery({
        queryKey: ['dashboard_upcoming_trips', companyId, todayString, seasonKey],
        queryFn: async () => {
            if (!companyId) return [];
            const cacheKey = `dashboard_upcoming_trips:${companyId}:${todayString}:${seasonKey}`;
            return readThroughCache<any[]>(cacheKey, async () => {
                let q = supabase
                    .from('trips')
                    .select('id, name, date, type, departure_time, destination')
                    .eq('company_id', companyId)
                    .gte('date', todayString)
                    .order('date', { ascending: true })
                    .limit(8);
                if (seasonKey) {
                    q = q.eq('season', seasonKey);
                }
                const { data, error } = await q;
                if (error) throw error;
                return data || [];
            });
        },
        enabled: !!companyId && enabled,
    });
};

/** Daily News schedule: same as main app Daily Notes – sports_calendar + activities_field_trips + special_events_activities by event_date and season, merged and sorted by time. */
export interface DailyNewsScheduleEvent {
    id: string;
    title: string;
    time?: string;
    location?: string;
    description?: string;
    type: string;
}

export const useDailyNewsSchedule = (companyId: string | null, todayString: string, season: string | null) => {
    return useQuery({
        queryKey: ['daily_news_schedule', companyId, todayString, season],
        queryFn: async (): Promise<DailyNewsScheduleEvent[]> => {
            if (!companyId) return [];
            const cacheKey = `daily_news_schedule:${companyId}:${todayString}:${season ?? ''}`;
            return readThroughCache<DailyNewsScheduleEvent[]>(cacheKey, async () => {
                const events: DailyNewsScheduleEvent[] = [];
                const seasonFilter = season || '2026';

                const [sportsRes, activitiesRes, specialRes] = await Promise.all([
                    supabase
                        .from('sports_calendar')
                        .select('id, title, time, location, description')
                        .eq('company_id', companyId)
                        .eq('event_date', todayString)
                        .eq('season', seasonFilter)
                        .order('time'),
                    supabase
                        .from('activities_field_trips')
                        .select('id, title, time, location, description')
                        .eq('company_id', companyId)
                        .eq('event_date', todayString)
                        .eq('season', seasonFilter)
                        .order('time'),
                    supabase
                        .from('special_events_activities')
                        .select('id, title, time_slot, location, description')
                        .eq('company_id', companyId)
                        .eq('event_date', todayString)
                        .eq('season', seasonFilter)
                        .order('time_slot'),
                ]);

                if (sportsRes.data) {
                    events.push(...sportsRes.data.map((e) => ({ ...e, type: 'Sports' })));
                }
                if (activitiesRes.data) {
                    events.push(...activitiesRes.data.map((e) => ({ ...e, type: 'Activity' })));
                }
                if (specialRes.data) {
                    events.push(
                        ...specialRes.data.map((e) => ({
                            id: e.id,
                            title: e.title,
                            time: e.time_slot,
                            location: e.location,
                            description: e.description,
                            type: 'Special Event',
                        }))
                    );
                }

                events.sort((a, b) => {
                    const tA = a.time || '';
                    const tB = b.time || '';
                    if (!tA) return 1;
                    if (!tB) return -1;
                    return tA.localeCompare(tB);
                });
                return events;
            });
        },
        enabled: !!companyId,
    });
};

// Fetch today's menu from menu_items table
export const useTodayMeals = (
    companyId: string | null,
    todayString: string,
    season?: string | null,
) => {
    return useQuery({
        queryKey: ['dashboard_meals', companyId, todayString, season ?? ''],
        queryFn: async () => {
            if (!companyId) return null;
            const cacheKey = `dashboard_meals:${companyId}:${todayString}:${season ?? ''}`;
            return readThroughCache<{ breakfast: string; lunch: string; snack: string; dinner: string } | null>(
                cacheKey,
                async () => {
                    let q = supabase
                        .from('menu_items')
                        .select('*')
                        .eq('company_id', companyId)
                        .eq('date', todayString);
                    if (season != null && String(season).trim() !== '') {
                        q = q.or(`season.eq.${season},season.is.null`);
                    }
                    const { data, error } = await q;

                    if (error) throw error;

                    const meals = { breakfast: '', lunch: '', snack: '', dinner: '' };
                    (data || []).forEach((item) => {
                        const type = item.meal_type?.toLowerCase() || '';
                        const content = item.items ?? item.description ?? '';
                        if (type === 'breakfast') meals.breakfast = content;
                        if (type === 'lunch') meals.lunch = content;
                        if (type === 'dinner') meals.dinner = content;
                        if (type === 'snack') meals.snack = content;
                    });
                    return meals;
                }
            );
        },
        enabled: !!companyId,
    });
};

/** Today's sports calendar rows (matches web Dashboard for Athletics). */
export const useTodaySportsCalendar = (
    companyId: string | null,
    todayString: string,
    season: string | null,
    enabled: boolean,
) => {
    return useQuery({
        queryKey: ['dashboard_sports_calendar', companyId, todayString, season],
        queryFn: async () => {
            if (!companyId || !season) return [];
            const cacheKey = `dashboard_sports_calendar:${companyId}:${todayString}:${season}`;
            return readThroughCache<any[]>(cacheKey, async () => {
                const { data, error } = await supabase
                    .from('sports_calendar')
                    .select('id, title, time, location, sport_type, event_date')
                    .eq('company_id', companyId)
                    .eq('event_date', todayString)
                    .eq('season', season)
                    .order('time');
                if (error) throw error;
                return data || [];
            });
        },
        enabled: !!companyId && !!season && enabled,
    });
};

/** Today's special events / evening activities (matches web `special_events_activities`). */
export const useTodaySpecialEventsActivities = (
    companyId: string | null,
    todayString: string,
    season: string | null,
    enabled: boolean,
) => {
    return useQuery({
        queryKey: ['dashboard_special_events_activities', companyId, todayString, season],
        queryFn: async () => {
            if (!companyId || !season) return [];
            const cacheKey = `dashboard_special_events_activities:${companyId}:${todayString}:${season}`;
            return readThroughCache<any[]>(cacheKey, async () => {
                const { data, error } = await supabase
                    .from('special_events_activities')
                    .select('id, title, time_slot, location, description, event_type, season')
                    .eq('company_id', companyId)
                    .eq('event_date', todayString)
                    .order('time_slot');
                if (error) throw error;
                const rows = data || [];
                const matched = rows.filter(
                    (e: { season?: string | null }) => e.season === season || e.season == null,
                );
                if (matched.length > 0) return matched;
                return rows;
            });
        },
        enabled: !!companyId && !!season && enabled,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
};

/** Single row from `daily_wolf_content` for Timber Lake West / Daily Wolf strip. */
export const useDailyWolfContentRow = (
    companyId: string | null,
    todayString: string,
    season: string | null,
    enabled: boolean,
) => {
    return useQuery({
        queryKey: ['daily_wolf_content_dashboard', companyId, todayString, season],
        queryFn: async () => {
            if (!companyId || !season) return null;
            const cacheKey = `daily_wolf_content_dashboard:${companyId}:${todayString}:${season}`;
            return readThroughCache<any | null>(cacheKey, async () => {
                const { data, error } = await supabase
                    .from('daily_wolf_content')
                    .select(
                        'officer_of_day, laundry_info, phone_calls_info, quote_of_the_day, notes',
                    )
                    .eq('company_id', companyId)
                    .eq('date', todayString)
                    .eq('season', season)
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        },
        enabled: !!companyId && !!season && enabled,
    });
};
