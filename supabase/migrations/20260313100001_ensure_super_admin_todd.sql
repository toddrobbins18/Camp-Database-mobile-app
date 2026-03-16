-- Ensure Todd (todd@camptlc.com or Todd@camptic.com) is super_admin with a company.
-- Run after users have signed up. Safe to run multiple times (idempotent).

DO $$
DECLARE
  _user_id uuid;
  _company_id uuid;
BEGIN
  SELECT id INTO _company_id FROM public.companies WHERE is_active = true ORDER BY created_at LIMIT 1;
  IF _company_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO _user_id FROM auth.users
  WHERE LOWER(TRIM(email)) IN ('todd@camptlc.com', 'todd@camptic.com')
  LIMIT 1;

  IF _user_id IS NOT NULL THEN
    UPDATE public.profiles SET company_id = _company_id WHERE id = _user_id;

    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (_user_id, 'super_admin', _company_id)
    ON CONFLICT (user_id, role) DO UPDATE SET company_id = EXCLUDED.company_id;
  END IF;
END $$;
