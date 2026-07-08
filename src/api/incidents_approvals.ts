import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';

// ===================== INCIDENT REPORTS =====================

export interface IncidentReport {
    id: string;
    child_id?: string;
    date: string;
    type: string;
    description: string;
    severity?: string;
    reported_by?: string;
    reporter_id?: string;
    status: string;
    tags?: string[];
    company_id?: string;
    season?: string;
    created_at?: string;
    // Joined data (children table uses `name`, not first_name/last_name)
    children?: Array<{ id: string; name?: string }>;
}

const incidentsCacheKey = (companyId: string, season: string) => `incident_reports:${companyId}:${season}`;

async function applyQueuedIncidentOps(base: IncidentReport[]): Promise<IncidentReport[]> {
    const out = [...base];
    const queued = await listQueued('incident_reports.');
    for (const q of queued) {
        if (q.action === 'incident_reports.insert') {
            const payload = q.payload as any;
            const reportData = payload?.reportData;
            const childIds = payload?.childIds || [];
            if (!reportData) continue;
            
            // Mock the children array for offline display
            const mockChildren = childIds.map((id: string) => ({ id, name: 'Pending Sync...' }));
            
            out.push({
                ...(reportData as IncidentReport),
                id: (reportData.id as string) || `offline-${q.id}`,
                children: mockChildren,
            });
        } else if (q.action === 'incident_reports.update') {
            const payload = q.payload as any;
            const id = payload?.id as string | undefined;
            const update = payload?.update as Partial<IncidentReport> | undefined;
            if (!id || !update) continue;
            const idx = out.findIndex((r) => r.id === id);
            if (idx >= 0) out[idx] = { ...out[idx], ...update };
        } else if (q.action === 'incident_reports.delete') {
            const id = (q.payload as any)?.id as string | undefined;
            if (!id) continue;
            const idx = out.findIndex((r) => r.id === id);
            if (idx >= 0) out.splice(idx, 1);
        }
    }
    return out;
}

export const useIncidentReports = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['incident_reports', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            try {
                let query = supabase
                    .from('incident_reports')
                    .select(`
                        *,
                        incident_children (
                            child_id,
                            children ( id, name )
                        )
                    `)
                    .eq('company_id', companyId)
                    .order('date', { ascending: false });
                if (season) {
                    query = query.or(`season.eq.${season},season.is.null`);
                }
                const { data, error } = await query;

                if (error) throw error;

                const rows = (data || []).map((report: any) => ({
                    ...report,
                    children: (report.incident_children || [])
                        .map((ic: any) => ic.children)
                        .filter(Boolean),
                })) as IncidentReport[];
                await setCachedJson(incidentsCacheKey(companyId, season), rows);
                return await applyQueuedIncidentOps(rows);
            } catch {
                const cached = (await getCachedJson<IncidentReport[]>(incidentsCacheKey(companyId, season))) || [];
                return await applyQueuedIncidentOps(cached);
            }
        },
        enabled: !!companyId,
    });
};

export const useAddIncidentReport = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ childIds, ...reportData }: Omit<IncidentReport, 'id' | 'created_at' | 'children'> & { childIds?: string[] }) => {
            if (await isOnlineNow()) {
                const primaryChildId = childIds?.[0];
                // Insert incident report
                const { data: report, error: reportError } = await supabase
                    .from('incident_reports')
                    .insert([{
                        ...reportData,
                        ...(primaryChildId ? { child_id: primaryChildId } : {}),
                    }])
                    .select()
                    .single();

                if (reportError) throw reportError;

                // Insert child associations if any
                if (childIds && childIds.length > 0 && report) {
                    const childRows = childIds.map(childId => ({
                        incident_id: report.id,
                        child_id: childId,
                    }));

                    const { error: childError } = await supabase
                        .from('incident_children')
                        .insert(childRows);

                    if (childError) throw childError;
                }

                return report;
            }
            const offlineReport = {
                ...reportData,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            };
            await enqueueSync('incident_reports.insert', { reportData, childIds: childIds || [] });
            return offlineReport as any;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incident_reports', variables.company_id] });
            queryClient.invalidateQueries({ queryKey: ['camper_incidents'] });
        },
    });
};

export const useUpdateIncidentReport = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            company_id,
            ...updates
        }: {
            id: string;
            company_id: string;
            date?: string;
            type?: string;
            description?: string;
            severity?: string;
            reported_by?: string;
            status?: string;
            tags?: string[];
        }) => {
            if (await isOnlineNow()) {
                const { data, error } = await supabase
                    .from('incident_reports')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
            await enqueueSync('incident_reports.update', { id, update: updates });
            return { id, ...updates } as any;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incident_reports', variables.company_id] });
            queryClient.invalidateQueries({ queryKey: ['camper_incidents'] });
        },
    });
};

export const useDeleteIncidentReport = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string; company_id: string }) => {
            if (await isOnlineNow()) {
                const { error } = await supabase.from('incident_reports').delete().eq('id', params.id);
                if (error) throw error;
            } else {
                await enqueueSync('incident_reports.delete', { id: params.id });
            }
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['incident_reports', params.company_id] });
            queryClient.invalidateQueries({ queryKey: ['camper_incidents'] });
        },
    });
};

// ===================== USER APPROVALS =====================

export interface PendingUser {
    id: string;
    name: string;
    email: string;
    created_at: string;
    approved?: boolean;
    role?: string;
}

export const usePendingApprovals = (companyId: string | null) => {
    return useQuery({
        queryKey: ['pending_approvals', companyId],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, created_at, approved, role, approval_requested_at')
                .eq('company_id', companyId)
                .or('approved.is.null,approved.eq.false')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map((u: any) => ({
                id: u.id,
                name: u.full_name || u.email?.split('@')[0] || 'Unknown',
                email: u.email || '',
                created_at: u.approval_requested_at || u.created_at,
                approved: u.approved,
                role: u.role,
            })) as PendingUser[];
        },
        enabled: !!companyId,
    });
};

export const useApproveUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { userId: string; companyId: string }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ approved: true })
                .eq('id', params.userId);

            if (error) throw error;
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['pending_approvals', params.companyId] });
        },
    });
};

export const useRejectUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { userId: string; companyId: string }) => {
            // Soft reject by deleting or marking as rejected
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', params.userId);

            if (error) throw error;
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['pending_approvals', params.companyId] });
        },
    });
};
