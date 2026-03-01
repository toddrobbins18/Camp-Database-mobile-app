import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

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
    // Joined data
    children?: Array<{ id: string; first_name: string; last_name: string }>;
}

export const useIncidentReports = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['incident_reports', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('incident_reports')
                .select(`
                    *,
                    incident_children (
                        child_id,
                        children:child_id ( id, first_name, last_name )
                    )
                `)
                .eq('company_id', companyId)
                .order('date', { ascending: false });

            if (error) throw error;

            return (data || []).map((report: any) => ({
                ...report,
                children: (report.incident_children || [])
                    .map((ic: any) => ic.children)
                    .filter(Boolean),
            }));
        },
        enabled: !!companyId,
    });
};

export const useAddIncidentReport = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ childIds, ...reportData }: Omit<IncidentReport, 'id' | 'created_at' | 'children'> & { childIds?: string[] }) => {
            // Insert incident report
            const { data: report, error: reportError } = await supabase
                .from('incident_reports')
                .insert([reportData])
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

                if (childError) console.error('Error linking children:', childError);
            }

            return report;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incident_reports', variables.company_id] });
        },
    });
};

export const useDeleteIncidentReport = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string; company_id: string }) => {
            const { error } = await supabase
                .from('incident_reports')
                .delete()
                .eq('id', params.id);

            if (error) throw error;
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['incident_reports', params.company_id] });
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
