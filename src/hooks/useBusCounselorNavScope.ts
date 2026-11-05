import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useMenuAccess } from './useMenuAccess';
import { useRole } from './useRole';
import {
  canViewAllTransportBuses,
  isPaperlessMenuAllowed,
  isPaperlessNavLocked,
  loadUserBusCounselorProfile,
  type BusCounselorProfile,
} from '../lib/transportBusCounselor';

const EMPTY_PROFILE: BusCounselorProfile = {
  busAttendanceOnly: false,
  assignedTransportBus: null,
  groupAttendanceOnly: false,
  assignedGroups: [],
};

export function useBusCounselorNavScope() {
  const { companyId, isSuperAdmin: isSuperAdminCompany } = useCompany();
  const { userId, data: roleData } = useRole();
  const { hasMenuAccess } = useMenuAccess();

  const [profile, setProfile] = useState<BusCounselorProfile>(EMPTY_PROFILE);
  const [assignedLoading, setAssignedLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !userId) {
      setProfile(EMPTY_PROFILE);
      setAssignedLoading(false);
      return;
    }
    let cancelled = false;
    setAssignedLoading(true);
    void loadUserBusCounselorProfile(supabase, userId).then((loaded) => {
      if (!cancelled) {
        setProfile(loaded);
        setAssignedLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, userId]);

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

  const busAttendanceOnly = profile.busAttendanceOnly;
  const groupAttendanceOnly = profile.groupAttendanceOnly;
  const assignedBus = profile.assignedTransportBus;
  const assignedGroups = profile.assignedGroups;

  const isNavLocked = useMemo(
    () => isPaperlessNavLocked({ canViewAll, busAttendanceOnly, groupAttendanceOnly }),
    [canViewAll, busAttendanceOnly, groupAttendanceOnly],
  );

  const allowMenuItem = useCallback(
    (menuId: string) => {
      if (!isNavLocked) return true;
      return isPaperlessMenuAllowed(menuId, { busAttendanceOnly, groupAttendanceOnly });
    },
    [isNavLocked, busAttendanceOnly, groupAttendanceOnly],
  );

  return {
    assignedBus,
    assignedLoading,
    canViewAll,
    hasTransportCoordinatorAccess,
    isNavLocked,
    allowMenuItem,
    busAttendanceOnly,
    groupAttendanceOnly,
    assignedGroups,
    busScopeLabel: isNavLocked && assignedBus ? assignedBus : null,
  };
}
