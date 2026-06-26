import { supabase } from './supabase';

export type BunkListItem = {
    id: string;
    bunk_number: string;
    bunk_name: string | null;
};

/** Bunk list for a company + season (same filters as web OD / Add Staff). */
export async function fetchBunksForCompanySeason(
    companyId: string,
    seasonKey: string
): Promise<BunkListItem[]> {
    const { data, error } = await supabase
        .from('bunks')
        .select('id, bunk_number, bunk_name')
        .eq('company_id', companyId)
        .eq('season', seasonKey)
        .eq('is_active', true)
        .order('bunk_number', { ascending: true });

    if (error) throw error;
    return (data as BunkListItem[]) || [];
}

/** Current bunker assignment from bunk_staff (OD reads this table). */
export async function fetchPrimaryBunkIdForStaff(
    staffId: string,
    companyId: string,
    seasonKey: string
): Promise<string | null> {
    const { data, error } = await supabase
        .from('bunk_staff')
        .select('bunk_id, is_primary')
        .eq('staff_id', staffId)
        .eq('company_id', companyId)
        .eq('season', seasonKey);

    if (error) throw error;
    const rows = data || [];
    const primary = rows.find((r) => r.is_primary) ?? rows[0];
    return primary?.bunk_id ?? null;
}

/**
 * Keeps bunker in sync with web OD: delete all rows for staff+company, then optionally insert primary.
 */
export async function syncStaffBunkStaff(params: {
    staffId: string;
    companyId: string;
    seasonKey: string;
    bunkId: string | null;
}): Promise<void> {
    const { staffId, companyId, seasonKey, bunkId } = params;

    const { error: delErr } = await supabase
        .from('bunk_staff')
        .delete()
        .eq('staff_id', staffId)
        .eq('company_id', companyId);

    if (delErr) throw delErr;

    if (bunkId) {
        const { error: insErr } = await supabase.from('bunk_staff').insert([
            {
                bunk_id: bunkId,
                staff_id: staffId,
                company_id: companyId,
                season: seasonKey,
                is_primary: true,
            },
        ]);
        if (insErr) throw insErr;
    }
}
