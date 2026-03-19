import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Camper } from './campers';

export interface SportsEnrollment {
    id?: string;
    child_id: string;
    sport_name: string;
    skill_level?: string | null;
    instructor?: string | null;
    schedule_periods?: string[] | null;
    start_date?: string | null;
    end_date?: string | null;
    notes?: string | null;
    company_id?: string;
    season?: string;
    created_at?: string;

    // Joined standard fields
    children?: Camper;
}

export const useSportsEnrollments = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['sports_enrollments', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('sports_academy')
                .select(`
                    *,
                    children!inner(*, division:divisions(id, name, gender, sort_order))
                `)
                .eq('children.company_id', companyId)
                .eq('children.season', season)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as SportsEnrollment[];
        },
        enabled: !!companyId && !!season,
    });
};

export const useAddSportsEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newEnrollment: Omit<SportsEnrollment, 'id' | 'created_at' | 'children'>) => {
            const { data, error } = await supabase
                .from('sports_academy')
                .insert([newEnrollment])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sports_enrollments'] });
        },
    });
};

export const useDeleteSportsEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('sports_academy')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sports_enrollments'] });
        },
    });
};

export const useUpdateSportsEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { id: string; updates: Omit<SportsEnrollment, 'id' | 'created_at' | 'children'> }) => {
            const { id, updates } = payload;
            const { data, error } = await supabase
                .from('sports_academy')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sports_enrollments'] });
        },
    });
};
