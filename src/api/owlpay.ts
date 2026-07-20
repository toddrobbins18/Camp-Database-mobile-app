import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';
import {
    fetchOwlPayReportBundle,
    type OwlPayBuyerSummary,
} from '../lib/owlPayReports';

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

async function readThroughCache<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
    try {
        const result = await fetcher();
        await setCachedJson(cacheKey, result);
        return result;
    } catch {
        const cached = await getCachedJson<T>(cacheKey);
        if (cached != null) return cached;
        throw new Error('No cached data available');
    }
}

export const useOwlPayCampers = (companyId: string | null, season: string, search = '') => {
    return useQuery({
        queryKey: ['owlpay_campers', companyId, season, search],
        queryFn: async () => {
            if (!companyId) return [] as OwlPayCamper[];
            const q = search.trim();
            return readThroughCache<OwlPayCamper[]>(`owlpay_campers:${companyId}:${season}:${q}`, async () => {
                let query = supabase
                    .from('children')
                    .select('id, name, person_id, rfid, photo_url, owl_pay_balance')
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .neq('status', 'inactive')
                    .order('name', { ascending: true });

                if (q) {
                    query = query.or(`name.ilike.%${q}%,person_id.ilike.%${q}%,rfid.ilike.%${q}%`);
                }

                const { data, error } = await query;
                if (error) throw error;
                return (data || []) as OwlPayCamper[];
            });
        },
        enabled: !!companyId && !!season,
    });
};

export const useOwlPayItems = (companyId: string | null, includeInactive = false) => {
    return useQuery({
        queryKey: ['owlpay_items', companyId, includeInactive],
        queryFn: async () => {
            if (!companyId) return [] as OwlPayItem[];
            const base = await readThroughCache<OwlPayItem[]>(
                `owlpay_items:${companyId}:${String(includeInactive)}`,
                async () => {
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
            );
            const queued = await listQueued('owl_pay_items.');
            let out = [...base];
            for (const q of queued) {
                if (q.action === 'owl_pay_items.upsert') {
                    const row = (q.payload as any)?.payloadRow;
                    if (!row || row.company_id !== companyId) continue;
                    const idx = out.findIndex((r) => r.id === row.id);
                    if (idx >= 0) out[idx] = { ...out[idx], ...row };
                    else out.push({ ...(row as OwlPayItem), id: (row.id as string) || `offline-${q.id}` });
                } else if (q.action === 'owl_pay_items.delete') {
                    const id = (q.payload as any)?.id as string | undefined;
                    if (!id) continue;
                    out = out.filter((r) => r.id !== id);
                }
            }
            return out;
        },
        enabled: !!companyId,
    });
};

export const useOwlPayStaff = (companyId: string | null, season: string, search = '') => {
    return useQuery({
        queryKey: ['owlpay_staff', companyId, season, search],
        queryFn: async () => {
            if (!companyId) return [] as OwlPayStaff[];
            const q = search.trim();
            return readThroughCache<OwlPayStaff[]>(`owlpay_staff:${companyId}:${season}:${q}`, async () => {
                let query = supabase
                    .from('staff')
                    .select('id, name, person_id, rfid, photo_url')
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .neq('status', 'inactive')
                    .order('name', { ascending: true });

                if (q) {
                    query = query.or(`name.ilike.%${q}%,rfid.ilike.%${q}%,person_id.ilike.%${q}%`);
                }

                const { data, error } = await query;
                if (error) throw error;
                return (data || []) as OwlPayStaff[];
            });
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
            if (await isOnlineNow()) {
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
            }
            const offlineRow = { ...payload, id: payload.id || `offline-${Date.now()}` };
            await enqueueSync('owl_pay_items.upsert', { payloadRow: offlineRow });
            return offlineRow as any;
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
            if (await isOnlineNow()) {
                const { error } = await supabase.from('owl_pay_items').delete().eq('id', payload.id);
                if (error) throw error;
            } else {
                await enqueueSync('owl_pay_items.delete', { id: payload.id });
            }
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
            return readThroughCache<OwlPayEmailConfig | null>(`owlpay_email_config:${companyId}`, async () => {
                const { data, error } = await supabase
                    .from('owl_pay_email_config')
                    .select('*')
                    .eq('company_id', companyId)
                    .maybeSingle();
                if (error) throw error;
                return data as OwlPayEmailConfig | null;
            });
        },
        enabled: !!companyId,
    });
};

export const useSaveOwlPayEmailConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: OwlPayEmailConfig) => {
            if (await isOnlineNow()) {
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
            }
            await enqueueSync('owl_pay_email_config.save', { row: payload });
            return payload;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['owlpay_email_config', variables.company_id] });
        },
    });
};

export type OwlPayReportsResult = {
    totalRevenue: number;
    totalItems: number;
    freeItems: number;
    mostPopular: string;
    avgTransaction: number;
    salesByItem: { id: string; name: string; category: string; quantity: number; revenue: number }[];
    salesOverTime: { date: string; revenue: number; count: number }[];
    purchases: any[];
    purchasesAll: any[];
    buyerSummaries: OwlPayBuyerSummary[];
};

export const useOwlPayReports = (
    companyId: string | null,
    season: string | null,
    fromYmd: string,
    toYmd: string,
    audience: ReportAudience,
    search = ''
) => {
    return useQuery({
        queryKey: ['owlpay_reports', companyId, season, fromYmd, toYmd, audience, search],
        queryFn: async (): Promise<OwlPayReportsResult> => {
            const empty: OwlPayReportsResult = {
                totalRevenue: 0,
                totalItems: 0,
                freeItems: 0,
                mostPopular: 'N/A',
                avgTransaction: 0,
                salesByItem: [],
                salesOverTime: [],
                purchases: [],
                purchasesAll: [],
                buyerSummaries: [],
            };

            if (!companyId || !season) return empty;

            const bundle = await readThroughCache(
                `owlpay_reports:${companyId}:${season}:${fromYmd}:${toYmd}:${audience}`,
                async () =>
                    fetchOwlPayReportBundle(supabase, {
                        companyId,
                        season,
                        fromYmd,
                        toYmd,
                        audience,
                    }),
            );

            const q = search.trim().toLowerCase();
            const purchases = bundle.purchases.filter((p) => {
                if (!q) return true;
                return p.camper_name.toLowerCase().includes(q) || p.item_name.toLowerCase().includes(q);
            });
            const buyerSummaries = bundle.buyerSummaries.filter((s) => {
                if (!q) return true;
                return s.name.toLowerCase().includes(q);
            });

            return {
                totalRevenue: bundle.stats.totalRevenue,
                totalItems: bundle.stats.totalItems,
                freeItems: bundle.stats.freeItems,
                mostPopular: bundle.stats.mostPopular,
                avgTransaction: bundle.stats.avgTransaction,
                salesByItem: bundle.salesByItem,
                salesOverTime: bundle.salesOverTime,
                purchases,
                purchasesAll: bundle.purchases,
                buyerSummaries,
            };
        },
        enabled: !!companyId && !!season,
    });
};

export const useOwlPayStaffSpendRows = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['owlpay_staff_spend', companyId, season],
        queryFn: async (): Promise<OwlPayStaffSpendRow[]> => {
            if (!companyId || !season) return [];
            const cacheKey = `owlpay_staff_spend:${companyId}:${season}`;
            return readThroughCache<OwlPayStaffSpendRow[]>(cacheKey, async () => {
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
            });
        },
        enabled: !!companyId && !!season,
    });
};
