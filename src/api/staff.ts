import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Define the shape of staff data
export interface StaffMember {
    id?: string;
    company_id: string;
    person_id?: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
    department?: string;
    hire_date?: string;
    date_of_birth?: string;
    status?: string;
    season: string;
    rfid?: string;
    staff_type?: string;
    allergies?: string;
    reports_to?: string;
    created_at?: string;
}

// Hook to fetch all staff for a company and season
export const useStaff = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['staff', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('company_id', companyId)
                .eq('season', season)
                .order('name', { ascending: true });

            if (error) throw error;
            return data as StaffMember[];
        },
        enabled: !!companyId && !!season,
    });
};

// Hook to add a new staff member (pass a row built with buildStaffInsertRow — only real DB columns)
export const useAddStaff = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (row: Record<string, unknown>) => {
            const { data, error } = await supabase.from('staff').insert([row]).select().single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, row) => {
            const cid = row.company_id as string;
            const s = row.season as string;
            if (cid && s) {
                queryClient.invalidateQueries({ queryKey: ['staff', cid, s] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['staff'] });
            }
        },
    });
};

// Hook to edit a staff member
export const useEditStaff = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (staffData: Partial<StaffMember> & { id: string }) => {
            const { id, ...updateData } = staffData;

            const { data, error } = await supabase
                .from('staff')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            // Invalidate the staff list for this company and season
            if (data?.company_id && data?.season) {
                queryClient.invalidateQueries({ queryKey: ['staff', data.company_id, data.season] });
            } else {
                // Fallback invalidate all staff if missing info
                queryClient.invalidateQueries({ queryKey: ['staff'] });
            }
        },
    });
};

// Hook to delete a staff member
export const useDeleteStaff = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string, company_id: string, season: string }) => {
            const { error } = await supabase.from('staff').delete().eq('id', params.id);

            if (error) throw error;
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['staff', params.company_id, params.season] });
        },
    });
};
