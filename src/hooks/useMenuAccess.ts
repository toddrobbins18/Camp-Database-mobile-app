import { useCallback, useMemo } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useRolePermissions } from '../api/permissions';
import { useRole } from './useRole';

/** Match web ProtectedRoute + AppSidebar: role_permissions per company. */
export function useMenuAccess() {
    const { companyId, isSuperAdmin: isSuperAdminCompany } = useCompany();
    const { data: roleData } = useRole();
    const { data: rolePermissions = [], isLoading: permissionsLoading } = useRolePermissions(companyId);

    const menuRoles = roleData?.globalRoles ?? roleData?.roles ?? [];
    const isSuperAdmin = isSuperAdminCompany || (roleData?.isSuperAdmin ?? false);
    const isRoleLoaded = !!roleData;

    const isLoading = !isRoleLoaded || permissionsLoading;

    const hasMenuAccess = useCallback(
        (menuItem: string) => {
            if (!isRoleLoaded) return true;
            if (isSuperAdmin) return true;
            if (!companyId) return false;
            if (menuRoles.length === 0) return false;

            return rolePermissions.some(
                (perm) =>
                    perm.company_id === companyId &&
                    perm.can_access === true &&
                    menuRoles.includes(String(perm.role)) &&
                    perm.menu_item === menuItem,
            );
        },
        [isRoleLoaded, isSuperAdmin, companyId, menuRoles, rolePermissions],
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
