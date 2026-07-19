import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
    fetchChildScheduleOutlook,
    fetchStaffScheduleOutlook,
    type PersonOutlookItem,
} from '../lib/personScheduleOutlook';

export function usePersonScheduleOutlook(params: {
    personType: 'child' | 'staff';
    personId: string | null | undefined;
    companyId: string | null | undefined;
    season?: string | null;
    divisionId?: string | null;
    staffName?: string | null;
    enabled?: boolean;
}) {
    const {
        personType,
        personId,
        companyId,
        season,
        divisionId,
        staffName,
        enabled = true,
    } = params;

    return useQuery<PersonOutlookItem[]>({
        queryKey: [
            'person_schedule_outlook',
            personType,
            personId,
            companyId,
            season,
            divisionId,
            staffName,
        ],
        queryFn: async () => {
            if (!personId || !companyId) return [];
            if (personType === 'child') {
                return fetchChildScheduleOutlook(supabase, {
                    childId: personId,
                    divisionId,
                    companyId,
                    season,
                });
            }
            return fetchStaffScheduleOutlook(supabase, {
                staffId: personId,
                staffName: staffName || '',
                companyId,
                season,
            });
        },
        enabled:
            !!enabled &&
            !!personId &&
            !!companyId &&
            (personType === 'child' || !!staffName),
    });
}
