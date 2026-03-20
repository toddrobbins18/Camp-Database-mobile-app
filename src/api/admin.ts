import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseAnonKey, supabaseUrl } from '../lib/supabase';

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

function roleLabelFromAppRole(appRole: string): string {
    const r = String(appRole || '').toLowerCase();
    switch (r) {
        case 'super_admin':
            return 'Super Admin';
        case 'admin':
            return 'Admin';
        case 'division_leader':
            return 'Division Leader';
        case 'specialist':
            return 'Specialist';
        case 'health_center':
            return 'Health Center';
        case 'viewer':
            return 'Viewer';
        case 'staff':
        default:
            return 'Staff';
    }
}

function appRoleFromRoleLabel(roleLabel: string): string {
    const r = String(roleLabel || '').trim().toLowerCase();
    // Accept both labels ("Admin") and app roles ("admin").
    if (r === 'super admin') return 'super_admin';
    if (r === 'division leader') return 'division_leader';
    if (r === 'health center') return 'health_center';
    if (r === 'super_admin') return 'super_admin';
    if (r === 'division_leader') return 'division_leader';
    if (r === 'health_center') return 'health_center';
    if (['admin', 'staff', 'viewer', 'specialist', 'super_admin', 'division_leader', 'health_center'].includes(r)) return r;
    return 'staff';
}

// Only approved users (they belong in Admin Panel after approval, not in User Approvals).
// Mirrors the web workflow: list approved profiles for the selected company, compute highest role from user_roles.
export const useAdminUsers = (companyId: string | null) => {
    return useQuery({
        queryKey: ['adminUsers', companyId],
        enabled: true,
        queryFn: async () => {
            const { data: authData } = await supabase.auth.getUser();
            const currentUserId = authData?.user?.id;
            if (!currentUserId) return [] as AdminUser[];

            // Determine whether current user is super admin (so they can see all companies).
            const { data: currentRolesData, error: currentRolesErr } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', currentUserId);

            if (currentRolesErr) throw currentRolesErr;
            const currentRoles = (currentRolesData || []).map((r: any) => String(r?.role ?? '').toLowerCase());
            const isSuperAdminUser = currentRoles.includes('super_admin');

            // If we don't have companyId from the app context yet, fall back to the user's profile company_id.
            let effectiveCompanyId = companyId;
            if (!effectiveCompanyId && !isSuperAdminUser) {
                const { data: myProfile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', currentUserId)
                    .maybeSingle();
                effectiveCompanyId = myProfile?.company_id ?? null;
            }

            if (!isSuperAdminUser && !effectiveCompanyId) return [] as AdminUser[];

            // Mirror web admin: it lists profiles by company_id (no `approved` filter).
            let profilesQuery = supabase
                .from('profiles')
                // `profiles` does not have a `tags` column. Tags are handled separately in the web app.
                .select('id, email, full_name, company_id');

            if (!isSuperAdminUser) {
                profilesQuery = profilesQuery.eq('company_id', effectiveCompanyId);
            }

            const { data: profiles, error: profilesErr } = await profilesQuery;
            if (profilesErr) throw profilesErr;

            const profileList = profiles || [];
            const profileIds = profileList.map((p: any) => p.id);
            if (profileIds.length === 0) return [] as AdminUser[];

            // Fetch all roles for these users in one call, like the web workflow.
            const { data: rolesRows, error: rolesErr } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .in('user_id', profileIds);

            if (rolesErr) throw rolesErr;

            const rolesByUserId = new Map<string, string[]>();
            for (const row of (rolesRows || []) as any[]) {
                const uid = String(row.user_id);
                const role = String(row.role ?? '').toLowerCase();
                if (!rolesByUserId.has(uid)) rolesByUserId.set(uid, []);
                rolesByUserId.get(uid)!.push(role);
            }

            // Same priority as web app: super_admin > admin > division_leader > staff > specialist > health_center
            const usersWithRoles: AdminUser[] = profileList.map((p: any) => {
                const roles = rolesByUserId.get(String(p.id)) || [];
                let appRole = 'viewer';
                if (roles.includes('super_admin')) appRole = 'super_admin';
                else if (roles.includes('admin')) appRole = 'admin';
                else if (roles.includes('division_leader')) appRole = 'division_leader';
                else if (roles.includes('staff')) appRole = 'staff';
                else if (roles.includes('specialist')) appRole = 'specialist';
                else if (roles.includes('health_center')) appRole = 'health_center';

                return {
                    id: p.id,
                    name: p.full_name || p.email?.split('@')[0] || 'Unknown',
                    email: p.email || '',
                    role: roleLabelFromAppRole(appRole),
                    roleColor: '#2563eb',
                    tags: [],
                };
            });

            return usersWithRoles;
        }
    });
};

export const useUpdateUserRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, role, companyId }: { userId: string; role: string; companyId: string }) => {
            if (!companyId) throw new Error('Missing companyId.');

            const appRole = appRoleFromRoleLabel(role);

            // Mirror the web workflow: delete existing roles for this user, then insert the selected role.
            const { error: delErr } = await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', userId);
            if (delErr) throw delErr;

            const { error: insErr } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role: appRole,
                    company_id: companyId,
                });
            if (insErr) throw insErr;
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
                // create-user verifies the caller via Authorization token.
                const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
                let accessToken = refreshed.session?.access_token;
                if (!accessToken) {
                    const { data: { session } } = await supabase.auth.getSession();
                    accessToken = session?.access_token ?? undefined;
                }
                if (!accessToken) {
                    throw new Error(refreshErr?.message || 'Session expired or missing. Sign out and sign in again, then retry.');
                }

                const url = `${supabaseUrl}/functions/v1/create-user`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                        apikey: supabaseAnonKey,
                    },
                    body: JSON.stringify({
                        email: params.email.trim(),
                        password: params.password,
                        fullName: params.fullName.trim(),
                        role: params.role,
                        companyId: params.companyId || undefined,
                    }),
                });

                const text = await res.text();
                let parsed: any = null;
                try {
                    parsed = JSON.parse(text);
                } catch (_) {
                    parsed = null;
                }

                if (!res.ok) {
                    const msg = parsed?.error || text || `Request failed (${res.status})`;
                    throw new Error(msg);
                }
                if (parsed?.error) throw new Error(parsed.error);
                return parsed;
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

            // Ensure Auth email is confirmed so the user can sign in with password.
            // (Admin approval updates profiles only; if Supabase requires email confirmation, sign-in fails.)
            const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
            const accessToken = refreshed.session?.access_token;
            if (!accessToken) {
                // Do not fail the whole approve flow; just warn.
                console.warn(refreshErr?.message || 'No access token available to confirm user email.');
                return;
            }

            const confirmRes = await fetch(`${supabaseUrl}/functions/v1/confirm-user-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                    apikey: supabaseAnonKey,
                },
                body: JSON.stringify({ userId }),
            });

            if (!confirmRes.ok) {
                // Approval already succeeded; don't block.
                const txt = await confirmRes.text().catch(() => '');
                console.warn('confirm-user-email failed:', txt || confirmRes.status);
            }
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
