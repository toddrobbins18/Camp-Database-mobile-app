import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useMenuAccess } from './useMenuAccess';
import { useRole } from './useRole';
import {
  canViewAllTransportBuses,
  isBusCounselorMenuAllowed,
  isBusCounselorNavLocked,
  loadUserAssignedTransportBus,
} from '../lib/transportBusCounselor';

export function useBusCounselorNavScope() {
  const { companyId, isSuperAdmin: isSuperAdminCompany } = useCompany();
  const { userId, data: roleData } = useRole();
  const { hasMenuAccess } = useMenuAccess();

  const [assignedBus, setAssignedBus] = useState<string | null>(null);
  const [assignedLoading, setAssignedLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !userId) {
      setAssignedBus(null);
      setAssignedLoading(false);
      return;
    }
    let cancelled = false;
    setAssignedLoading(true);
    void loadUserAssignedTransportBus(supabase, userId).then((bus) => {
      if (!cancelled) {
        setAssignedBus(bus);
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

  const isNavLocked = useMemo(
    () => isBusCounselorNavLocked({ canViewAll, assignedBus }),
    [canViewAll, assignedBus],
  );

  const allowMenuItem = useCallback(
    (menuId: string) => {
      if (!isNavLocked) return true;
      return isBusCounselorMenuAllowed(menuId);
    },
    [isNavLocked],
  );

  return {
    assignedBus,
    assignedLoading,
    canViewAll,
    hasTransportCoordinatorAccess,
    isNavLocked,
    allowMenuItem,
    busScopeLabel: isNavLocked && assignedBus ? assignedBus : null,
  };
}
