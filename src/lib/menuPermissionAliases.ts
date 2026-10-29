/** Legacy `role_permissions.menu_item` IDs → current drawer / route IDs (parity with web). */
const MENU_PERMISSION_ALIASES: Record<string, string[]> = {
  swim: ['swim-bracelets', 'swim-progress'],
  'swim-bracelets': ['swim', 'swim-progress'],
  'swim-progress': ['swim', 'swim-bracelets'],
  'swim-lessons': ['swim', 'swim-bracelets', 'swim-progress'],
  nurse: ['health-center'],
  'health-center': ['nurse'],
  'tutoring-therapy': ['appointments'],
  appointments: ['tutoring-therapy'],
};

export function hasMenuPermissionWithAliases(
  perms: Record<string, boolean> | undefined,
  menuItem: string,
): boolean {
  if (!perms) return false;
  if (perms[menuItem] === true) return true;
  const aliases = MENU_PERMISSION_ALIASES[menuItem];
  if (!aliases) return false;
  return aliases.some((alias) => perms[alias] === true);
}

export function buildCompanyPermissionMap(
  rows: { company_id: string; role: string; menu_item: string; can_access: boolean | null }[],
  companyId: string,
  roles: string[],
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  const roleSet = new Set(roles.map(String));
  for (const perm of rows) {
    if (perm.company_id !== companyId || perm.can_access !== true) continue;
    if (!roleSet.has(String(perm.role))) continue;
    map[perm.menu_item] = true;
  }
  return map;
}
