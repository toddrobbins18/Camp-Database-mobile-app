import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// --- Types ---

export interface MedicationLog {
    id?: string;
    company_id: string;
    child_id: string;
    medication_name: string;
    dosage: string | null;
    scheduled_time: string;
    date: string;
    administered?: boolean;
    administered_by?: string | null;
    administered_at?: string | null;
    notes?: string | null;
    alert_sent?: boolean;
    created_at?: string;
    children?: {
        id: string;
        name: string;
        group_name?: string;
    };
}

export interface HealthCenterAdmission {
    id?: string;
    company_id: string;
    child_id: string;
    admitted_at?: string;
    admitted_by?: string | null;
    checked_out_at?: string | null;
    checked_out_by?: string | null;
    reason?: string | null;
    notes?: string | null;
    season?: string;
    created_at?: string;
    children?: {
        id: string;
        name: string;
        group_name?: string;
    };
}

// --- Hooks for Medication Logs ---

export const useMedicationLogs = (companyId: string | null, dateString: string) => {
    return useQuery({
        queryKey: ['medication_logs', companyId, dateString],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('medication_logs')
                .select(`
                    *,
                    children (
                        id,
                        name,
                        group_name
                    )
                `)
                .eq('company_id', companyId)
                .eq('date', dateString)
                .order('scheduled_time', { ascending: true });

            if (error) throw error;
            return data as MedicationLog[];
        },
        enabled: !!companyId,
    });
};

export const useAddMedicationLog = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newLog: Partial<MedicationLog> & { company_id: string; child_id: string }) => {
            const { data, error } = await supabase
                .from('medication_logs')
                .insert([newLog])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medication_logs'] });
        },
    });
};

/**
 * medication_logs.administered_by references staff(id), NOT auth.users(id).
 * Passing auth uid causes FK violation → PostgREST 409 Conflict.
 * Resolve staff row by logged-in user's email + company (same as web Nurse page).
 */
export const useAdministerMedication = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, companyId }: { id: string; companyId: string | null | undefined }) => {
            const { data: { user } } = await supabase.auth.getUser();
            let staffId: string | null = null;
            if (user?.email && companyId) {
                const { data: staffRow } = await supabase
                    .from('staff')
                    .select('id')
                    .eq('email', user.email)
                    .eq('company_id', companyId)
                    .maybeSingle();
                staffId = staffRow?.id ?? null;
            }

            const { error } = await supabase
                .from('medication_logs')
                .update({
                    administered: true,
                    administered_by: staffId,
                    administered_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medication_logs'] });
        },
    });
};

export const useDeleteMedicationLog = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('medication_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medication_logs'] });
        },
    });
};

// --- Hooks for Health Center Admissions ---

export const useHealthCenterAdmissions = (companyId: string | null) => {
    return useQuery({
        queryKey: ['health_center_admissions', companyId],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('health_center_admissions')
                .select(`
                    *,
                    children (
                        id,
                        name,
                        group_name
                    )
                `)
                .eq('company_id', companyId)
                .order('admitted_at', { ascending: false });

            if (error) throw error;
            return data as HealthCenterAdmission[];
        },
        enabled: !!companyId,
    });
};

export const useAddHealthCenterAdmission = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newAdmission: Partial<HealthCenterAdmission> & { company_id: string; child_id: string }) => {
            const { data, error } = await supabase
                .from('health_center_admissions')
                .insert([newAdmission])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health_center_admissions'] });
        },
    });
};

export const useCheckoutHealthCenterAdmission = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, checkedOutBy }: { id: string; checkedOutBy: string | undefined }) => {
            const { error } = await supabase
                .from('health_center_admissions')
                .update({
                    checked_out_at: new Date().toISOString(),
                    checked_out_by: checkedOutBy || null
                })
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health_center_admissions'] });
        },
    });
};
