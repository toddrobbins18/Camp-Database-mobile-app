import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';
import {
    findDaySpecificMedicationLog,
    mergeMedicationsForDate,
    type MedicationLogRow,
} from '../lib/medicationSchedule';

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
    season?: string;
    created_at?: string;
    _fromRecurringTemplate?: boolean;
    _templateId?: string;
    _displayDate?: string;
    children?: {
        id: string;
        name: string;
        group_name?: string;
        division?: { name: string } | null;
    };
}

export type MedicationAdministrationInput = {
    med: MedicationLog;
    companyId: string;
    season: string;
    dateString: string;
    administered: boolean;
};

const medicationSelect = `
    *,
    children (
        id,
        name,
        group_name,
        division:divisions(name)
    )
`;

const medicationCacheKey = (companyId: string, dateString: string, season: string) =>
    `medication_logs:${companyId}:${dateString}:${season}`;
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

async function fetchDaySpecificLogs(
    med: MedicationLog,
    dateString: string,
    companyId: string,
    season: string,
) {
    const { data, error } = await supabase
        .from('medication_logs')
        .select('id, child_id, medication_name, meal_time')
        .eq('child_id', med.child_id)
        .eq('date', dateString)
        .eq('company_id', companyId)
        .eq('season', season);

    if (error) throw error;
    return data || [];
}

async function resolveStaffId(companyId: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;
    const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('email', user.email)
        .eq('company_id', companyId)
        .maybeSingle();
    return staffRow?.id ?? null;
}

export const useMedicationLogs = (companyId: string | null, dateString: string, season?: string | null) => {
    const seasonKey = season || String(new Date().getFullYear());

    return useQuery({
        queryKey: ['medication_logs', companyId, dateString, seasonKey],
        queryFn: async () => {
            if (!companyId) return [];
            try {
                const [dateResult, recurringResult] = await Promise.all([
                    supabase
                        .from('medication_logs')
                        .select(medicationSelect)
                        .eq('company_id', companyId)
                        .eq('season', seasonKey)
                        .eq('date', dateString)
                        .order('scheduled_time', { ascending: true }),
                    supabase
                        .from('medication_logs')
                        .select(medicationSelect)
                        .eq('company_id', companyId)
                        .eq('season', seasonKey)
                        .eq('is_recurring', true)
                        .lte('date', dateString)
                        .or(`end_date.is.null,end_date.gte.${dateString}`),
                ]);

                if (dateResult.error) throw dateResult.error;
                if (recurringResult.error) throw recurringResult.error;

                const merged = mergeMedicationsForDate(
                    (dateResult.data || []) as MedicationLogRow[],
                    (recurringResult.data || []) as MedicationLogRow[],
                    dateString,
                    seasonKey,
                ) as MedicationLog[];

                await setCachedJson(medicationCacheKey(companyId, dateString, seasonKey), merged);
                return await applyQueuedMedicationOps(merged);
            } catch {
                const cached =
                    (await getCachedJson<MedicationLog[]>(medicationCacheKey(companyId, dateString, seasonKey))) || [];
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
 * Handles recurring template rows by creating/updating day-specific logs.
 */
export const useSetMedicationAdministration = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ med, companyId, season, dateString, administered }: MedicationAdministrationInput) => {
            const staffId = administered ? await resolveStaffId(companyId) : null;
            const update = administered
                ? {
                    administered: true,
                    administered_by: staffId,
                    administered_at: new Date().toISOString(),
                }
                : {
                    administered: false,
                    administered_by: null,
                    administered_at: null,
                };

            if (med._fromRecurringTemplate) {
                const dayLogs = await fetchDaySpecificLogs(med, dateString, companyId, season);
                const existingDayLog = findDaySpecificMedicationLog(dayLogs, med);

                if (administered) {
                    if (existingDayLog?.id) {
                        if (await isOnlineNow()) {
                            const { error } = await supabase
                                .from('medication_logs')
                                .update(update)
                                .eq('id', existingDayLog.id);
                            if (error) throw error;
                        } else {
                            await enqueueSync('medication_logs.administer', { id: existingDayLog.id, update });
                        }
                        return existingDayLog.id;
                    }

                    const insertRow = {
                        child_id: med.child_id,
                        date: dateString,
                        medication_name: med.medication_name,
                        dosage: med.dosage,
                        meal_time: med.meal_time,
                        scheduled_time: med.scheduled_time,
                        notes: med.notes,
                        is_recurring: false,
                        frequency: med.frequency,
                        days_of_week: med.days_of_week,
                        end_date: med.end_date,
                        company_id: companyId,
                        season,
                        ...update,
                    };

                    if (await isOnlineNow()) {
                        const { data, error } = await supabase
                            .from('medication_logs')
                            .insert([insertRow])
                            .select('id')
                            .single();
                        if (error) throw error;
                        return data.id as string;
                    }

                    await enqueueSync('medication_logs.insert', [insertRow]);
                    return `offline-${Date.now()}`;
                }

                if (!existingDayLog?.id) {
                    throw new Error('No administration record exists for this date.');
                }

                if (await isOnlineNow()) {
                    const { error } = await supabase
                        .from('medication_logs')
                        .update(update)
                        .eq('id', existingDayLog.id);
                    if (error) throw error;
                } else {
                    await enqueueSync('medication_logs.administer', { id: existingDayLog.id, update });
                }
                return existingDayLog.id;
            }

            if (!med.id) {
                throw new Error('Medication record is missing an id.');
            }

            if (await isOnlineNow()) {
                const { error } = await supabase.from('medication_logs').update(update).eq('id', med.id);
                if (error) throw error;
            } else {
                await enqueueSync('medication_logs.administer', { id: med.id, update });
            }
            return med.id;
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
