import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ===================== ROLE PERMISSIONS =====================

export interface RolePermission {
    id: string;
    role: string;
    menu_item: string;
    can_access: boolean;
    created_at: string;
}

export const useRolePermissions = () => {
    return useQuery({
        queryKey: ['role_permissions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('role_permissions')
                .select('*')
                .order('role', { ascending: true });
            if (error) throw error;
            return (data || []) as RolePermission[];
        },
    });
};

export const useUpdateRolePermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ role, menu_item, can_access }: { role: string; menu_item: string; can_access: boolean }) => {
            const { data, error } = await supabase
                .from('role_permissions')
                .upsert({ role, menu_item, can_access }, { onConflict: 'role,menu_item' })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['role_permissions'] });
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

export const useDivisionsLookup = () => {
    return useQuery({
        queryKey: ['divisions_lookup'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('divisions')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data || [];
        },
    });
};

export const useUpdateDivisionPermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ user_id, division_id, can_access }: { user_id: string; division_id: string; can_access: boolean }) => {
            const { data, error } = await supabase
                .from('division_permissions')
                .upsert({ user_id, division_id, can_access }, { onConflict: 'user_id,division_id' })
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
