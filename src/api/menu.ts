import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface MenuItem {
    id?: string;
    company_id: string;
    date: string;
    meal_type: string;
    items: string;
    allergens?: string | null;
    created_at?: string;
}

export const useMenuItems = (companyId: string | null) => {
    return useQuery({
        queryKey: ['menu_items', companyId],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('menu_items')
                .select('*')
                .eq('company_id', companyId)
                .order('date', { ascending: false });

            if (error) throw error;
            return data as MenuItem[];
        },
        enabled: !!companyId,
    });
};

export const useAddMenuItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newMenuItem: Omit<MenuItem, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('menu_items')
                .insert([newMenuItem])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menu_items'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_meals'] });
        },
    });
};

export const useDeleteMenuItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menu_items'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_meals'] });
        },
    });
};
