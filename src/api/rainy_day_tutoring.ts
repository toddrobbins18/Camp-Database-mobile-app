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

export interface TutoringTherapyEntry {
    id: string;
    child_id: string;
    service_type: string;
    instructor?: string;
    schedule_periods: string[];
    start_date?: string;
    end_date?: string;
    notes?: string;
    season: string;
    created_at: string;
}

export const useTutoringTherapy = (season: string) => {
    return useQuery({
        queryKey: ['tutoring_therapy', season],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tutoring_therapy')
                .select('*')
                .eq('season', season)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as TutoringTherapyEntry[];
        },
    });
};

export const useAddTutoringEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (entry: Omit<TutoringTherapyEntry, 'id' | 'created_at'>) => {
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
