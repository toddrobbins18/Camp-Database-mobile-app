import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { enqueueSync, getCachedJson, isOnlineNow, setCachedJson } from '../offline/engine';

// ===================== ROLE PERMISSIONS =====================

export interface RolePermission {
    id: string;
    company_id: string;
    role: string;
    menu_item: string;
    can_access: boolean;
    created_at: string;
}

/** Admin Role Permissions screen — full matrix for one camp. */
export const useRolePermissionsMatrix = (companyId: string | null) => {
    return useQuery({
        queryKey: ['role_permissions_matrix', companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [] as RolePermission[];
            const { data, error } = await supabase
                .from('role_permissions')
                .select('*')
                .eq('company_id', companyId)
                .order('role', { ascending: true });
            if (error) throw error;
            return (data || []) as RolePermission[];
        },
    });
};

/** Match web AuthContext: load grants for the user’s roles, then scope to active camp. */
export const useRolePermissions = (companyId: string | null, roles: string[]) => {
    const rolesKey = roles.length ? [...roles].sort().join(',') : '';
    return useQuery({
        queryKey: ['role_permissions', companyId, rolesKey],
        enabled: !!companyId && roles.length > 0,
        staleTime: 60_000,
        queryFn: async () => {
            if (!companyId || !roles.length) return [] as RolePermission[];
            const cacheKey = `role_permissions:${companyId}:${rolesKey}`;
            const online = await isOnlineNow();
            try {
                const { data, error } = await supabase
                    .from('role_permissions')
                    .select('id, company_id, role, menu_item, can_access, created_at')
                    .eq('can_access', true)
                    .in('role', roles as any);
                if (error) throw error;
                const rows = ((data || []) as RolePermission[]).filter(
                    (p) => p.company_id === companyId && p.can_access === true,
                );
                await setCachedJson(cacheKey, rows);
                return rows;
            } catch (err) {
                if (online) {
                    console.error('[role_permissions] fetch failed:', err);
                    throw err;
                }
                return (await getCachedJson<RolePermission[]>(cacheKey)) ?? [];
            }
        },
    });
};

export const useUpdateRolePermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            companyId,
            role,
            menu_item,
            can_access,
        }: {
            companyId: string;
            role: string;
            menu_item: string;
            can_access: boolean;
        }) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('role_permissions')
                    .upsert(
                        { company_id: companyId, role, menu_item, can_access },
                        { onConflict: 'company_id,role,menu_item' }
                    )
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            await enqueueSync('role_permissions.upsert', { companyId, role, menu_item, can_access });
            return { company_id: companyId, role, menu_item, can_access } as any;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['role_permissions', variables.companyId] });
        },
    });
};

// ===================== DIVISION PERMISSIONS =====================

export interface DivisionPermission {
    id: string;
    user_id: string;
    division_id: string;
    company_id: string;
    can_access: boolean;
    created_at: string;
}

export const useDivisionPermissions = (companyId: string | null) => {
    return useQuery({
        queryKey: ['division_permissions', companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [] as DivisionPermission[];
            const cacheKey = `division_permissions:${companyId}`;
            try {
                const { data, error } = await supabase
                    .from('division_permissions')
                    .select('user_id, division_id, company_id, can_access')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: true });
                if (error) throw error;
                const rows = (data || []) as any[];
                await setCachedJson(cacheKey, rows);
                return rows;
            } catch {
                return (await getCachedJson<any[]>(cacheKey)) || [];
            }
        },
    });
};

export const useDivisionsLookup = (companyId: string | null) => {
    return useQuery({
        queryKey: ['divisions_lookup', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const cacheKey = `divisions_lookup:${companyId}`;
            try {
                const { data, error } = await supabase
                    .from('divisions')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });
                if (error) throw error;
                const rows = data || [];
                await setCachedJson(cacheKey, rows);
                return rows;
            } catch {
                return (await getCachedJson<any[]>(cacheKey)) || [];
            }
        },
        enabled: !!companyId,
    });
};

export const useUpdateDivisionPermission = () => {
    return useMutation({
        mutationFn: async ({ user_id, division_id, company_id, can_access }: { user_id: string; division_id: string; company_id?: string; can_access: boolean }) => {
            const row: Record<string, unknown> = { user_id, division_id, can_access };
            if (company_id) row.company_id = company_id;
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('division_permissions')
                    .upsert(row, { onConflict: 'user_id,division_id' })
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            await enqueueSync('division_permissions.upsert', { row });
            return row as any;
        },
    });
};

export const useBulkUpdateDivisionPermissions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            company_id,
            user_id,
            division_ids,
            can_access,
        }: {
            company_id: string;
            user_id: string;
            division_ids: string[];
            can_access: boolean;
        }) => {
            const rows = division_ids.map((division_id) => ({
                user_id,
                division_id,
                company_id,
                can_access,
            }));

            if (await isOnlineNow()) {
                const { error } = await supabase
                    .from('division_permissions')
                    .upsert(rows, { onConflict: 'user_id,division_id' });
                if (error) throw error;
                return;
            }

            for (const row of rows) {
                await enqueueSync('division_permissions.upsert', { row });
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['division_permissions', variables.company_id] });
        },
    });
};

// ===================== USERS LOOKUP (for DivisionPermissions) =====================

export const useUsersForPermissions = (companyId: string | null) => {
    return useQuery({
        queryKey: ['users_permissions', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const cacheKey = `users_permissions:${companyId}`;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .eq('company_id', companyId)
                    .order('full_name', { ascending: true });
                if (error) throw error;
                const rows = data || [];
                await setCachedJson(cacheKey, rows);
                return rows;
            } catch {
                return (await getCachedJson<any[]>(cacheKey)) || [];
            }
        },
        enabled: !!companyId,
    });
};
