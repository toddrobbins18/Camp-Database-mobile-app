import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useMenuAccess } from './useMenuAccess';
import { useRole } from './useRole';
import {
  canViewAllTransportBuses,
  filterRoutesForAssignedBus,
  loadUserBusCounselorProfile,
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
  const [busAttendanceOnly, setBusAttendanceOnly] = useState(false);

  const isSuperAdmin = isSuperAdminCompany || (roleData?.isSuperAdmin ?? false);
  const isAdmin = roleData?.globalRoles?.includes('admin') ?? false;

  const canViewAll = useMemo(
    () =>
      canViewAllTransportBuses({
        isSuperAdmin,
        isAdmin,
        hasTransportAdmin: hasMenuAccess('transport-admin'),
      }),
    [isSuperAdmin, isAdmin, hasMenuAccess],
  );

  const hasTransportCoordinatorAccess = useMemo(
    () => hasMenuAccess('transportation'),
    [hasMenuAccess],
  );

  useEffect(() => {
    if (!companyId || !userId) {
      setAssignedBus(null);
      setBusAttendanceOnly(false);
      return;
    }
    let cancelled = false;
    void loadUserBusCounselorProfile(supabase, userId).then((profile) => {
      if (!cancelled) {
        setAssignedBus(profile.assignedTransportBus);
        setBusAttendanceOnly(profile.busAttendanceOnly);
      }
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
    () =>
      filterRoutesForAssignedBus(allRoutes, {
        assignedBus,
        canViewAll,
        hasTransportCoordinatorAccess,
        busAttendanceOnly,
      }),
    [allRoutes, assignedBus, canViewAll, hasTransportCoordinatorAccess, busAttendanceOnly],
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
    hasTransportCoordinatorAccess,
    busScopeLabel: !canViewAll && assignedBus ? assignedBus : null,
  };
}
