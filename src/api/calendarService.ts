import { supabase } from '../lib/supabase';

export type EventSource = 'sports_calendar' | 'activities_field_trips' | 'special_events_activities';

export interface UnifiedEvent {
    id: string;
    title: string;
    event_date: string;
    time?: string;
    location?: string;
    description?: string;
    source: EventSource;
    type: string;
    division?: any;
    originalData: any;
}

export const calendarService = {
    async fetchAllEvents(companyId: string, season: string) {
        if (!companyId) return [];

        // Fetch all events in parallel as done in tyler-hill
        const [sportsRes, fieldTripsRes, specialRes] = await Promise.all([
            supabase.from("sports_calendar")
                .select(`*, division:divisions(id, name, gender), sports_calendar_divisions(division_id, division:divisions(id, name, gender))`)
                .eq('company_id', companyId)
                .or(`season.eq.${season},season.is.null`),
            supabase.from("activities_field_trips")
                .select(`*, division:divisions(id, name, gender)`)
                .eq('company_id', companyId)
                .or(`season.eq.${season},season.is.null`),
            supabase.from("special_events_activities")
                .select(`*, division:divisions(id, name, gender)`)
                .eq('company_id', companyId)
                .or(`season.eq.${season},season.is.null`)
        ]);

        const unifiedEvents: UnifiedEvent[] = [];

        // Normalize Sports Calendar events
        if (sportsRes.data) {
            sportsRes.data.forEach((event: any) => {
                const divisions = event.sports_calendar_divisions?.map((d: any) => d.division) || (event.division ? [event.division] : []);
                unifiedEvents.push({
                    id: `sports_${event.id}`,
                    title: event.title,
                    event_date: event.event_date,
                    time: event.time,
                    location: event.location,
                    description: event.description,
                    source: 'sports_calendar',
                    type: event.sport_type || 'Sports Event',
                    division: divisions[0],
                    originalData: { ...event, divisions }
                });
            });
        }

        // Normalize Field Trips events
        if (fieldTripsRes.data) {
            fieldTripsRes.data.forEach((event: any) => {
                unifiedEvents.push({
                    id: `fieldtrip_${event.id}`,
                    title: event.title,
                    event_date: event.event_date,
                    time: event.time,
                    location: event.location,
                    description: event.description,
                    source: 'activities_field_trips',
                    type: event.activity_type || 'Field Trip',
                    division: event.division,
                    originalData: event
                });
            });
        }

        // Normalize Special Events events
        if (specialRes.data) {
            specialRes.data.forEach((event: any) => {
                unifiedEvents.push({
                    id: `special_${event.id}`,
                    title: event.title,
                    event_date: event.event_date,
                    time: event.time_slot,
                    location: event.location,
                    description: event.description,
                    source: 'special_events_activities',
                    type: event.event_type || 'Special Event',
                    division: event.division,
                    originalData: event
                });
            });
        }

        return unifiedEvents;
    },

    async fetchDivisions(companyId: string) {
        if (!companyId) return [];
        const { data, error } = await supabase
            .from("divisions")
            .select("*")
            .eq('company_id', companyId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data || [];
    }
};
