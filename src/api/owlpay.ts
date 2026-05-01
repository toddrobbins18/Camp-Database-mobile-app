import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type OwlPayCamper = {
    id: string;
    name: string;
    person_id: string | null;
    rfid: string | null;
    photo_url: string | null;
    owl_pay_balance: number;
};

export type OwlPayStaff = {
    id: string;
    name: string;
    person_id: string | null;
    rfid: string | null;
    photo_url: string | null;
};

export type OwlPayStaffSpendRow = OwlPayStaff & { total_spent: number };

export type ReportAudience = 'all' | 'campers' | 'staff';

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
                .select('id, name, person_id, rfid, photo_url, owl_pay_balance')
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
                .select('id, name, person_id, rfid, photo_url')
                .eq('company_id', companyId)
                .eq('season', season)
                .neq('status', 'inactive')
                .order('name', { ascending: true });

            const q = search.trim();
            if (q) {
                query = query.or(`name.ilike.%${q}%,rfid.ilike.%${q}%,person_id.ilike.%${q}%`);
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

function classifyPurchaseBuyer(tx: any): 'camper' | 'staff' | 'unknown' {
    if (tx.staff_id) return 'staff';
    if (tx.child_id) return 'camper';
    return 'unknown';
}

function matchesAudience(buyer: 'camper' | 'staff' | 'unknown', audience: ReportAudience): boolean {
    if (audience === 'all') return buyer === 'camper' || buyer === 'staff';
    if (audience === 'campers') return buyer === 'camper';
    return buyer === 'staff';
}

export type OwlPayReportsResult = {
    totalRevenue: number;
    totalItems: number;
    mostPopular: string;
    avgTransaction: number;
    salesByItem: { id: string; name: string; category: string; quantity: number; revenue: number }[];
    salesOverTime: { date: string; revenue: number; count: number }[];
    purchases: any[];
    purchasesAll: any[];
};

export const useOwlPayReports = (
    companyId: string | null,
    fromISO: string,
    toISO: string,
    audience: ReportAudience,
    search = ''
) => {
    return useQuery({
        queryKey: ['owlpay_reports', companyId, fromISO, toISO, audience, search],
        queryFn: async (): Promise<OwlPayReportsResult> => {
            const empty: OwlPayReportsResult = {
                totalRevenue: 0,
                totalItems: 0,
                mostPopular: 'N/A',
                avgTransaction: 0,
                salesByItem: [],
                salesOverTime: [],
                purchases: [],
                purchasesAll: [],
            };

            if (!companyId) return empty;

            const { data, error } = await supabase
                .from('owl_pay_transactions')
                .select(
                    'id, amount, is_free, created_at, item_id, child_id, staff_id, owl_pay_items(name, category), children(name), staff(name)'
                )
                .eq('company_id', companyId)
                .eq('transaction_type', 'purchase')
                .gte('created_at', fromISO)
                .lte('created_at', toISO)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const itemMap = new Map<string, { id: string; name: string; category: string; quantity: number; revenue: number }>();
            const dateMap = new Map<string, { revenue: number; count: number }>();
            const purchasesAll: any[] = [];
            let totalRevenue = 0;
            let totalItems = 0;

            (data || []).forEach((tx: any) => {
                const buyer = classifyPurchaseBuyer(tx);
                if (!matchesAudience(buyer, audience)) return;

                const item = tx.owl_pay_items;
                if (!item || !tx.item_id) return;

                const amount = Number(tx.amount || 0);
                const key = tx.item_id;

                if (!itemMap.has(key)) {
                    itemMap.set(key, {
                        id: key,
                        name: item.name || 'Unknown',
                        category: item.category || 'other',
                        quantity: 0,
                        revenue: 0,
                    });
                }
                const row = itemMap.get(key)!;
                row.quantity += 1;
                row.revenue += amount;

                const dateKey = new Date(tx.created_at).toLocaleDateString();
                if (!dateMap.has(dateKey)) dateMap.set(dateKey, { revenue: 0, count: 0 });
                const dd = dateMap.get(dateKey)!;
                dd.revenue += amount;
                dd.count += 1;

                purchasesAll.push({
                    id: tx.id,
                    buyer_type: buyer === 'staff' ? 'staff' : 'camper',
                    camper_name: tx.children?.name || tx.staff?.name || 'Unknown',
                    item_name: item.name || 'Unknown',
                    item_category: item.category || 'other',
                    amount,
                    is_free: !!tx.is_free,
                    purchased_at: tx.created_at,
                });

                totalRevenue += amount;
                totalItems += 1;
            });

            const salesByItem = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);
            const salesOverTime = Array.from(dateMap.entries())
                .map(([date, d]) => ({ date, revenue: d.revenue, count: d.count }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const q = search.trim().toLowerCase();
            const purchases = purchasesAll.filter((p) => {
                if (!q) return true;
                return p.camper_name.toLowerCase().includes(q) || p.item_name.toLowerCase().includes(q);
            });

            return {
                totalRevenue,
                totalItems,
                mostPopular: salesByItem[0]?.name || 'N/A',
                avgTransaction: totalItems ? totalRevenue / totalItems : 0,
                salesByItem,
                salesOverTime,
                purchases,
                purchasesAll,
            };
        },
        enabled: !!companyId,
    });
};

export const useOwlPayStaffSpendRows = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['owlpay_staff_spend', companyId, season],
        queryFn: async (): Promise<OwlPayStaffSpendRow[]> => {
            if (!companyId || !season) return [];

            const [{ data: staffList, error: staffErr }, { data: txs, error: txErr }] = await Promise.all([
                supabase
                    .from('staff')
                    .select('id, name, person_id, rfid, photo_url')
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .neq('status', 'inactive')
                    .order('name', { ascending: true }),
                supabase
                    .from('owl_pay_transactions')
                    .select('staff_id, amount')
                    .eq('company_id', companyId)
                    .eq('transaction_type', 'purchase')
                    .not('staff_id', 'is', null),
            ]);

            if (staffErr) throw staffErr;
            if (txErr) throw txErr;

            const spentByStaff = new Map<string, number>();
            for (const tx of txs || []) {
                const sid = (tx as any).staff_id as string;
                if (!sid) continue;
                spentByStaff.set(sid, (spentByStaff.get(sid) || 0) + Number((tx as any).amount || 0));
            }

            return (staffList || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                person_id: s.person_id ?? null,
                rfid: s.rfid ?? null,
                photo_url: s.photo_url ?? null,
                total_spent: spentByStaff.get(s.id) || 0,
            }));
        },
        enabled: !!companyId && !!season,
    });
};
