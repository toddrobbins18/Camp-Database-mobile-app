import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Track only the auth user id. Session.user is a new object reference on many auth events
 * (refresh, focus); storing the full user caused unnecessary renders and effect churn.
 */
export const useRole = () => {
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user?.id ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return useQuery({
        queryKey: ['user_roles', userId],
        queryFn: async () => {
            if (!userId) return null;

            // Get user's profile to find their company_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', userId)
                .single();

            if (!profile?.company_id) return null;

            // Fetch roles for that company
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .eq('company_id', profile.company_id);

            if (error) {
                console.error("Error fetching role:", error);
                return null;
            }

            const roles = data.map(r => r.role);
            return {
                roles,
                isSuperAdmin: roles.includes('super_admin'),
                isAdmin: roles.includes('admin') || roles.includes('super_admin'),
                isStaff: roles.includes('staff'),
            };
        },
        enabled: !!userId,
    });
};
