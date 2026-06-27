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

            if (!targetCompanyId) return null;

            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .eq('company_id', targetCompanyId);

            if (error) {
                console.error('Error fetching role:', error);
                return null;
            }

            const roles = (data ?? []).map((r) => r.role);
            const isSpecialist = roles.includes('specialist');
            const isDivisionLeader = roles.includes('division_leader');
            return {
                roles,
                isSuperAdmin: roles.includes('super_admin'),
                isAdmin: roles.includes('admin') || roles.includes('super_admin'),
                isStaff: roles.includes('staff'),
                isHealthCenter: roles.includes('health_center'),
                isSpecialist,
                isDivisionLeader,
                isLeaderRole: isDivisionLeader || isSpecialist,
            };
        },
        enabled: !!userId,
    });

    return { userId, userEmail, ...query };
};
