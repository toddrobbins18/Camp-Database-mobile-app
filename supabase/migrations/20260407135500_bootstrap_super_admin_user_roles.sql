-- Ensure super-admin users actually exist in public.user_roles.
-- RLS uses has_role()/is_super_admin(), which read from user_roles (not auth metadata alone).
-- Safe to run multiple times.

-- Keep enum compatible across environments.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

DO $$
DECLARE
  _fallback_company_id uuid;
BEGIN
  SELECT id
  INTO _fallback_company_id
  FROM public.companies
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 1;

  -- Promote known platform-owner accounts to super_admin in user_roles.
  INSERT INTO public.user_roles (user_id, role, company_id)
  SELECT
    u.id,
    'super_admin'::public.app_role,
    COALESCE(p.company_id, _fallback_company_id)
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE LOWER(TRIM(u.email)) IN (
    'todd@camptlc.com',
    'todd@camptic.com'
  )
    AND COALESCE(p.company_id, _fallback_company_id) IS NOT NULL
  ON CONFLICT (user_id, role)
  DO UPDATE SET company_id = EXCLUDED.company_id;
END $$;

