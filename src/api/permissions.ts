import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ===================== ROLE PERMISSIONS =====================

export interface RolePermission {
    id: string;
    company_id: string;
    role: string;
    menu_item: string;
    can_access: boolean;
    created_at: string;
}

export const useRolePermissions = (companyId: string | null) => {
    return useQuery({
        queryKey: ['role_permissions', companyId],
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
    can_access: boolean;
    created_at: string;
}

export const useDivisionPermissions = () => {
    return useQuery({
        queryKey: ['division_permissions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('division_permissions')
                .select('*, division:divisions(name, gender)')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return (data || []) as any[];
        },
    });
};

export const useDivisionsLookup = (companyId: string | null) => {
    return useQuery({
        queryKey: ['divisions_lookup', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('divisions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });
};

export const useUpdateDivisionPermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ user_id, division_id, company_id, can_access }: { user_id: string; division_id: string; company_id?: string; can_access: boolean }) => {
            const row: Record<string, unknown> = { user_id, division_id, can_access };
            if (company_id) row.company_id = company_id;
            const { data, error } = await supabase
                .from('division_permissions')
                .upsert(row, { onConflict: 'user_id,division_id' })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['division_permissions'] });
        },
    });
};

// ===================== USERS LOOKUP (for DivisionPermissions) =====================

export const useUsersForPermissions = (companyId: string | null) => {
    return useQuery({
        queryKey: ['users_permissions', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('company_id', companyId)
                .order('full_name', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });
};
