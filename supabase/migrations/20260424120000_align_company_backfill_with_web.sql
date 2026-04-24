-- Align company assignment with web (tyler-hill) expectations.
--
-- Background:
--   Earlier migration 20251102122257_19202b5b-... on mobile backfilled
--   rows in profiles / user_roles / divisions / role_permissions /
--   division_permissions / user_tags / automated_email_config with
--   company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1),
--   which resolves to "Default Organization" (slug='default').
--
--   The web app's Admin panel, theme loader, and Auth flow rely on
--   profiles.company_id pointing to a real camp (Tyler Hill / Timber Lake /
--   Timber Lake West). Any row still pinned to "default" is invisible /
--   wrong-themed for web users pointed at the mobile Supabase.
--
-- This migration does a CONSERVATIVE fix:
--   1) Re-map any row whose company_id currently equals the "default"
--      organization's UUID to Tyler Hill Camp
--      (0d0b7f4f-327e-4497-83ff-3aa501ffc295) - the canonical camp when
--      running inside the tyler-hill web app.
--   2) Deactivate the "default" organization so super-admin company
--      pickers and CompanyContext.availableCompanies (which filters by
--      is_active=true) no longer list it.
--
-- Rows already pointing to Timber Lake or Timber Lake West are NOT
-- touched. Rows whose company_id IS NULL are also NOT touched here - use
-- the existing public.apply_lovable_user_sync('tyler-hill-camp', true)
-- flow for those (see 20260423103000_admin_role_parity_sync.sql).

DO $$
DECLARE
  _default_company_id uuid;
  _tyler_hill_id uuid := '0d0b7f4f-327e-4497-83ff-3aa501ffc295';
BEGIN
  SELECT id INTO _default_company_id
  FROM public.companies
  WHERE slug = 'default'
  LIMIT 1;

  -- Nothing to do if the default org was never inserted (e.g. fresh env).
  IF _default_company_id IS NULL THEN
    RAISE NOTICE 'No "default" company row found; skipping backfill.';
    RETURN;
  END IF;

  -- Make sure the target (Tyler Hill) exists before we rewrite anything.
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = _tyler_hill_id) THEN
    RAISE NOTICE 'Tyler Hill company (%) missing; run 20251104203205_insert_companies.sql first.', _tyler_hill_id;
    RETURN;
  END IF;

  -- 1. profiles: only rewrite rows still pinned to "default".
  UPDATE public.profiles
  SET company_id = _tyler_hill_id
  WHERE company_id = _default_company_id;

  -- 2. user_roles
  UPDATE public.user_roles
  SET company_id = _tyler_hill_id
  WHERE company_id = _default_company_id;

  -- 3. divisions
  UPDATE public.divisions
  SET company_id = _tyler_hill_id
  WHERE company_id = _default_company_id;

  -- 4. role_permissions (web has canonical permissions already seeded
  --    for Tyler Hill; use ON CONFLICT to avoid dupes).
  DELETE FROM public.role_permissions
  WHERE company_id = _default_company_id
    AND EXISTS (
      SELECT 1
      FROM public.role_permissions rp2
      WHERE rp2.role = public.role_permissions.role
        AND rp2.menu_item = public.role_permissions.menu_item
        AND rp2.company_id = _tyler_hill_id
    );

  UPDATE public.role_permissions
  SET company_id = _tyler_hill_id
  WHERE company_id = _default_company_id;

  -- 5. division_permissions
  UPDATE public.division_permissions
  SET company_id = _tyler_hill_id
  WHERE company_id = _default_company_id;

  -- 6. user_tags
  UPDATE public.user_tags
  SET company_id = _tyler_hill_id
  WHERE company_id = _default_company_id;

  -- 7. automated_email_config (best effort; table may or may not have the column)
  BEGIN
    EXECUTE format(
      'UPDATE public.automated_email_config SET company_id = %L WHERE company_id = %L',
      _tyler_hill_id, _default_company_id
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  -- 8. Deactivate the default org so CompanyContext.availableCompanies
  --    (which filters is_active=true) ignores it, and so it no longer
  --    shows up in super-admin pickers.
  UPDATE public.companies
  SET is_active = false
  WHERE id = _default_company_id;
END
$$;
