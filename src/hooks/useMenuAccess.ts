import { useCallback, useMemo } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useRolePermissions } from '../api/permissions';
import { useRole } from './useRole';
import {
  buildCompanyPermissionMap,
  hasMenuPermissionWithAliases,
} from '../lib/menuPermissionAliases';

/** Match web ProtectedRoute + AppSidebar: role_permissions per company. */
export function useMenuAccess() {
  const { companyId, isSuperAdmin: isSuperAdminCompany } = useCompany();
  const { data: roleData } = useRole();
  /** Same as web AuthContext: union permissions for every role the user holds (any camp). */
  const menuRoles = roleData?.globalRoles ?? roleData?.roles ?? [];
  const { data: rolePermissions = [], isLoading: permissionsLoading } = useRolePermissions(
    companyId,
    menuRoles,
  );
  const isSuperAdmin = isSuperAdminCompany || (roleData?.isSuperAdmin ?? false);
  const isRoleLoaded = !!roleData;

  const isLoading = !isRoleLoaded || permissionsLoading;

  const permissionMap = useMemo(() => {
    if (!companyId || menuRoles.length === 0) return {};
    return buildCompanyPermissionMap(rolePermissions, companyId, menuRoles);
  }, [companyId, rolePermissions, menuRoles]);

  const hasMenuAccess = useCallback(
    (menuItem: string) => {
      // Match web useDayCampMenuVisibility: while auth/permissions load, don't hide the drawer.
      if (isLoading) return true;
      if (isSuperAdmin) return true;
      if (!companyId) return false;
      // Web shows full menu when userRolesLength === 0 (role row missing / not synced yet).
      if (menuRoles.length === 0) return true;

      if (hasMenuPermissionWithAliases(permissionMap, menuItem)) return true;

      if (
        menuItem === 'bus-attendance' ||
        menuItem === 'bus-check-ins' ||
        menuItem === 'group-attendance' ||
        menuItem === 'group-bubble-sheets' ||
        menuItem === 'change-sheets' ||
        menuItem === 'pending-transport-changes' ||
        menuItem === 'transport-admin' ||
        menuItem === 'front-office'
      ) {
        return hasMenuPermissionWithAliases(permissionMap, 'transportation');
      }

      return false;
    },
    [isLoading, isSuperAdmin, companyId, menuRoles, permissionMap],
  );

  return useMemo(
    () => ({
      hasMenuAccess,
      isLoading,
      isRoleLoaded,
    }),
    [hasMenuAccess, isLoading, isRoleLoaded],
  );
}
