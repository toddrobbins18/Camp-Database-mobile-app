import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type BusLiveLocation, fetchLiveBusLocations } from '../lib/busLocationSharing';

export function useLiveBusLocations(
    companyId: string | null,
    runDate: string,
    timeOfDay: 'am' | 'pm',
    enabled = true,
) {
    const [locations, setLocations] = useState<BusLiveLocation[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!companyId || !enabled) {
            setLocations([]);
            return;
        }
        setLoading(true);
        try {
            const rows = await fetchLiveBusLocations(supabase, companyId, runDate, timeOfDay);
            setLocations(rows);
        } catch (err) {
            console.error('[LiveBusLocations]', err);
        } finally {
            setLoading(false);
        }
    }, [companyId, runDate, timeOfDay, enabled]);

    useEffect(() => {
        void refresh();
        if (!companyId || !enabled) return undefined;

        const interval = setInterval(() => void refresh(), 25_000);
        const channel = supabase
            .channel(`bus_live_${companyId}_${runDate}_${timeOfDay}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bus_route_live_locations',
                    filter: `company_id=eq.${companyId}`,
                },
                () => void refresh(),
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [companyId, runDate, timeOfDay, enabled, refresh]);

    return { locations, loading, refresh };
}
