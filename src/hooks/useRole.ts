import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';

/**
 * Track only the auth user id. Session.user is a new object reference on many auth events
 * (refresh, focus); storing the full user caused unnecessary renders and effect churn.
 */
export const useRole = (overrideCompanyId?: string | null) => {
    const { companyId: contextCompanyId } = useCompany();
    const effectiveCompanyId = overrideCompanyId ?? contextCompanyId;

    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const applySession = (session: { user?: { id?: string; email?: string | null } } | null) => {
            setUserId(session?.user?.id ?? null);
            setUserEmail(session?.user?.email ?? null);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            applySession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            applySession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const query = useQuery({
        queryKey: ['user_roles', userId, effectiveCompanyId],
        queryFn: async () => {
            if (!userId) return null;

            let targetCompanyId = effectiveCompanyId;
            if (!targetCompanyId) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', userId)
                    .maybeSingle();
                targetCompanyId = profile?.company_id ?? null;
            }

            const { data: allRoleRows, error } = await supabase
                .from('user_roles')
                .select('role, company_id')
                .eq('user_id', userId);

            if (error) {
                console.error('Error fetching role:', error);
                return null;
            }

            const globalRoles = [...new Set((allRoleRows ?? []).map((r) => r.role))];
            const roles = targetCompanyId
                ? (allRoleRows ?? [])
                      .filter((r) => r.company_id === targetCompanyId)
                      .map((r) => r.role)
                : globalRoles;

            // Match web AuthContext: admin/super_admin flags use roles across all companies.
            const isSuperAdmin = globalRoles.includes('super_admin');
            const isAdmin = isSuperAdmin || globalRoles.includes('admin');
            const isSpecialist = roles.includes('specialist');
            const isDivisionLeader = roles.includes('division_leader');

            return {
                roles,
                globalRoles,
                isSuperAdmin,
                isAdmin,
                isStaff: globalRoles.includes('staff'),
                isHealthCenter: globalRoles.includes('health_center'),
                isSpecialist,
                isDivisionLeader,
                isLeaderRole: isDivisionLeader || isSpecialist,
            };
        },
        enabled: !!userId,
    });

    return { userId, userEmail, ...query };
};
