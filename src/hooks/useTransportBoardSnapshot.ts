import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { loadBoardCache } from '../lib/transportBoardCache';
import { ROUTE_COLORS } from '../lib/transportBoardUtils';
import {
  normalizeTransportBoardForSeason,
  type TransportBoardPayload,
  type TransportRouteMeta,
  type TransportRouteStop,
} from '../lib/transportRoster';

export function useTransportBoardSnapshot() {
  const { companyId, season } = useCompany();
  const [routeMeta, setRouteMeta] = useState<TransportRouteMeta[]>([]);
  const [coreStops, setCoreStops] = useState<Record<number, TransportRouteStop[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId || !season) {
      setRouteMeta([]);
      setCoreStops({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('transport_boards')
        .select('data')
        .eq('company_id', companyId)
        .eq('season', season)
        .maybeSingle();

      let payload: TransportBoardPayload | null = null;
      if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        payload = data.data as TransportBoardPayload;
      } else {
        payload = (await loadBoardCache(companyId, season)) ?? null;
      }

      if (!payload) {
        setRouteMeta([]);
        setCoreStops({});
        return;
      }

      const normalized = await normalizeTransportBoardForSeason(
        supabase,
        companyId,
        season,
        payload,
      );
      const meta = (normalized.routeMeta ?? []).map((r, i) => ({
        ...r,
        id: Number(r.id),
        color: r.color || ROUTE_COLORS[i % ROUTE_COLORS.length],
      }));
      const stops: Record<number, TransportRouteStop[]> = {};
      for (const [k, v] of Object.entries(normalized.coreStops ?? {})) {
        stops[Number(k)] = v as TransportRouteStop[];
      }
      setRouteMeta(meta);
      setCoreStops(stops);
    } finally {
      setLoading(false);
    }
  }, [companyId, season]);

  useEffect(() => {
    void load();
  }, [load]);

  return { routeMeta, coreStops, loading, reload: load, companyId, season };
}
