import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ===================== CALENDAR / MASTER EVENTS =====================

export type EventSource = 'sports_calendar' | 'activities_field_trips' | 'special_events_activities' | 'tiger_times';

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
 * Fetches all events from sports_calendar, activities_field_trips, special_events_activities,
 * and tiger_times (daily_wolf_content), aligned with web Master Calendar workflow.
 * and merges into a unified CalendarEvent[] for the Master Calendar (aligned with web).
 */
export const useCalendarEvents = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['calendar_events', companyId, season],
        queryFn: async (): Promise<CalendarEvent[]> => {
            if (!companyId) return [];

            const seasonFilter = season || '2026';

            // Mirror web behavior: pull in two pages per table to avoid 1000-row truncation.
            const [
                sportsBatch1,
                sportsBatch2,
                activitiesBatch1,
                activitiesBatch2,
                specialBatch1,
                specialBatch2,
                tigerTimesRes,
            ] = await Promise.all([
                supabase
                    .from('sports_calendar')
                    .select('*, division:divisions(id, name, gender), sports_calendar_divisions(division_id, division:divisions(id, name, gender))')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true })
                    .range(0, 999),
                supabase
                    .from('sports_calendar')
                    .select('*, division:divisions(id, name, gender), sports_calendar_divisions(division_id, division:divisions(id, name, gender))')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true })
                    .range(1000, 1999),
                supabase
                    .from('activities_field_trips')
                    .select('*, division:divisions(id, name, gender)')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true })
                    .range(0, 999),
                supabase
                    .from('activities_field_trips')
                    .select('*, division:divisions(id, name, gender)')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true })
                    .range(1000, 1999),
                supabase
                    .from('special_events_activities')
                    .select('*, division:divisions(id, name, gender)')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true })
                    .range(0, 999),
                supabase
                    .from('special_events_activities')
                    .select('*, division:divisions(id, name, gender)')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true })
                    .range(1000, 1999),
                supabase
                    .from('daily_wolf_content')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('season', seasonFilter)
                    .order('date', { ascending: true }),
            ]);

            const sportsData = [...(sportsBatch1.data || []), ...(sportsBatch2.data || [])]
                .filter((e: any) => e.season === seasonFilter || e.season == null);
            const activitiesData = [...(activitiesBatch1.data || []), ...(activitiesBatch2.data || [])]
                .filter((e: any) => e.season === seasonFilter || e.season == null);
            const specialData = [...(specialBatch1.data || []), ...(specialBatch2.data || [])]
                .filter((e: any) => e.season === seasonFilter || e.season == null);

            const events: CalendarEvent[] = [];

            sportsData.forEach((event: any) => {
                const divisions =
                    event.sports_calendar_divisions?.map((d: any) => d.division).filter(Boolean)
                    || (event.division ? [event.division] : []);
                const div = divisions[0];
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
                    originalData: { ...event, divisions },
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

            // Tiger Times (Daily Wolf content): each populated field becomes a calendar event.
            const tigerFields: { field: string; label: string; colorKey: string }[] = [
                { field: 'laundry_info', label: 'Laundry', colorKey: 'TT: Laundry' },
                { field: 'phone_calls_info', label: 'Phone Calls', colorKey: 'TT: Phone Calls' },
                { field: 'outside_event', label: 'Outside Events', colorKey: 'TT: Outside Events' },
                { field: 'staff_days_off', label: 'Staff Days Off', colorKey: 'TT: Staff Days Off' },
                { field: 'od_notes', label: 'OD Notes', colorKey: 'TT: OD Notes' },
            ];

            (tigerTimesRes.data || []).forEach((entry: any) => {
                tigerFields.forEach(({ field, label, colorKey }) => {
                    const value = entry?.[field];
                    if (typeof value === 'string' && value.trim()) {
                        events.push({
                            id: `tt_${entry.id}_${field}`,
                            title: `Tiger Times: ${label}`,
                            date: entry.date,
                            location: '',
                            description: value,
                            type: colorKey,
                            source: 'tiger_times',
                            tags: ['Tiger Times', label],
                            originalData: { ...entry, tiger_times_category: colorKey },
                        });
                    }
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
    time_slot?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    description?: string;
    chaperone?: string;
    emoji?: string;
    file_url?: string;
    file_name?: string;
    divisions?: Array<{ id: string; name: string }>;
    company_id?: string;
    season?: string;
}

export const useSpecialEvents = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['special_events', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];

            const [eventsRes, linksRes] = await Promise.all([
                supabase
                    .from('special_events_activities')
                    .select('*')
                    .eq('company_id', companyId)
                    .order('event_date', { ascending: true })
                    .order('time_slot', { ascending: true }),
                supabase
                    .from('special_events_divisions')
                    .select('event_id, division_id, divisions(id, name)')
                    .eq('company_id', companyId),
            ]);

            if (eventsRes.error) throw eventsRes.error;
            if (linksRes.error) throw linksRes.error;

            const seasonFilter = season || '2026';
            const events = (eventsRes.data || []).filter(
                (e: any) => e.season === seasonFilter || e.season == null
            );

            const divisionMap = new Map<string, Array<{ id: string; name: string }>>();
            (linksRes.data || []).forEach((link: any) => {
                if (!divisionMap.has(link.event_id)) divisionMap.set(link.event_id, []);
                if (link.divisions) {
                    divisionMap.get(link.event_id)!.push({
                        id: link.divisions.id,
                        name: link.divisions.name,
                    });
                }
            });

            return events.map((event: any) => ({
                ...event,
                divisions: divisionMap.get(event.id) || [],
            })) as SpecialEvent[];
        },
        enabled: !!companyId,
    });
};

export const useAddSpecialEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            eventData: Omit<SpecialEvent, 'id' | 'divisions'> & { division_ids?: string[] }
        ) => {
            const { data, error } = await supabase
                .from('special_events_activities')
                .insert([{
                    title: eventData.title,
                    event_date: eventData.event_date,
                    event_type: eventData.event_type || 'special-event',
                    time_slot: eventData.time_slot || 'TBD',
                    start_time: eventData.start_time || null,
                    end_time: eventData.end_time || null,
                    location: eventData.location || null,
                    description: eventData.description || null,
                    chaperone: eventData.chaperone || null,
                    emoji: eventData.emoji || null,
                    file_url: eventData.file_url || null,
                    file_name: eventData.file_name || null,
                    company_id: eventData.company_id,
                    season: eventData.season,
                }])
                .select()
                .single();

            if (error) throw error;

            if (eventData.division_ids && eventData.division_ids.length > 0) {
                const rows = eventData.division_ids.map((divisionId) => ({
                    event_id: data.id,
                    division_id: divisionId,
                    company_id: eventData.company_id,
                }));
                const { error: divError } = await supabase
                    .from('special_events_divisions')
                    .insert(rows);
                if (divError) throw divError;
            }

            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['special_events', variables.company_id, variables.season] });
            queryClient.invalidateQueries({ queryKey: ['calendar_events', variables.company_id] });
        },
    });
};

export const useUpdateSpecialEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            payload: {
                id: string;
                company_id: string;
                season?: string;
            } & Omit<SpecialEvent, 'id' | 'divisions'> & { division_ids?: string[] }
        ) => {
            const { id, division_ids, ...eventData } = payload;

            const { error } = await supabase
                .from('special_events_activities')
                .update({
                    title: eventData.title,
                    event_date: eventData.event_date,
                    event_type: eventData.event_type || 'special-event',
                    time_slot: eventData.time_slot || 'TBD',
                    start_time: eventData.start_time || null,
                    end_time: eventData.end_time || null,
                    location: eventData.location || null,
                    description: eventData.description || null,
                    chaperone: eventData.chaperone || null,
                    emoji: eventData.emoji || null,
                    file_url: eventData.file_url || null,
                    file_name: eventData.file_name || null,
                    season: eventData.season,
                })
                .eq('id', id)
                .eq('company_id', eventData.company_id);

            if (error) throw error;

            const { error: deleteLinksError } = await supabase
                .from('special_events_divisions')
                .delete()
                .eq('event_id', id)
                .eq('company_id', eventData.company_id);
            if (deleteLinksError) throw deleteLinksError;

            if (division_ids && division_ids.length > 0) {
                const rows = division_ids.map((divisionId) => ({
                    event_id: id,
                    division_id: divisionId,
                    company_id: eventData.company_id,
                }));
                const { error: insertLinksError } = await supabase
                    .from('special_events_divisions')
                    .insert(rows);
                if (insertLinksError) throw insertLinksError;
            }

            return { id };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['special_events', variables.company_id, variables.season] });
            queryClient.invalidateQueries({ queryKey: ['calendar_events', variables.company_id] });
        },
    });
};

export const useDeleteSpecialEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { id: string; company_id: string; season?: string }) => {
            const { error } = await supabase
                .from('special_events_activities')
                .delete()
                .eq('id', payload.id)
                .eq('company_id', payload.company_id);
            if (error) throw error;
            return payload;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['special_events', variables.company_id, variables.season] });
            queryClient.invalidateQueries({ queryKey: ['calendar_events', variables.company_id] });
        },
    });
};
