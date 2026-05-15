import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';

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

const rainyScheduleCacheKey = 'rainy_day_schedule';
const rainyDocsCacheKey = (companyId: string, season: string) => `rainy_day_documents:${companyId}:${season}`;
const tutoringCacheKey = (companyId: string, season: string) => `tutoring_therapy:${companyId}:${season}`;

export const useRainyDaySchedule = () => {
    return useQuery({
        queryKey: ['rainy_day_schedule'],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('rainy_day_schedule')
                    .select('*, children(id, first_name, last_name, gender, division_id)')
                    .order('date', { ascending: true });
                if (error) throw error;
                const rows = (data || []) as RainyDayEvent[];
                await setCachedJson(rainyScheduleCacheKey, rows);
                return rows;
            } catch {
                return (await getCachedJson<RainyDayEvent[]>(rainyScheduleCacheKey)) || [];
            }
        },
    });
};

export const useAddRainyDayEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (event: Omit<RainyDayEvent, 'id' | 'created_at' | 'status'>) => {
            const row = { ...event, status: 'scheduled' };
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('rainy_day_schedule')
                    .insert([row])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            const offlineRow = {
                ...row,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            };
            await enqueueSync('rainy_day_schedule.insert', [row]);
            return offlineRow as any;
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
            try {
                const { data, error } = await supabase
                    .from('rainy_day_documents')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .order('date', { ascending: false });
                if (error) throw error;
                const rows = (data || []) as RainyDayDocument[];
                await setCachedJson(rainyDocsCacheKey(companyId, season), rows);
                return rows;
            } catch {
                return (await getCachedJson<RainyDayDocument[]>(rainyDocsCacheKey(companyId, season))) || [];
            }
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
            try {
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
                const rows = (data || []) as TutoringTherapyEntry[];
                await setCachedJson(tutoringCacheKey(companyId, season), rows);
                const queued = await listQueued('tutoring_therapy.');
                let merged = [...rows];
                for (const q of queued) {
                    if (q.action === 'tutoring_therapy.insert') {
                        const ins = Array.isArray(q.payload) ? (q.payload as any[]) : [q.payload as any];
                        merged = merged.concat(ins.map((r) => ({ ...(r as TutoringTherapyEntry), id: (r.id as string) || `offline-${q.id}` })));
                    } else if (q.action === 'tutoring_therapy.update') {
                        const payload = q.payload as any;
                        const idx = merged.findIndex((m) => m.id === payload?.id);
                        if (idx >= 0) merged[idx] = { ...merged[idx], ...(payload?.update || {}) };
                    } else if (q.action === 'tutoring_therapy.delete') {
                        const id = (q.payload as any)?.id;
                        merged = merged.filter((m) => m.id !== id);
                    }
                }
                return merged;
            } catch {
                return (await getCachedJson<TutoringTherapyEntry[]>(tutoringCacheKey(companyId, season))) || [];
            }
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
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('tutoring_therapy')
                    .insert([entry])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            const offlineRow = {
                ...entry,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            };
            await enqueueSync('tutoring_therapy.insert', [entry]);
            return offlineRow as any;
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
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('tutoring_therapy')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            await enqueueSync('tutoring_therapy.update', { id, update: updates });
            return { id, ...updates } as any;
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
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('tutoring_therapy')
                    .delete()
                    .eq('id', id)
                    .select('id');
                if (error) throw error;
                if (!data || data.length === 0) throw new Error('Delete was blocked — you may not have permission.');
            } else {
                await enqueueSync('tutoring_therapy.delete', { id });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tutoring_therapy'] });
        },
    });
};
