import { useMemo } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { resolveParentPortalThemeColor } from '../lib/parentPortalTheme';

/** Camp brand accent for buttons, tabs, and icons — matches web company theme_color. */
export function useCampBrandTheme() {
  const { companySlug, companyThemeColor } = useCompany();

  return useMemo(() => {
    const brand = resolveParentPortalThemeColor(companyThemeColor, companySlug);
    return {
      brand,
      brandMuted: `${brand}22`,
      brandSoft: `${brand}14`,
    };
  }, [companySlug, companyThemeColor]);
}
