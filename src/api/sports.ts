import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Camper } from './campers';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';

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

const sportsCacheKey = (companyId: string, season: string) => `sports_enrollments:${companyId}:${season}`;

async function applyQueuedSportsOps(base: SportsEnrollment[]): Promise<SportsEnrollment[]> {
    const out = [...base];
    const queued = await listQueued('sports_academy.');
    for (const q of queued) {
        if (q.action === 'sports_academy.insert') {
            const rows = Array.isArray(q.payload) ? (q.payload as any[]) : [q.payload as any];
            for (const row of rows) {
                out.push({ ...(row as SportsEnrollment), id: (row.id as string) || `offline-${q.id}` });
            }
        } else if (q.action === 'sports_academy.update') {
            const payload = q.payload as any;
            const id = payload?.id as string | undefined;
            const update = payload?.update as Partial<SportsEnrollment> | undefined;
            if (!id || !update) continue;
            const idx = out.findIndex((r) => r.id === id);
            if (idx >= 0) out[idx] = { ...out[idx], ...update };
        } else if (q.action === 'sports_academy.delete') {
            const id = (q.payload as any)?.id as string | undefined;
            if (!id) continue;
            const idx = out.findIndex((r) => r.id === id);
            if (idx >= 0) out.splice(idx, 1);
        }
    }
    return out;
}

export const useSportsEnrollments = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['sports_enrollments', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            try {
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
                const rows = (data as SportsEnrollment[]) || [];
                await setCachedJson(sportsCacheKey(companyId, season), rows);
                return await applyQueuedSportsOps(rows);
            } catch {
                const cached = (await getCachedJson<SportsEnrollment[]>(sportsCacheKey(companyId, season))) || [];
                return await applyQueuedSportsOps(cached);
            }
        },
        enabled: !!companyId && !!season,
    });
};

export const useAddSportsEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newEnrollment: Omit<SportsEnrollment, 'id' | 'created_at' | 'children'>) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('sports_academy')
                    .insert([newEnrollment])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            const offlineRow = {
                ...newEnrollment,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            };
            await enqueueSync('sports_academy.insert', [offlineRow]);
            return offlineRow as any;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sports_enrollments'] });
            queryClient.invalidateQueries({ queryKey: ['camper_sports_academy'] });
        },
    });
};

export const useDeleteSportsEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('sports_academy')
                    .delete()
                    .eq('id', id)
                    .select('id');
                if (error) throw error;
                if (!data || data.length === 0) throw new Error('Delete was blocked — you may not have permission.');
            } else {
                await enqueueSync('sports_academy.delete', { id });
            }
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sports_enrollments'] });
            queryClient.invalidateQueries({ queryKey: ['camper_sports_academy'] });
        },
    });
};

export const useUpdateSportsEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { id: string; updates: Omit<SportsEnrollment, 'id' | 'created_at' | 'children'> }) => {
            const { id, updates } = payload;
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('sports_academy')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            await enqueueSync('sports_academy.update', { id, update: updates });
            return { id, ...updates } as any;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sports_enrollments'] });
            queryClient.invalidateQueries({ queryKey: ['camper_sports_academy'] });
        },
    });
};
