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

            const hasPerm = rolePermissions.some(
                (perm) =>
                    perm.company_id === companyId &&
                    perm.can_access === true &&
                    menuRoles.includes(String(perm.role)) &&
                    perm.menu_item === menuItem,
            );
            if (hasPerm) return true;
            // Match web ProtectedRoute: Portal Dashboard uses parent-portal permission.
            if (menuItem === 'parent-portal-dashboard') {
                return rolePermissions.some(
                    (perm) =>
                        perm.company_id === companyId &&
                        perm.can_access === true &&
                        menuRoles.includes(String(perm.role)) &&
                        perm.menu_item === 'parent-portal',
                );
            }
            // Match web: Bus Attendance allowed when Transportation is enabled for the role.
            if (
                menuItem === 'bus-attendance' ||
                menuItem === 'change-sheets' ||
                menuItem === 'pending-transport-changes'
            ) {
                return rolePermissions.some(
                    (perm) =>
                        perm.company_id === companyId &&
                        perm.can_access === true &&
                        menuRoles.includes(String(perm.role)) &&
                        perm.menu_item === 'transportation',
                );
            }
            return false;
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
