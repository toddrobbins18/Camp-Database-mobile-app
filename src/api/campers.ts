import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Define the shape of camper (children table) data
export interface Camper {
    id?: string;
    person_id?: string;
    company_id: string;
    name: string;
    date_of_birth?: string | null;
    age?: number | null;
    gender?: string | null;
    parent_1_name?: string | null;
    parent_1_email?: string | null;
    parent_1_phone?: string | null;
    parent_2_name?: string | null;
    parent_2_email?: string | null;
    parent_2_phone?: string | null;
    parent_3_name?: string | null;
    parent_3_email?: string | null;
    parent_3_phone?: string | null;
    parent_4_name?: string | null;
    parent_4_email?: string | null;
    parent_4_phone?: string | null;
    bunk?: string | null;
    division?: string | null;
    custom_bunk?: string | null;
    custom_division?: string | null;
    season: string;
    rfid?: string | null;
    allergies?: string | null;
    medical_notes?: string | null;
    emergency_contact?: string | null;
    assigned_leader?: string | null; // For the local select
    created_at?: string;
}

// Hook to fetch all campers
export const useCampers = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['campers', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('children')
                .select('*, division:divisions(id, name, gender, sort_order)')
                .eq('company_id', companyId)
                .eq('season', season)
                .order('name', { ascending: true });

            if (error) throw error;
            return data as Camper[];
        },
        enabled: !!companyId && !!season,
    });
};

// Hook to add a camper
export const useAddCamper = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newCamper: Omit<Camper, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('children')
                .insert([newCamper])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['campers', variables.company_id, variables.season] });
        },
    });
};

// Hook to edit a camper
export const useEditCamper = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (camperData: Partial<Camper> & { id: string }) => {
            const { id, ...updateData } = camperData;

            const { data, error } = await supabase
                .from('children')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            if (data?.company_id && data?.season) {
                queryClient.invalidateQueries({ queryKey: ['campers', data.company_id, data.season] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['campers'] });
            }
        },
    });
};

// Hook to delete a camper
export const useDeleteCamper = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string, company_id: string, season: string }) => {
            const { error } = await supabase
                .from('children')
                .delete()
                .eq('id', params.id);

            if (error) throw error;
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['campers', params.company_id, params.season] });
        },
    });
};

export const useDivisions = () => {
    return useQuery({
        queryKey: ['divisions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('divisions')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data;
        }
    });
};
