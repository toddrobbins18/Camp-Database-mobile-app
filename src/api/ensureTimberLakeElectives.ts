import { supabase } from '../lib/supabase';
import { TIMBER_LAKE_DEFAULT_ELECTIVES } from '../constants/timberLakeElectives';

/**
 * Ensures all default Timber Lake electives exist for `companyId` (idempotent).
 * Inserts only rows missing by `name` (unique per company).
 */
export async function ensureTimberLakeElectives(companyId: string): Promise<{ error?: string }> {
    const { data: existing, error: selErr } = await supabase
        .from('electives')
        .select('name')
        .eq('company_id', companyId);
    if (selErr) return { error: selErr.message };
    const have = new Set((existing || []).map((r: { name: string }) => r.name));
    const missing = TIMBER_LAKE_DEFAULT_ELECTIVES.filter((e) => !have.has(e.name));
    if (missing.length === 0) return {};
    const { error: insErr } = await supabase.from('electives').insert(
        missing.map((e) => ({
            company_id: companyId,
            name: e.name,
            capacity: e.capacity,
            is_active: true,
        }))
    );
    if (insErr) return { error: insErr.message };
    return {};
}
