import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Fetch today's birthdays from children and staff tables (matches original app: Today's Birthdays section)
export const useTodayBirthdays = (companyId: string | null, todayMonth: number, todayDay: number) => {
    return useQuery({
        queryKey: ['dashboard_birthdays', companyId, todayMonth, todayDay],
        queryFn: async () => {
            if (!companyId) return [];

            const birthdays: any[] = [];

            const parseBirthdayValue = (value: any): { year?: number; month?: number; day?: number } | null => {
                if (!value) return null;
                const raw = String(value).trim();
                if (!raw) return null;

                // Common DB formats we might see:
                // 1) YYYY-MM-DD (date type)
                // 2) MM/DD/YYYY (older mobile saves)
                // 3) ISO strings with time zone (rare but possible)
                if (/^\d{4}-\d{1,2}-\d{1,2}/.test(raw)) {
                    const [y, m, d] = raw.split('-').map((n) => parseInt(n, 10));
                    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
                        return { year: y, month: m, day: d };
                    }
                }

                if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
                    const [m, d, y] = raw.split('/').map((n) => parseInt(n, 10));
                    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
                        return { year: y, month: m, day: d };
                    }
                }

                const parsed = new Date(raw);
                if (!Number.isNaN(parsed.getTime())) {
                    // Use UTC to avoid timezone shifting on ISO strings.
                    const year = parsed.getUTCFullYear();
                    const month = parsed.getUTCMonth() + 1;
                    const day = parsed.getUTCDate();
                    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
                        return { year, month, day };
                    }
                }

                return null;
            };

            const addBirthdays = (data: any[], type: string) => {
                (data || []).forEach((person: any) => {
                    if (!person.date_of_birth) return;

                    const parsed = parseBirthdayValue(person.date_of_birth);
                    if (!parsed?.month || !parsed?.day) return;

                    const isMatch = parsed.month === todayMonth && parsed.day === todayDay;
                    if (isMatch) {
                        const fullName =
                            person.name ||
                            'Unknown';
                        const birthYear = parsed.year ?? new Date().getFullYear();
                        const age = new Date().getFullYear() - birthYear;
                        birthdays.push({
                            id: person.id,
                            name: fullName,
                            type,
                            age,
                        });
                    }
                });
            };

            const { data: childrenData, error: childrenError } = await supabase
                .from('children')
                // Keep in sync with web birthday query fields
                .select('id, name, date_of_birth, division_id, status')
                .eq('company_id', companyId);
            if (childrenError) {
                console.warn('Birthday children query failed:', childrenError.message);
            } else {
                addBirthdays(
                    (childrenData ?? []).filter((c: any) => {
                        const status = c?.status ? String(c.status).toLowerCase() : '';
                        return !status || status === 'active';
                    }),
                    'child'
                );
            }

            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                // Mobile schema does not include first_name/last_name; keep in sync with web
                .select('id, name, date_of_birth, status')
                .eq('company_id', companyId);
            if (staffError) {
                console.warn('Birthday staff query failed:', staffError.message);
            } else {
                addBirthdays(
                    (staffData ?? []).filter((s: any) => {
                        const status = s?.status ? String(s.status).toLowerCase() : '';
                        return !status || status === 'active';
                    }),
                    'staff'
                );
            }

            return birthdays;
        },
        enabled: !!companyId,
    });
};

// Fetch today's events from activities_field_trips table
export const useTodayEvents = (companyId: string | null, todayString: string) => {
    return useQuery({
        queryKey: ['dashboard_events', companyId, todayString],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('activities_field_trips')
                .select('id, title, description, date, time, location')
                .eq('company_id', companyId)
                .eq('date', todayString)
                .order('time', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
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

export const useDailyNewsSchedule = (
    companyId: string | null,
    todayString: string,
    season: string | null
) => {
    return useQuery({
        queryKey: ['daily_news_schedule', companyId, todayString, season],
        queryFn: async (): Promise<DailyNewsScheduleEvent[]> => {
            if (!companyId) return [];
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
                events.push(...sportsRes.data.map(e => ({ ...e, type: 'Sports' })));
            }
            if (activitiesRes.data) {
                events.push(...activitiesRes.data.map(e => ({ ...e, type: 'Activity' })));
            }
            if (specialRes.data) {
                events.push(
                    ...specialRes.data.map(e => ({
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
        },
        enabled: !!companyId,
    });
};

// Fetch today's menu from menu_items table
export const useTodayMeals = (companyId: string | null, todayString: string) => {
    return useQuery({
        queryKey: ['dashboard_meals', companyId, todayString],
        queryFn: async () => {
            if (!companyId) return null;
            try {
                const { data, error } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('date', todayString);

                if (error) throw error;

                const meals = { breakfast: '', lunch: '', snack: '', dinner: '' };
                (data || []).forEach(item => {
                    const type = item.meal_type?.toLowerCase() || '';
                    if (type === 'breakfast') meals.breakfast = item.items;
                    if (type === 'lunch') meals.lunch = item.items;
                    if (type === 'dinner') meals.dinner = item.items;
                    if (type === 'snack') meals.snack = item.items;
                });
                return meals;
            } catch {
                return null;
            }
        },
        enabled: !!companyId,
    });
};
