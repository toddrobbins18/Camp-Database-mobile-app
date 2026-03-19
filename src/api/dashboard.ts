import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Fetch today's birthdays from children and staff tables (matches original app: Today's Birthdays section)
export const useTodayBirthdays = (companyId: string | null, todayMonth: number, todayDay: number) => {
    return useQuery({
        queryKey: ['dashboard_birthdays', companyId, todayMonth, todayDay],
        queryFn: async () => {
            if (!companyId) return [];

            const birthdays: any[] = [];

            const addBirthdays = (data: any[], type: string) => {
                (data || []).forEach((person: any) => {
                    if (!person.date_of_birth) return;
                    // Parse YYYY-MM-DD directly to avoid timezone shifting (matches web dashboard logic)
                    const parts = String(person.date_of_birth).split('-').map(Number);
                    if (parts.length < 3) return;
                    const [, month, day] = parts;
                    if (month === todayMonth && day === todayDay) {
                        const fullName =
                            person.name ||
                            'Unknown';
                        const birthYear = parts[0] || new Date().getFullYear();
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
                // Mobile schema does not include first_name/last_name; keep in sync with web
                .select('id, name, date_of_birth, division_id, status')
                .eq('company_id', companyId);
            if (childrenError) {
                console.warn('Birthday children query failed:', childrenError.message);
            } else {
                addBirthdays((childrenData ?? []).filter((c: any) => !c.status || c.status === 'active'), 'child');
            }

            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                // Mobile schema does not include first_name/last_name; keep in sync with web
                .select('id, name, date_of_birth, status')
                .eq('company_id', companyId);
            if (staffError) {
                console.warn('Birthday staff query failed:', staffError.message);
            } else {
                addBirthdays((staffData ?? []).filter((s: any) => !s.status || s.status === 'active'), 'staff');
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
