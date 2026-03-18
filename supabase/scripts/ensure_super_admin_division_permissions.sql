-- =============================================================================
-- FIX: Ensure Todd (Super Admin) has can_access = true for ALL active divisions
-- Run in Supabase Dashboard → SQL Editor. Safe to run multiple times.
-- =============================================================================

INSERT INTO public.division_permissions (user_id, division_id, company_id, can_access)
SELECT
  t.id,
  d.id,
  d.company_id,
  true
FROM auth.users t
CROSS JOIN public.divisions d
WHERE LOWER(TRIM(t.email)) IN ('todd@camptlc.com', 'todd@camptic.com')
  AND d.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.division_permissions dp
    WHERE dp.user_id = t.id AND dp.division_id = d.id
  )
ON CONFLICT (user_id, division_id)
DO UPDATE SET can_access = true, company_id = EXCLUDED.company_id;

-- Optional: set can_access = true for any existing rows that were false
UPDATE public.division_permissions dp
SET can_access = true, company_id = d.company_id
FROM auth.users t
JOIN public.divisions d ON d.id = dp.division_id AND d.is_active = true
WHERE dp.user_id = t.id
  AND LOWER(TRIM(t.email)) IN ('todd@camptlc.com', 'todd@camptic.com')
  AND (dp.can_access = false OR dp.company_id IS DISTINCT FROM d.company_id);
