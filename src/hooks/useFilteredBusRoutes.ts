import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useMenuAccess } from './useMenuAccess';
import { useRole } from './useRole';
import {
  canViewAllTransportBuses,
  filterRoutesForAssignedBus,
  loadUserAssignedTransportBus,
} from '../lib/transportBusCounselor';
import {
  loadBusRunEnrollmentContext,
  type BusRunEnrollmentContext,
} from '../lib/transportBusRunContext';
import { buildRunRoutes, loadTransportRunBoard, type TransportRunBoard } from '../lib/transportRunBoard';

export function useFilteredBusRoutes(runDate: string, timeOfDay: 'am' | 'pm') {
  const { companyId, season, isSuperAdmin: isSuperAdminCompany } = useCompany();
  const { userId, data: roleData } = useRole();
  const { hasMenuAccess } = useMenuAccess();

  const [board, setBoard] = useState<TransportRunBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [enrollmentCtx, setEnrollmentCtx] = useState<BusRunEnrollmentContext | null>(null);
  const [assignedBus, setAssignedBus] = useState<string | null>(null);

  const isSuperAdmin = isSuperAdminCompany || (roleData?.isSuperAdmin ?? false);
  const isAdmin = roleData?.globalRoles?.includes('admin') ?? false;

  const canViewAll = useMemo(
    () =>
      canViewAllTransportBuses({
        isSuperAdmin,
        isAdmin,
        hasTransportAdmin: hasMenuAccess('transport-admin'),
        hasTransportation: hasMenuAccess('transportation'),
      }),
    [isSuperAdmin, isAdmin, hasMenuAccess],
  );

  useEffect(() => {
    if (!companyId || !userId) {
      setAssignedBus(null);
      return;
    }
    let cancelled = false;
    void loadUserAssignedTransportBus(supabase, userId).then((bus) => {
      if (!cancelled) setAssignedBus(bus);
    });
    return () => { cancelled = true; };
  }, [companyId, userId]);

  useEffect(() => {
    if (!companyId || !season) return;
    let cancelled = false;
    setBoardLoading(true);
    void (async () => {
      try {
        const [loadedBoard, ctx] = await Promise.all([
          loadTransportRunBoard(supabase, companyId, season, runDate),
          loadBusRunEnrollmentContext(supabase, companyId, season, runDate),
        ]);
        if (!cancelled) {
          setBoard(loadedBoard);
          setEnrollmentCtx(ctx);
        }
      } catch (err) {
        console.error('[Transport] Load bus run context error:', err);
      } finally {
        if (!cancelled) setBoardLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, season, runDate]);

  const allRoutes = useMemo(
    () => (board ? buildRunRoutes(board, timeOfDay) : []),
    [board, timeOfDay],
  );

  const routes = useMemo(
    () => filterRoutesForAssignedBus(allRoutes, assignedBus, canViewAll),
    [allRoutes, assignedBus, canViewAll],
  );

  return {
    companyId,
    season,
    board,
    boardLoading,
    routes,
    enrollmentCtx,
    assignedBus,
    canViewAll,
    busScopeLabel: !canViewAll && assignedBus ? assignedBus : null,
  };
}
