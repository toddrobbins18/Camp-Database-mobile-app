import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { filterActiveRoster } from '../lib/rosterStatus';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';

// Define the shape of staff data
export interface StaffMember {
    id?: string;
    company_id: string;
    person_id?: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
    department?: string;
    hire_date?: string;
    date_of_birth?: string;
    status?: string;
    season: string;
    rfid?: string;
    staff_type?: string;
    allergies?: string;
    reports_to?: string;
    created_at?: string;
}

const staffCacheKey = (companyId: string, season: string) => `staff:${companyId}:${season}`;

async function applyQueuedStaffOps(base: StaffMember[], companyId: string, season: string): Promise<StaffMember[]> {
    const out = [...base];
    const queued = await listQueued('staff.');
    for (const q of queued) {
        if (q.action === 'staff.insert') {
            const rows = Array.isArray(q.payload) ? (q.payload as any[]) : [q.payload as any];
            for (const row of rows) {
                if (!row || row.company_id !== companyId || row.season !== season) continue;
                out.push({ ...(row as StaffMember), id: (row.id as string) || `offline-${q.id}` });
            }
        } else if (q.action === 'staff.update') {
            const payload = q.payload as any;
            const id = payload?.id as string | undefined;
            const update = payload?.update as Partial<StaffMember> | undefined;
            if (!id || !update) continue;
            const idx = out.findIndex((s) => s.id === id);
            if (idx >= 0) out[idx] = { ...out[idx], ...update };
        } else if (q.action === 'staff.delete') {
            const id = (q.payload as any)?.id as string | undefined;
            if (!id) continue;
            const idx = out.findIndex((s) => s.id === id);
            if (idx >= 0) out.splice(idx, 1);
        }
    }
    return out;
}

// Hook to fetch all staff for a company and season
export const useStaff = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['staff', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            try {
                const { data, error } = await supabase
                    .from('staff')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .neq('status', 'inactive')
                    .order('name', { ascending: true });

                if (error) throw error;
                const rows = filterActiveRoster((data as StaffMember[]) || []);
                await setCachedJson(staffCacheKey(companyId, season), rows);
                return await applyQueuedStaffOps(rows, companyId, season);
            } catch {
                const cached = filterActiveRoster(
                    (await getCachedJson<StaffMember[]>(staffCacheKey(companyId, season))) || [],
                );
                return await applyQueuedStaffOps(cached, companyId, season);
            }
        },
        enabled: !!companyId && !!season,
    });
};

// Hook to add a new staff member (pass a row built with buildStaffInsertRow — only real DB columns)
export const useAddStaff = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (row: Record<string, unknown>) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase.from('staff').insert([row]).select().single();
                if (error) throw error;
                return data;
            }
            const offlineRow = {
                ...row,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            };
            await enqueueSync('staff.insert', [offlineRow]);
            return offlineRow;
        },
        onSuccess: (_, row) => {
            const cid = row.company_id as string;
            const s = row.season as string;
            if (cid && s) {
                queryClient.invalidateQueries({ queryKey: ['staff', cid, s] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['staff'] });
            }
        },
    });
};

// Hook to edit a staff member
export const useEditStaff = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (staffData: Partial<StaffMember> & { id: string }) => {
            const { id, ...updateData } = staffData;
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('staff')
                    .update(updateData)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            await enqueueSync('staff.update', { id, update: updateData });
            return { id, ...updateData } as any;
        },
        onSuccess: (data) => {
            // Invalidate the staff list for this company and season
            if (data?.company_id && data?.season) {
                queryClient.invalidateQueries({ queryKey: ['staff', data.company_id, data.season] });
            } else {
                // Fallback invalidate all staff if missing info
                queryClient.invalidateQueries({ queryKey: ['staff'] });
            }
        },
    });
};

// Hook to delete a staff member
export const useDeleteStaff = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string, company_id: string, season: string }) => {
            if (await isOnlineNow()) {
                const { error } = await supabase.from('staff').delete().eq('id', params.id);
                if (error) throw error;
            } else {
                await enqueueSync('staff.delete', { id: params.id });
            }
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['staff', params.company_id, params.season] });
        },
    });
};
