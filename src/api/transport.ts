import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface TransportTrip {
    id?: string;
    company_id: string;
    season: string;
    name: string;
    type: string;
    destination?: string | null;
    date: string;
    departure_time?: string | null;
    return_time?: string | null;
    chaperone?: string | null;
    capacity?: number | null;
    status?: string;
    created_at?: string;
    trip_attendees?: { count: number }[];
}

// Hook to fetch all trips
export const useTrips = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['trips', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('trips')
                .select(`
                    *,
                    trip_attendees ( count )
                `)
                .eq('company_id', companyId)
                .eq('season', season)
                .order('date', { ascending: false });

            if (error) throw error;
            return data as TransportTrip[];
        },
        enabled: !!companyId && !!season,
    });
};

// Hook to add a trip
export const useAddTrip = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newTrip: Partial<TransportTrip>) => {
            const { data, error } = await supabase
                .from('trips')
                .insert([newTrip])
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const { data, error } = await supabase
                .from('trips')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const { error } = await supabase
                .from('trips')
                .delete()
                .eq('id', id);

            if (error) throw error;
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
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trip_attendees'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
    });
};
