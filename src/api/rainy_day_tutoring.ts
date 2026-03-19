import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ===================== RAINY DAY SCHEDULE =====================

export interface RainyDayEvent {
    id: string;
    name: string;
    date: string;
    time?: string;
    location?: string;
    activity_type: string;
    capacity?: number;
    supervisor?: string;
    notes?: string;
    status: string;
    created_at: string;
}

export const useRainyDaySchedule = () => {
    return useQuery({
        queryKey: ['rainy_day_schedule'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('rainy_day_schedule')
                .select('*, children(id, first_name, last_name, gender, division_id)')
                .order('date', { ascending: true });
            if (error) throw error;
            return (data || []) as RainyDayEvent[];
        },
    });
};

export const useAddRainyDayEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (event: Omit<RainyDayEvent, 'id' | 'created_at' | 'status'>) => {
            const { data, error } = await supabase
                .from('rainy_day_schedule')
                .insert([{ ...event, status: 'scheduled' }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rainy_day_schedule'] });
        },
    });
};

// ===================== RAINY DAY DOCUMENTS =====================

export interface RainyDayDocument {
    id: string;
    company_id: string;
    season: string;
    date: string;
    file_name: string;
    file_url: string;
    uploaded_by?: string;
    created_at: string;
}

export const useRainyDayDocuments = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['rainy_day_documents', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('rainy_day_documents')
                .select('*')
                .eq('company_id', companyId)
                .eq('season', season)
                .order('date', { ascending: false });
            if (error) throw error;
            return (data || []) as RainyDayDocument[];
        },
        enabled: !!companyId,
    });
};

// ===================== TUTORING & THERAPY =====================

export interface TutoringTherapyChild {
    id?: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    division_id?: string | null;
    gender?: string | null;
}

export interface TutoringTherapyEntry {
    id: string;
    child_id: string;
    company_id?: string;
    service_type: string;
    instructor?: string | null;
    schedule_periods: string[] | null;
    start_date?: string | null;
    end_date?: string | null;
    notes?: string | null;
    season: string;
    created_at: string;
    children?: TutoringTherapyChild | null;
}

export const useTutoringTherapy = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['tutoring_therapy', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('tutoring_therapy')
                .select(
                    `
                    *,
                    children (
                        id,
                        name,
                        division_id,
                        gender
                    )
                `
                )
                .eq('company_id', companyId)
                .eq('season', season)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as TutoringTherapyEntry[];
        },
        enabled: !!companyId && !!season,
    });
};

export type TutoringTherapyInsert = Omit<TutoringTherapyEntry, 'id' | 'created_at' | 'children'> & {
    company_id: string;
};

export const useAddTutoringEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (entry: TutoringTherapyInsert) => {
            const { data, error } = await supabase
                .from('tutoring_therapy')
                .insert([entry])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tutoring_therapy'] });
        },
    });
};

export const useUpdateTutoringEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<TutoringTherapyInsert> & { id: string }) => {
            const { data, error } = await supabase
                .from('tutoring_therapy')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tutoring_therapy'] });
        },
    });
};

export const useDeleteTutoringEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('tutoring_therapy')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tutoring_therapy'] });
        },
    });
};
