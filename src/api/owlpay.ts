import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type OwlPayCamper = {
    id: string;
    name: string;
    person_id: string | null;
    rfid: string | null;
    owl_pay_balance: number;
};

export type OwlPayStaff = {
    id: string;
    name: string;
    rfid: string | null;
};

export type OwlPayItem = {
    id: string;
    company_id: string;
    name: string;
    price: number;
    category: string;
    active: boolean;
};

export type OwlPayEmailConfig = {
    id?: string;
    company_id: string;
    low_balance_alerts_enabled: boolean;
    low_balance_threshold: number;
    low_balance_recipient_email: string | null;
    staff_purchase_reports_enabled: boolean;
    staff_report_frequency: string;
    staff_report_recipient_email: string | null;
};

export const useOwlPayCampers = (companyId: string | null, season: string, search = '') => {
    return useQuery({
        queryKey: ['owlpay_campers', companyId, season, search],
        queryFn: async () => {
            if (!companyId) return [] as OwlPayCamper[];
            let query = supabase
                .from('children')
                .select('id, name, person_id, rfid, owl_pay_balance')
                .eq('company_id', companyId)
                .eq('season', season)
                .neq('status', 'inactive')
                .order('name', { ascending: true });

            const q = search.trim();
            if (q) {
                query = query.or(`name.ilike.%${q}%,person_id.ilike.%${q}%,rfid.ilike.%${q}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as OwlPayCamper[];
        },
        enabled: !!companyId && !!season,
    });
};

export const useOwlPayItems = (companyId: string | null, includeInactive = false) => {
    return useQuery({
        queryKey: ['owlpay_items', companyId, includeInactive],
        queryFn: async () => {
            if (!companyId) return [] as OwlPayItem[];
            let query = supabase
                .from('owl_pay_items')
                .select('*')
                .eq('company_id', companyId)
                .order('name', { ascending: true });

            if (!includeInactive) {
                query = query.eq('active', true);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as OwlPayItem[];
        },
        enabled: !!companyId,
    });
};

export const useOwlPayStaff = (companyId: string | null, season: string, search = '') => {
    return useQuery({
        queryKey: ['owlpay_staff', companyId, season, search],
        queryFn: async () => {
            if (!companyId) return [] as OwlPayStaff[];
            let query = supabase
                .from('staff')
                .select('id, name, rfid')
                .eq('company_id', companyId)
                .eq('season', season)
                .neq('status', 'inactive')
                .order('name', { ascending: true });

            const q = search.trim();
            if (q) {
                query = query.or(`name.ilike.%${q}%,rfid.ilike.%${q}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as OwlPayStaff[];
        },
        enabled: !!companyId && !!season,
    });
};

export const useSaveOwlPayItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            id?: string;
            company_id: string;
            name: string;
            price: number;
            category: string;
            active?: boolean;
        }) => {
            if (payload.id) {
                const { id, ...rest } = payload;
                const { data, error } = await supabase
                    .from('owl_pay_items')
                    .update(rest)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }

            const { data, error } = await supabase
                .from('owl_pay_items')
                .insert(payload)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['owlpay_items', variables.company_id] });
        },
    });
};

export const useDeleteOwlPayItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: string; company_id: string }) => {
            const { error } = await supabase.from('owl_pay_items').delete().eq('id', payload.id);
            if (error) throw error;
            return payload;
        },
        onSuccess: (payload) => {
            queryClient.invalidateQueries({ queryKey: ['owlpay_items', payload.company_id] });
        },
    });
};

export const useOwlPayEmailConfig = (companyId: string | null) => {
    return useQuery({
        queryKey: ['owlpay_email_config', companyId],
        queryFn: async () => {
            if (!companyId) return null;
            const { data, error } = await supabase
                .from('owl_pay_email_config')
                .select('*')
                .eq('company_id', companyId)
                .maybeSingle();
            if (error) throw error;
            return data as OwlPayEmailConfig | null;
        },
        enabled: !!companyId,
    });
};

export const useSaveOwlPayEmailConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: OwlPayEmailConfig) => {
            const { data: existing } = await supabase
                .from('owl_pay_email_config')
                .select('id')
                .eq('company_id', payload.company_id)
                .maybeSingle();

            if (existing?.id) {
                const { data, error } = await supabase
                    .from('owl_pay_email_config')
                    .update({ ...payload, updated_at: new Date().toISOString() })
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }

            const { data, error } = await supabase
                .from('owl_pay_email_config')
                .insert(payload)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['owlpay_email_config', variables.company_id] });
        },
    });
};

export const useOwlPayReports = (companyId: string | null, fromISO: string, toISO: string, search = '') => {
    return useQuery({
        queryKey: ['owlpay_reports', companyId, fromISO, toISO, search],
        queryFn: async () => {
            if (!companyId) {
                return {
                    totalRevenue: 0,
                    totalItems: 0,
                    mostPopular: 'N/A',
                    avgTransaction: 0,
                    purchases: [] as any[],
                };
            }

            const { data, error } = await supabase
                .from('owl_pay_transactions')
                .select('id, amount, is_free, created_at, item_id, owl_pay_items(name, category), children(name), staff(name)')
                .eq('company_id', companyId)
                .eq('transaction_type', 'purchase')
                .gte('created_at', fromISO)
                .lte('created_at', toISO)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const purchases = (data || []).map((tx: any) => ({
                id: tx.id,
                camper_name: tx.children?.name || tx.staff?.name || 'Unknown',
                item_name: tx.owl_pay_items?.name || 'Unknown',
                item_category: tx.owl_pay_items?.category || 'other',
                amount: Number(tx.amount || 0),
                is_free: !!tx.is_free,
                purchased_at: tx.created_at,
            }));

            const filtered = purchases.filter((p) => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return p.camper_name.toLowerCase().includes(q) || p.item_name.toLowerCase().includes(q);
            });

            const totalRevenue = purchases.reduce((sum, p) => sum + p.amount, 0);
            const totalItems = purchases.length;
            const counts = new Map<string, number>();
            purchases.forEach((p) => counts.set(p.item_name, (counts.get(p.item_name) || 0) + 1));
            const mostPopular = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

            return {
                totalRevenue,
                totalItems,
                mostPopular,
                avgTransaction: totalItems ? totalRevenue / totalItems : 0,
                purchases: filtered,
            };
        },
        enabled: !!companyId,
    });
};
