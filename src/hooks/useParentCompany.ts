import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { PARENT_PORTAL_COMPANY_SLUG_KEY } from '../constants/parentPortalConstants';

type ParentCompanyRow = {
  id: string;
  name: string;
  theme_color: string | null;
  slug: string;
};

function companyFromContext(
  slug: string,
  availableCompanies: { id: string; name: string; slug: string; theme_color?: string | null }[],
  current: { id: string; name: string; slug: string; theme_color?: string | null } | null,
): ParentCompanyRow | null {
  const match =
    availableCompanies.find((c) => c.slug === slug) ??
    (current?.slug === slug ? current : null);
  if (!match) return null;
  return {
    id: match.id,
    name: match.name,
    theme_color: match.theme_color ?? null,
    slug: match.slug,
  };
}

export function useParentCompany() {
  const {
    companySlug: contextSlug,
    companyId: contextCompanyId,
    companyThemeColor,
    availableCompanies,
    isLoading: campContextLoading,
  } = useCompany();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Your Camp');
  const [themeColor, setThemeColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applyCompany = (row: ParentCompanyRow) => {
      setCompanyId(row.id);
      setCompanySlug(row.slug);
      setCompanyName(row.name?.trim() || 'Your Camp');
      setThemeColor(row.theme_color ?? null);
    };

    const resolve = async () => {
      setLoading(true);

      const stored = await AsyncStorage.getItem(PARENT_PORTAL_COMPANY_SLUG_KEY);
      const slug = contextSlug ?? stored;

      if (slug) await AsyncStorage.setItem(PARENT_PORTAL_COMPANY_SLUG_KEY, slug);

      if (!slug) {
        if (!cancelled) {
          setCompanyId(null);
          setCompanySlug(null);
          setCompanyName('Your Camp');
          setThemeColor(null);
          setLoading(false);
        }
        return;
      }

      setCompanySlug(slug);

      const { data: rpcRows, error: rpcError } = await supabase.rpc('get_parent_portal_company', {
        _slug: slug,
      });

      if (!cancelled && !rpcError && rpcRows?.length) {
        applyCompany(rpcRows[0] as ParentCompanyRow);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('companies')
        .select('id, name, theme_color, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (!cancelled && data) {
        applyCompany(data as ParentCompanyRow);
        setLoading(false);
        return;
      }

      if (!campContextLoading) {
        const currentCompany =
          availableCompanies.find((c) => c.id === contextCompanyId) ??
          availableCompanies.find((c) => c.slug === slug) ??
          null;
        const fromContext = companyFromContext(slug, availableCompanies, currentCompany);

        if (!cancelled && fromContext) {
          applyCompany(fromContext);
          setLoading(false);
          return;
        }
      }

      if (!cancelled) {
        if (campContextLoading) return;
        setCompanyId(null);
        setCompanyName('Your Camp');
        setThemeColor(null);
        setLoading(false);
      }
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [
    contextSlug,
    contextCompanyId,
    companyThemeColor,
    campContextLoading,
    availableCompanies,
  ]);

  return { companyId, companySlug, companyName, themeColor, loading };
}
