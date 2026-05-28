import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useRole } from './useRole';

export function useSpecialistSportScope() {
    const { companyId } = useCompany();
    const { userId, data: roleData } = useRole();

    const isSpecialist = Boolean(roleData?.isSpecialist && !roleData?.isSuperAdmin);

    const { data: assignedSports = [], isLoading } = useQuery({
        queryKey: ['specialist_sport_assignments', companyId, userId],
        enabled: Boolean(isSpecialist && companyId && userId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('specialist_sport_assignments')
                .select('sport')
                .eq('user_id', userId!)
                .eq('company_id', companyId!);
            if (error) throw error;
            return (data || []).map((row) => row.sport as string);
        },
    });

    const hasSportScope = isSpecialist && assignedSports.length > 0;

    const canSeeSport = useCallback(
        (sportName: string | null | undefined): boolean => {
            if (!hasSportScope || !sportName) return !hasSportScope;
            return assignedSports.includes(sportName);
        },
        [assignedSports, hasSportScope],
    );

    const getSportFilter = useCallback((): string[] | null => {
        return hasSportScope ? assignedSports : null;
    }, [assignedSports, hasSportScope]);

    return {
        isSpecialist,
        assignedSports,
        hasSportScope,
        canSeeSport,
        getSportFilter,
        loading: isLoading,
    };
}
