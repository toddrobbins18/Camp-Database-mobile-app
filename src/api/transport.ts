import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';

export interface TransportTrip {
    id?: string;
    company_id: string;
    season: string;
    name: string;
    type: string;
    destination?: string | null;
    date: string;
    end_date?: string | null;
    is_multi_day?: boolean;
    departure_time?: string | null;
    return_time?: string | null;
    chaperone?: string | null;
    capacity?: number | null;
    status?: string;
    event_type?: string | null;
    event_length?: string | null;
    transportation_type?: string | null;
    driver?: string | null;
    meal?: string | null;
    sports_event_id?: string | null;
    created_at?: string;
    trip_attendees?: { id: string }[];
    /** Populated by useTrips: trip_attendees + sports_event_roster + sports_event_staff when sports_event_id set */
    attendingCount?: number;
}

const tripsCacheKey = (companyId: string, season: string) => `trips:${companyId}:${season}`;

async function applyQueuedTripOps(base: TransportTrip[]): Promise<TransportTrip[]> {
    const out = [...base];
    const queued = await listQueued('trips.');
    for (const q of queued) {
        if (q.action === 'trips.insert') {
            const rows = Array.isArray(q.payload) ? (q.payload as any[]) : [q.payload as any];
            for (const row of rows) out.push({ ...(row as TransportTrip), id: (row.id as string) || `offline-${q.id}` });
        } else if (q.action === 'trips.update') {
            const payload = q.payload as any;
            const id = payload?.id as string | undefined;
            const update = payload?.update as Partial<TransportTrip> | undefined;
            if (!id || !update) continue;
            const idx = out.findIndex((t) => t.id === id);
            if (idx >= 0) out[idx] = { ...out[idx], ...update };
        } else if (q.action === 'trips.delete') {
            const id = (q.payload as any)?.id as string | undefined;
            if (!id) continue;
            const idx = out.findIndex((t) => t.id === id);
            if (idx >= 0) out.splice(idx, 1);
        }
    }
    return out;
}

// Hook to fetch all trips (with attendingCount including sports event roster when linked)
export const useTrips = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['trips', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            try {
                const { data, error } = await supabase
                    .from('trips')
                    .select(`
                        *,
                        trip_attendees ( id )
                    `)
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .order('date', { ascending: false });

                if (error) throw error;
                const rows = (data ?? []) as TransportTrip[];

                const withCounts = await Promise.all(
                    rows.map(async (trip) => {
                        const tripAttendeesCount = Array.isArray(trip.trip_attendees) ? trip.trip_attendees.length : 0;
                        let attendingCount = tripAttendeesCount;
                        if (trip.sports_event_id) {
                            const { count: rosterCount } = await supabase
                                .from('sports_event_roster')
                                .select('*', { count: 'exact', head: true })
                                .eq('event_id', trip.sports_event_id);
                            const { count: staffCount } = await supabase
                                .from('sports_event_staff')
                                .select('*', { count: 'exact', head: true })
                                .eq('event_id', trip.sports_event_id);
                            attendingCount += (rosterCount ?? 0) + (staffCount ?? 0);
                        }
                        return { ...trip, attendingCount };
                    })
                );
                await setCachedJson(tripsCacheKey(companyId, season), withCounts);
                return await applyQueuedTripOps(withCounts);
            } catch {
                const cached = (await getCachedJson<TransportTrip[]>(tripsCacheKey(companyId, season))) || [];
                return await applyQueuedTripOps(cached);
            }
        },
        enabled: !!companyId && !!season,
    });
};

// Hook to add a trip
export const useAddTrip = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newTrip: Partial<TransportTrip>) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('trips')
                    .insert([newTrip])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            const offlineRow = {
                ...newTrip,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            };
            await enqueueSync('trips.insert', [offlineRow]);
            return offlineRow as any;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
    });
};

// Hook to update a trip
export const useUpdateTrip = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<TransportTrip> & { id: string }) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('trips')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            await enqueueSync('trips.update', { id, update: updates });
            return { id, ...updates } as any;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
    });
};

// Hook to delete a trip
export const useDeleteTrip = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            if (await isOnlineNow()) {
                const { error } = await supabase.from('trips').delete().eq('id', id);
                if (error) throw error;
            } else {
                await enqueueSync('trips.delete', { id });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
    });
};

// Hook to fetch trip attendees (child ids)
export const useTripAttendees = (tripId: string | null) => {
    return useQuery({
        queryKey: ['trip_attendees', tripId],
        queryFn: async () => {
            if (!tripId) return [];

            const { data, error } = await supabase
                .from('trip_attendees')
                .select('child_id')
                .eq('trip_id', tripId);

            if (error) throw error;
            return data.map((row: any) => row.child_id);
        },
        enabled: !!tripId,
    });
};

// Hook to manage trip roster
export const useManageTripRoster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ tripId, childIds, companyId }: { tripId: string, childIds: string[], companyId: string }) => {
            if (await isOnlineNow()) {
                // Delete all attendees for this trip
                const { error: deleteError } = await supabase
                    .from('trip_attendees')
                    .delete()
                    .eq('trip_id', tripId);

                if (deleteError) throw deleteError;

                // Insert new attendees
                if (childIds.length > 0) {
                    const inserts = childIds.map(childId => ({
                        trip_id: tripId,
                        child_id: childId,
                        company_id: companyId
                    }));
                    const { error: insertError } = await supabase
                        .from('trip_attendees')
                        .insert(inserts);

                    if (insertError) throw insertError;
                }
            } else {
                await enqueueSync('trip_attendees.replace', { tripId, childIds, companyId });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trip_attendees'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
    });
};

// Trip attachments (storage: trip-attachments bucket)
export interface TripAttachment {
    id: string;
    trip_id: string;
    company_id: string;
    file_name: string;
    file_url: string;
    file_type?: string | null;
    uploaded_by?: string | null;
    created_at: string;
}

export const useTripAttachments = (tripId: string | null, companyId: string | null) => {
    return useQuery({
        queryKey: ['trip_attachments', tripId],
        queryFn: async () => {
            if (!tripId || !companyId) return [];
            const { data, error } = await supabase
                .from('trip_attachments')
                .select('*')
                .eq('trip_id', tripId)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []) as TripAttachment[];
        },
        enabled: !!tripId && !!companyId,
    });
};
