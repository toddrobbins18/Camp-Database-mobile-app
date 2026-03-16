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

// Only approved users (they belong in Admin Panel after approval, not in User Approvals).
export const useAdminUsers = () => {
    return useQuery({
        queryKey: ['adminUsers'],
        queryFn: async () => {
            let { data: users, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('approved', true);

            if (error) {
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

/** Send password reset email to a user (admin/super_admin). Uses Supabase auth. */
export const useSendPasswordReset = () => {
    return useMutation({
        mutationFn: async (email: string) => {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: undefined, // Uses Supabase project default URL
            });
            if (error) throw error;
        },
    });
};

/**
 * Delete a user. Tries RPC (bypasses RLS) then falls back to direct table delete.
 */
async function adminDeleteUser(userId: string): Promise<void> {
    // Method 1: RPC (SECURITY DEFINER — works if run_in_sql_editor.sql was executed)
    const { error: rpcError } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
    if (!rpcError) return; // success

    // Method 2: Direct table operations (if RPC function doesn't exist yet)
    console.log('RPC failed, falling back to direct delete:', rpcError.message);

    // Delete user_roles first
    await supabase.from('user_roles').delete().eq('user_id', userId);
    // Nullify incident_reports FKs
    await supabase.from('incident_reports').update({ resolved_by: null }).eq('resolved_by', userId);
    await supabase.from('incident_reports').update({ created_by: null }).eq('created_by', userId);
    // Delete the profile — use .select() to verify it actually deleted
    const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
        .select('id');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
        throw new Error('Could not delete user. RLS may be blocking. Run run_in_sql_editor.sql in Supabase SQL Editor.');
    }
}

/** Permanently delete user from Admin Panel. */
export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminDeleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
    });
};

/** Get error message from edge function invoke (4xx/5xx body or Supabase error). */
async function getCreateUserErrorMessage(error: unknown): Promise<string> {
    const e = error as Error & {
        context?: {
            json?: () => Promise<{ error?: string }>;
            body?: string;
            status?: number;
        };
    };
    const fallback = e?.message ?? (error != null ? String(error) : 'Create user failed.');
    if (!e?.context) return fallback || 'Create user failed.';
    try {
        if (typeof e.context.json === 'function') {
            const body = await e.context.json();
            if (body?.error && typeof body.error === 'string') return body.error;
        }
        if (typeof e.context.body === 'string') {
            try {
                const parsed = JSON.parse(e.context.body) as { error?: string };
                if (parsed?.error) return parsed.error;
            } catch (_) {}
            if (e.context.body.length < 200) return e.context.body;
        }
    } catch (_) {}
    return fallback || 'Create user failed.';
}

/** Create a new user (admin/super_admin). Calls create-user edge function; user can log in immediately. */
export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (params: { email: string; password: string; fullName: string; role: string; companyId: string | null }) => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) throw new Error('You must be signed in to create users.');
                const { data, error } = await supabase.functions.invoke('create-user', {
                    body: {
                        email: params.email.trim(),
                        password: params.password,
                        fullName: params.fullName.trim(),
                        role: params.role,
                        companyId: params.companyId || undefined,
                    },
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                const result = (data ?? null) as { error?: string } | null;
                if (result?.error && typeof result.error === 'string') throw new Error(result.error);
                if (error) {
                    const msg = await getCreateUserErrorMessage(error);
                    throw new Error(msg || 'Create user failed. Deploy the create-user edge function and try again.');
                }
                return data;
            } catch (err) {
                if (err instanceof Error) throw err;
                throw new Error(err != null ? String(err) : 'Create user failed.');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
    });
};

// --------- User Approvals --------- //
// Only users who have applied and are NOT yet approved (pending). Exclude approved and rejected.
export const usePendingUsers = () => {
    return useQuery({
        queryKey: ['pendingUsers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or('approved.eq.false,approved.is.null')
                .order('approval_requested_at', { ascending: false });

            if (error) throw error;

            // Exclude any profile that is explicitly approved (defensive)
            const pending = (data || []).filter((u: any) => u.approved !== true);
            return pending.map((u: any) => ({
                id: u.id,
                name: u.full_name || u.email?.split('@')[0] || 'No Name',
                email: u.email || '',
                requestedAt: u.approval_requested_at || u.created_at || new Date().toISOString()
            }));
        }
    });
};

export const useApproveUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, companyId }: { userId: string, companyId: string }) => {
            // 1. Approve the profile and assign company
            const { data: updated, error: profileError } = await supabase
                .from('profiles')
                .update({ approved: true, company_id: companyId })
                .eq('id', userId)
                .select('id')
                .single();

            if (profileError) throw profileError;
            if (!updated) throw new Error('Profile update had no effect. You may not have permission to approve users.');

            // 2. Add standard Staff role for that company
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert([{ user_id: userId, company_id: companyId, role: 'staff' }]);

            // Ignore duplicate key errors if role somehow exists
            if (roleError && roleError.code !== '23505') throw roleError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        }
    });
};

/** Reject a pending user from User Approvals. */
export const useRejectUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminDeleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
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
