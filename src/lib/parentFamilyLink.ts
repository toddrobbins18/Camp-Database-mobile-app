import type { SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CAMP_SLUG } from '../constants/camps';
import { PARENT_PORTAL_COMPANY_SLUG_KEY } from '../constants/parentPortalConstants';

/** Match roster campers to a parent family by guardian email (+ siblings). */
export async function linkFamilyChildrenByGuardianEmail(
  supabase: SupabaseClient,
  familyId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('link_family_children_by_guardian_email', {
    _family_id: familyId,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

async function rememberSlug(slug: string): Promise<void> {
  await AsyncStorage.setItem(PARENT_PORTAL_COMPANY_SLUG_KEY, slug);
}

/** Camp already tied to this signed-in email. No camp picker. */
export async function rememberParentCampForSignedInUser(
  supabase: SupabaseClient,
): Promise<{ slug: string; companyId: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: families } = await supabase
    .from('families')
    .select('company_id')
    .eq('user_id', user.id)
    .limit(1);

  const familyCompanyId = families?.[0]?.company_id as string | undefined;
  if (familyCompanyId) {
    for (const slug of Object.values(CAMP_SLUG)) {
      const { data } = await supabase.rpc('get_parent_portal_company', { _slug: slug });
      const row = Array.isArray(data) ? data[0] : null;
      if (row?.id === familyCompanyId) {
        await rememberSlug(slug);
        return { slug, companyId: familyCompanyId };
      }
    }
  }

  const { data: matched, error } = await supabase.rpc('parent_camp_for_my_email');
  if (error) return null;
  const row = Array.isArray(matched) ? matched[0] : null;
  if (!row?.slug || !row?.company_id) return null;
  await rememberSlug(row.slug);
  return { slug: row.slug, companyId: row.company_id };
}
