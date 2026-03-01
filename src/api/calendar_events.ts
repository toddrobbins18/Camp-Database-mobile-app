import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ===================== CALENDAR / MASTER EVENTS =====================

export interface CalendarEvent {
    id: string;
    title: string;
    date: string;       // ISO date string
    location?: string;
    tags?: string[];
    type: 'sports' | 'field-trip' | 'special-event';
    time?: string;
    source: 'sports_calendar' | 'activities_field_trips';
}

/**
 * Fetches all events from both sports_calendar and activities_field_trips
 * and merges them into a unified CalendarEvent[] for the Master Calendar.
 */
export const useCalendarEvents = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['calendar_events', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];

            // Fetch sports calendar events
            const { data: sportsData, error: sportsError } = await supabase
                .from('sports_calendar')
                .select('*')
                .eq('company_id', companyId)
                .order('event_date', { ascending: true });

            if (sportsError) throw sportsError;

            // Fetch activities/field trips
            const { data: activitiesData, error: activitiesError } = await supabase
                .from('activities_field_trips')
                .select('*')
                .eq('company_id', companyId)
                .order('event_date', { ascending: true });

            if (activitiesError) throw activitiesError;

            // Map sports events
            const sportsEvents: CalendarEvent[] = (sportsData || []).map((event: any) => ({
                id: event.id,
                title: event.title || event.event_name || '',
                date: event.event_date,
                location: event.location || '',
                tags: [
                    event.event_type === 'special-event' ? 'Special Event' : 'Sports',
                    event.sport_type || event.custom_sport_type || '',
                    ...(event.division_name ? [event.division_name] : []),
                ].filter(Boolean),
                type: event.event_type === 'special-event' ? 'special-event' as const
                    : event.event_type === 'evening-activity' ? 'special-event' as const
                        : 'sports' as const,
                time: event.start_time || event.depart_time || '',
                source: 'sports_calendar' as const,
            }));

            // Map field trip events
            const activityEvents: CalendarEvent[] = (activitiesData || []).map((event: any) => ({
                id: event.id,
                title: event.title || '',
                date: event.event_date,
                location: event.location || '',
                tags: [
                    event.activity_type === 'field-trip' ? 'Field Trip' : 'Sports',
                    event.activity_type || '',
                ].filter(Boolean),
                type: event.activity_type === 'field-trip' ? 'field-trip' as const : 'sports' as const,
                time: event.depart_from_camp || '',
                source: 'activities_field_trips' as const,
            }));

            return [...sportsEvents, ...activityEvents].sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
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
