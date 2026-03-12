import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// --------- User Management --------- //
export interface AdminUser {
    id: string;
    person_id?: string;
    email?: string;
    name: string;
    role: string;
    roleColor?: string;
    tags?: string[];
}

export const useAdminUsers = () => {
    return useQuery({
        queryKey: ['adminUsers'],
        queryFn: async () => {
            // First try fetching profiles and user_roles if they exist
            let { data: users, error } = await supabase.from('profiles').select('*');

            if (error) {
                // Fallback to staff if profiles is well-protected or doesn't exist
                const { data: staff, error: staffError } = await supabase.from('staff').select('*');
                if (staffError) throw staffError;
                users = staff;
            }

            return (users || []).map((u: any) => ({
                id: u.id || u.person_id || Math.random().toString(),
                name: u.full_name || u.name || u.email?.split('@')[0] || 'Unknown',
                email: u.email || '',
                role: u.role || 'Staff',
                roleColor: '#2563eb',
                tags: u.tags || []
            })) as AdminUser[];
        }
    });
};

export const useUpdateUserRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
            // Updating role in staff table as fallback
            const { error } = await supabase.from('staff').update({ role }).eq('id', userId);
            if (error) {
                // If profiles role update needed
                const { error: pError } = await supabase.from('user_roles').update({ role }).eq('user_id', userId);
                if (pError) throw pError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        }
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: string) => {
            // Usually we don't delete auth.users from client; just deactivate profile/staff
            const { error } = await supabase.from('staff').update({ status: 'inactive' }).eq('id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        }
    });
};

// --------- User Approvals --------- //
export const usePendingUsers = () => {
    return useQuery({
        queryKey: ['pendingUsers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('approved', false);

            if (error) throw error;

            return (data || []).map((u: any) => ({
                id: u.id,
                name: u.full_name || u.email?.split('@')[0] || 'Unknown',
                email: u.email || '',
                requestedAt: u.created_at || new Date().toISOString()
            }));
        }
    });
};

export const useApproveUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, companyId }: { userId: string, companyId: string }) => {
            // 1. Approve the profile and assign company
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ approved: true, company_id: companyId })
                .eq('id', userId);

            if (profileError) throw profileError;

            // 2. Add standard Staff role for that company
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert([{ user_id: userId, company_id: companyId, role: 'Staff' }]);

            // Ignore duplicate key errors if role somehow exists
            if (roleError && roleError.code !== '23505') throw roleError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        }
    });
};

export const useRejectUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: string) => {
            // For now, we'll just delete the profile record to reject them.
            // Alternatively, we could set a 'rejected' flag if the schema supported it.
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
        }
    });
};

// --------- Email Automation --------- //
export interface EmailConfig {
    id: string;
    title: string;
    description: string;
    enabled: boolean;
    selectedTags: string[];
    selectedTimings: string[];
    lastUpdated: string;
}

export const useEmailConfigs = () => {
    return useQuery({
        queryKey: ['emailConfigs'],
        queryFn: async () => {
            const { data, error } = await supabase.from('automated_email_config').select('*');
            if (error) throw error;
            return data.map((d: any) => ({
                id: d.id,
                title: d.email_type || 'Unknown Title',
                description: d.description || '',
                enabled: d.enabled,
                selectedTags: d.recipient_tags || [],
                selectedTimings: d.send_timing || [],
                lastUpdated: d.updated_at || new Date().toISOString()
            })) as EmailConfig[];
        }
    });
};

export const useUpdateEmailConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (config: Partial<EmailConfig> & { id: string }) => {
            const { error } = await supabase.from('automated_email_config').update({
                enabled: config.enabled,
                recipient_tags: config.selectedTags,
                send_timing: config.selectedTimings
            }).eq('id', config.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emailConfigs'] });
        }
    });
};

// --------- Edit History (Audit Logs) --------- //
export interface EditHistoryEntry {
    id: string;
    dateTime: string;
    user: string;
    table: string;
    action: string;
    recordId: string;
}

export const useEditHistory = () => {
    return useQuery({
        queryKey: ['editHistory'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('changed_at', { ascending: false })
                .limit(100);

            if (error) {
                // Return empty if audit_logs table isn't accessible
                return [];
            }

            return data.map((log: any) => ({
                id: log.id,
                dateTime: new Date(log.changed_at).toLocaleString(),
                user: log.user_id || 'System',
                table: log.table_name || 'Unknown',
                action: log.action || 'UPDATE',
                recordId: log.record_id || ''
            })) as EditHistoryEntry[];
        }
    });
};
