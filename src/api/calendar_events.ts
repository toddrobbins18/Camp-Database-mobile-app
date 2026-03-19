import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ===================== CALENDAR / MASTER EVENTS =====================

export type EventSource = 'sports_calendar' | 'activities_field_trips' | 'special_events_activities';

export interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    location?: string;
    description?: string;
    tags?: string[];
    type: string;
    time?: string;
    source: EventSource;
    divisionId?: string;
    divisionName?: string;
    home_away?: string;
    originalData?: any;
}

export interface Division {
    id: string;
    name: string;
    gender?: string;
    sort_order?: number;
}

/**
 * Fetches divisions for the company (for Master Calendar filter).
 */
export const useDivisions = (companyId: string | null) => {
    return useQuery({
        queryKey: ['divisions', companyId],
        queryFn: async (): Promise<Division[]> => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('divisions')
                .select('id, name, gender, sort_order')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });
};

/**
 * Fetches all events from sports_calendar, activities_field_trips, and special_events_activities
 * and merges into a unified CalendarEvent[] for the Master Calendar (aligned with web).
 */
export const useCalendarEvents = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['calendar_events', companyId, season],
        queryFn: async (): Promise<CalendarEvent[]> => {
            if (!companyId) return [];

            const seasonFilter = season || '2026';

            const [sportsRes, activitiesRes, specialRes] = await Promise.all([
                supabase
                    .from('sports_calendar')
                    .select('*, division:divisions(id, name, gender)')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true }),
                supabase
                    .from('activities_field_trips')
                    .select('*, division:divisions(id, name, gender)')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true }),
                supabase
                    .from('special_events_activities')
                    .select('*, division:divisions(id, name, gender)')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true }),
            ]);

            const sportsData = (sportsRes.data || []).filter((e: any) => e.season === seasonFilter || e.season == null);
            const activitiesData = (activitiesRes.data || []).filter((e: any) => e.season === seasonFilter || e.season == null);
            const specialData = (specialRes.data || []).filter((e: any) => e.season === seasonFilter || e.season == null);

            const events: CalendarEvent[] = [];

            sportsData.forEach((event: any) => {
                const div = event.division;
                events.push({
                    id: `sports_${event.id}`,
                    title: event.title || '',
                    date: event.event_date,
                    location: event.location,
                    description: event.description,
                    type: event.sport_type || event.custom_sport_type || 'Sports',
                    time: event.time || event.start_time_field || event.depart_time,
                    source: 'sports_calendar',
                    divisionId: div?.id,
                    divisionName: div?.name,
                    home_away: event.home_away,
                    tags: ['Sports', event.sport_type || event.custom_sport_type, div?.name].filter(Boolean),
                    originalData: event,
                });
            });

            activitiesData.forEach((event: any) => {
                const div = event.division;
                events.push({
                    id: `fieldtrip_${event.id}`,
                    title: event.title || '',
                    date: event.event_date,
                    location: event.location,
                    description: event.description,
                    type: event.activity_type || 'Field Trip',
                    time: event.time,
                    source: 'activities_field_trips',
                    divisionId: div?.id,
                    divisionName: div?.name,
                    tags: ['Field Trip', event.activity_type, div?.name].filter(Boolean),
                    originalData: event,
                });
            });

            specialData.forEach((event: any) => {
                const div = event.division;
                events.push({
                    id: `special_${event.id}`,
                    title: event.title || '',
                    date: event.event_date,
                    location: event.location,
                    description: event.description,
                    type: event.event_type || 'Special Event',
                    time: event.time_slot || event.start_time,
                    source: 'special_events_activities',
                    divisionId: div?.id,
                    divisionName: div?.name,
                    tags: ['Special Event', event.event_type, div?.name].filter(Boolean),
                    originalData: event,
                });
            });

            return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        },
        enabled: !!companyId,
    });
};

// ===================== SPECIAL EVENTS =====================

export interface SpecialEvent {
    id: string;
    title: string;
    event_date: string;
    event_type: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    description?: string;
    divisions?: string[];
    company_id?: string;
    season?: string;
}

export const useSpecialEvents = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['special_events', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('sports_calendar')
                .select('*')
                .eq('company_id', companyId)
                .in('event_type', ['special-event', 'evening-activity', 'campfire', 'movie-night', 'talent-show', 'game-night', 'other'])
                .order('event_date', { ascending: true });

            if (error) throw error;
            return (data || []) as SpecialEvent[];
        },
        enabled: !!companyId,
    });
};

export const useAddSpecialEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (eventData: Omit<SpecialEvent, 'id'>) => {
            const { data, error } = await supabase
                .from('sports_calendar')
                .insert([{
                    title: eventData.title,
                    event_date: eventData.event_date,
                    event_type: eventData.event_type || 'special-event',
                    start_time: eventData.start_time,
                    location: eventData.location,
                    company_id: eventData.company_id,
                    season: eventData.season,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['special_events', variables.company_id] });
            queryClient.invalidateQueries({ queryKey: ['calendar_events', variables.company_id] });
        },
    });
};
