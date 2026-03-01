import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
export const useRole = () => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return useQuery({
        queryKey: ['user_roles', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Get user's profile to find their company_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (!profile?.company_id) return null;

            // Fetch roles for that company
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
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
        enabled: !!user,
    });
};
