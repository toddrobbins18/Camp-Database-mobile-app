import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { filterActiveRoster } from '../lib/rosterStatus';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';

/** Matches web Roster / usePermissions: these roles see all divisions for roster queries. */
const ROSTER_FULL_DIVISION_ACCESS_ROLES = [
    'admin',
    'super_admin',
    'specialist',
    'staff',
    'health_center',
] as const;

/**
 * Same rules as lovable-web-app usePermissions.getDivisionFilter — used so mobile roster
 * matches web for division_leader / viewer (and does not show extra campers).
 */
export const useRosterDivisionFilter = (companyId: string | null) => {
    return useQuery({
        queryKey: ['roster_division_filter', companyId],
        enabled: !!companyId,
        queryFn: async (): Promise<string[] | null> => {
            if (!companyId) return null;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: rolesRows, error: rolesError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('company_id', companyId);

            if (rolesError) throw rolesError;
            const roles = (rolesRows || []).map((r) => r.role);

            if (roles.some((r) => ROSTER_FULL_DIVISION_ACCESS_ROLES.includes(r as any))) {
                return null;
            }

            const { data: divPerms, error: divError } = await supabase
                .from('division_permissions')
                .select('division_id')
                .eq('user_id', user.id)
                .eq('company_id', companyId)
                .eq('can_access', true);

            if (divError) throw divError;
            const ids = [...new Set((divPerms || []).map((d) => d.division_id))];
            return ids.length > 0 ? ids : [];
        },
    });
};

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
    guardian_email?: string | null;
    guardian_phone?: string | null;
    leader_id?: string | null;
    bunk_id?: string | null;
    group_name?: string | null;
    tshirt_size?: string | null;
    status?: string | null;
    created_at?: string;
}

/** Resolves division label whether `division` is a joined `{ name }` row or a legacy string. */
export function getCamperDivisionName(child: {
    division?: string | { name?: string | null } | null;
    group_name?: string | null;
}): string | undefined {
    const d = child.division;
    if (d != null && typeof d === 'object' && typeof d.name === 'string' && d.name.trim()) {
        return d.name.trim();
    }
    if (typeof d === 'string' && d.trim()) return d.trim();
    const g = child.group_name?.trim();
    return g || undefined;
}

const CAMPERS_PAGE_SIZE = 1000;

const campersCacheKey = (companyId: string, season: string, divisionFilter: string[] | null | undefined) =>
    `campers:${companyId}:${season}:${JSON.stringify(divisionFilter ?? null)}`;

async function applyQueuedCamperOps(base: Camper[], companyId: string, season: string): Promise<Camper[]> {
    const out = [...base];
    const queued = await listQueued('children.');
    for (const q of queued) {
        if (q.action === 'children.insert') {
            const rows = Array.isArray(q.payload) ? (q.payload as any[]) : [q.payload as any];
            for (const row of rows) {
                if (!row || row.company_id !== companyId || row.season !== season) continue;
                out.push({
                    ...(row as Camper),
                    id: (row.id as string) || `offline-${q.id}`,
                });
            }
        } else if (q.action === 'children.update') {
            const payload = q.payload as any;
            const id = payload?.id as string | undefined;
            const update = payload?.update as Partial<Camper> | undefined;
            if (!id || !update) continue;
            const idx = out.findIndex((c) => c.id === id);
            if (idx >= 0) out[idx] = { ...out[idx], ...update };
        } else if (q.action === 'children.delete') {
            const id = (q.payload as any)?.id as string | undefined;
            if (!id) continue;
            const idx = out.findIndex((c) => c.id === id);
            if (idx >= 0) out.splice(idx, 1);
        }
    }
    return out;
}

function useCampersPaged(
    companyId: string | null,
    season: string,
    divisionFilter: string[] | null | undefined,
    options?: { enabled?: boolean }
) {
    const enabled = options?.enabled !== false;

    return useQuery({
        queryKey: ['campers', companyId, season, divisionFilter ?? null],
        queryFn: async () => {
            if (!companyId) return [];
            try {
                const rows: Camper[] = [];
                let from = 0;

                for (;;) {
                    const to = from + CAMPERS_PAGE_SIZE - 1;
                    let q = supabase
                        .from('children')
                        .select('*, division:divisions(id, name, gender, sort_order), leader:leader_id(id, name, role)')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .neq('status', 'inactive')
                        .order('name', { ascending: true })
                        .range(from, to);

                    if (divisionFilter != null && divisionFilter.length > 0) {
                        q = q.in('division_id', divisionFilter);
                    }

                    const { data, error } = await q;
                    if (error) throw error;
                    const batch = (data ?? []) as Camper[];
                    rows.push(...batch);
                    if (batch.length < CAMPERS_PAGE_SIZE) break;
                    from += CAMPERS_PAGE_SIZE;
                }

                await setCachedJson(campersCacheKey(companyId, season, divisionFilter), rows);
                return await applyQueuedCamperOps(filterActiveRoster(rows), companyId, season);
            } catch {
                const cached = filterActiveRoster(
                    (await getCachedJson<Camper[]>(campersCacheKey(companyId, season, divisionFilter))) || [],
                );
                return await applyQueuedCamperOps(cached, companyId, season);
            }
        },
        enabled: !!companyId && !!season && enabled,
    });
}

/**
 * Campers for the active company/season, aligned with web Roster:
 * excludes inactive status, applies division_leader/viewer division filter, and pages past Supabase max_rows.
 */
export const useCampers = (companyId: string | null, season: string) => {
    const divFilter = useRosterDivisionFilter(companyId);
    const paged = useCampersPaged(companyId, season, divFilter.data ?? null, {
        enabled: !!companyId && !!season && divFilter.isSuccess,
    });

    return {
        ...paged,
        isLoading:
            (!!companyId && !!season && divFilter.isLoading) ||
            (divFilter.isSuccess && paged.isLoading),
        isError: divFilter.isError || paged.isError,
    };
};

// Hook to add a camper
export const useAddCamper = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newCamper: Omit<Camper, 'id' | 'created_at'>) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('children')
                    .insert([newCamper])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            const offlineRow = {
                ...newCamper,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            };
            await enqueueSync('children.insert', [offlineRow]);
            return offlineRow as any;
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
            if (await isOnlineNow()) {
                // Avoid .single() after update — 406 if RETURNING is empty (RLS / 0 rows). Array response is always valid.
                const { data: rows, error } = await supabase
                    .from('children')
                    .update(updateData)
                    .eq('id', id)
                    .select();

                if (error) throw error;
                const data = rows?.[0];
                if (!data) {
                    throw new Error(
                        'Update did not return a row. Check children UPDATE permissions (RLS) or that the camper exists.'
                    );
                }
                return data;
            }
            await enqueueSync('children.update', { id, update: updateData });
            return { id, ...updateData } as any;
        },
        onSuccess: (data, variables) => {
            if (data?.company_id && data?.season) {
                queryClient.invalidateQueries({ queryKey: ['campers', data.company_id, data.season] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['campers'] });
            }
            // Camper detail screen uses ['child', id] as its queryKey.
            if (variables?.id) {
                queryClient.invalidateQueries({ queryKey: ['child', variables.id] });
            }
        },
    });
};

// Hook to delete a camper
export const useDeleteCamper = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string, company_id: string, season: string }) => {
            if (await isOnlineNow()) {
                const { error } = await supabase.from('children').delete().eq('id', params.id);
                if (error) throw error;
            } else {
                await enqueueSync('children.delete', { id: params.id });
            }
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['campers', params.company_id, params.season] });
        },
    });
};

export const useDivisions = (companyId: string | null) => {
    return useQuery({
        queryKey: ['divisions', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('divisions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!companyId,
    });
};
