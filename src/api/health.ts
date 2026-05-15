import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';

// --- Types ---

export interface MedicationLog {
    id?: string;
    company_id: string;
    child_id: string;
    medication_name: string;
    dosage: string | null;
    scheduled_time: string;
    meal_time?: string[] | null;
    date: string;
    administered?: boolean;
    administered_by?: string | null;
    administered_at?: string | null;
    notes?: string | null;
    is_recurring?: boolean | null;
    frequency?: 'daily' | 'weekly' | 'custom' | string | null;
    days_of_week?: string[] | null;
    end_date?: string | null;
    alert_sent?: boolean;
    created_at?: string;
    children?: {
        id: string;
        name: string;
        group_name?: string;
        division?: { name: string } | null;
    };
}

const medicationCacheKey = (companyId: string, dateString: string) => `medication_logs:${companyId}:${dateString}`;
const admissionsCacheKey = (companyId: string, season: string | null | undefined) =>
    `health_center_admissions:${companyId}:${season ?? ''}`;

async function applyQueuedMedicationOps(base: MedicationLog[]): Promise<MedicationLog[]> {
    const out = [...base];
    const queued = await listQueued('medication_logs.');
    for (const q of queued) {
        if (q.action === 'medication_logs.insert') {
            const rows = Array.isArray(q.payload) ? (q.payload as any[]) : [];
            for (const row of rows) {
                out.push({
                    ...(row as any),
                    id: `offline-${q.id}`,
                    children: (row as any).children ?? undefined,
                } as MedicationLog);
            }
        } else if (q.action === 'medication_logs.administer') {
            const payload = q.payload as any;
            const id = payload?.id as string | undefined;
            const update = payload?.update as any;
            if (!id || !update) continue;
            const idx = out.findIndex((m) => m.id === id);
            if (idx >= 0) {
                out[idx] = { ...out[idx], ...update } as MedicationLog;
            }
        } else if (q.action === 'medication_logs.delete') {
            const id = (q.payload as any)?.id as string | undefined;
            if (!id) continue;
            const idx = out.findIndex((m) => m.id === id);
            if (idx >= 0) out.splice(idx, 1);
        }
    }
    return out;
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
            try {
                const { data, error } = await supabase
                    .from('medication_logs')
                    .select(`
                        *,
                        children (
                            id,
                            name,
                            group_name,
                            division:divisions(name)
                        )
                    `)
                    .eq('company_id', companyId)
                    .eq('date', dateString)
                    .order('scheduled_time', { ascending: true });

                if (error) throw error;
                const rows = (data as MedicationLog[]) || [];
                await setCachedJson(medicationCacheKey(companyId, dateString), rows);
                return await applyQueuedMedicationOps(rows);
            } catch {
                const cached = (await getCachedJson<MedicationLog[]>(medicationCacheKey(companyId, dateString))) || [];
                return await applyQueuedMedicationOps(cached);
            }
        },
        enabled: !!companyId,
    });
};

export const useAddMedicationLog = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newLog: Partial<MedicationLog> & { company_id: string; child_id: string }) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('medication_logs')
                    .insert([newLog])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            await enqueueSync('medication_logs.insert', [newLog]);
            return {
                ...newLog,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            };
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

            const update = {
                administered: true,
                administered_by: staffId,
                administered_at: new Date().toISOString(),
            };
            if (await isOnlineNow()) {
                const { error } = await supabase.from('medication_logs').update(update).eq('id', id);
                if (error) throw error;
            } else {
                await enqueueSync('medication_logs.administer', { id, update });
            }
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
            if (await isOnlineNow()) {
                const { error } = await supabase.from('medication_logs').delete().eq('id', id);
                if (error) throw error;
            } else {
                await enqueueSync('medication_logs.delete', { id });
            }
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medication_logs'] });
        },
    });
};

// --- Hooks for Health Center Admissions ---

export const useHealthCenterAdmissions = (companyId: string | null, season?: string | null) => {
    return useQuery({
        queryKey: ['health_center_admissions', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            try {
                let query = supabase
                    .from('health_center_admissions')
                    .select(`
                        *,
                        children!fk_health_center_admissions_child_id (
                            id,
                            name,
                            group_name
                        )
                    `)
                    .eq('company_id', companyId);

                if (season) {
                    query = query.eq('season', season);
                }

                const { data, error } = await query.order('admitted_at', { ascending: false });

                if (error) {
                    console.error('[HEALTH] Failed to fetch admissions:', error);
                    throw error;
                }
                console.log('[HEALTH] Fetched admissions:', data?.length, 'rows');
                const rows = (data as HealthCenterAdmission[]) || [];
                await setCachedJson(admissionsCacheKey(companyId, season), rows);
                return rows;
            } catch {
                return (await getCachedJson<HealthCenterAdmission[]>(admissionsCacheKey(companyId, season))) || [];
            }
        },
        enabled: !!companyId,
    });
};

export const useAddHealthCenterAdmission = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newAdmission: Partial<HealthCenterAdmission> & { company_id: string; child_id: string }) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('health_center_admissions')
                    .insert([newAdmission])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            await enqueueSync('health_center_admissions.insert', [newAdmission]);
            return {
                ...newAdmission,
                id: `offline-${Date.now()}`,
                admitted_at: new Date().toISOString(),
            };
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
            const update = {
                checked_out_at: new Date().toISOString(),
                checked_out_by: checkedOutBy || null,
            };
            if (await isOnlineNow()) {
                const { error } = await supabase.from('health_center_admissions').update(update).eq('id', id);
                if (error) throw error;
            } else {
                await enqueueSync('health_center_admissions.checkout', { id, update });
            }
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health_center_admissions'] });
        },
    });
};
