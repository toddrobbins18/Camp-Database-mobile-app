import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';

export interface MenuItem {
    id?: string;
    company_id: string;
    date: string;
    meal_type: string;
    items: string;
    allergens?: string | null;
    created_at?: string;
}

const menuCacheKey = (companyId: string) => `menu_items:${companyId}`;

async function applyQueuedMenuOps(base: MenuItem[], companyId: string): Promise<MenuItem[]> {
    const out = [...base];
    const queued = await listQueued('menu_items.');
    for (const q of queued) {
        if (q.action === 'menu_items.insert') {
            const rows = Array.isArray(q.payload) ? (q.payload as any[]) : [q.payload as any];
            for (const row of rows) {
                if (!row || row.company_id !== companyId) continue;
                out.push({ ...(row as MenuItem), id: (row.id as string) || `offline-${q.id}` });
            }
        } else if (q.action === 'menu_items.delete') {
            const id = (q.payload as any)?.id as string | undefined;
            if (!id) continue;
            const idx = out.findIndex((m) => m.id === id);
            if (idx >= 0) out.splice(idx, 1);
        }
    }
    return out;
}

export const useMenuItems = (companyId: string | null) => {
    return useQuery({
        queryKey: ['menu_items', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            try {
                const { data, error } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('company_id', companyId)
                    .order('date', { ascending: false });

                if (error) throw error;
                const rows = (data as MenuItem[]) || [];
                await setCachedJson(menuCacheKey(companyId), rows);
                return await applyQueuedMenuOps(rows, companyId);
            } catch {
                const cached = (await getCachedJson<MenuItem[]>(menuCacheKey(companyId))) || [];
                return await applyQueuedMenuOps(cached, companyId);
            }
        },
        enabled: !!companyId,
    });
};

export const useAddMenuItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newMenuItem: Omit<MenuItem, 'id' | 'created_at'>) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('menu_items')
                    .insert([newMenuItem])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            const offlineRow = {
                ...newMenuItem,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            };
            await enqueueSync('menu_items.insert', [offlineRow]);
            return offlineRow as any;
        },
        onSuccess: (_, variables) => {
            // Refresh menu for this company (and any dependent dashboards)
            queryClient.invalidateQueries({ queryKey: ['menu_items', variables.company_id] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_meals'] });
        },
    });
};

export const useDeleteMenuItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string; company_id: string }) => {
            if (await isOnlineNow()) {
                const { error } = await supabase.from('menu_items').delete().eq('id', params.id);
                if (error) throw error;
            } else {
                await enqueueSync('menu_items.delete', { id: params.id });
            }
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['menu_items', params.company_id] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_meals'] });
        },
    });
};
