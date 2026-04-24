-- Admin/User parity sync helpers (web -> mobile target project)
-- Purpose:
-- 1) Keep mobile Admin Panel visibility aligned with web by syncing profile/company/role mappings.
-- 2) Provide a safe, repeatable pipeline:
--    - load source rows into public.lovable_user_sync_snapshot
--    - run public.apply_lovable_user_sync('tyler-hill-camp', true)
--
-- Notes:
-- - This migration does NOT create auth.users.
-- - Matching is by lower(email). Users must already exist in auth.users/profiles in target.

-- Performance indexes used by admin screens and sync join paths.
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles((lower(email)));
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id_company_id ON public.user_tags(user_id, company_id);

-- Staging snapshot loaded from source export.
CREATE TABLE IF NOT EXISTS public.lovable_user_sync_snapshot (
  id bigserial PRIMARY KEY,
  source_user_id uuid NULL,
  email text NOT NULL,
  full_name text NULL,
  approved boolean NULL,
  role_text text NULL,          -- expected: super_admin/admin/staff/viewer/division_leader/specialist/health_center
  company_slug text NOT NULL DEFAULT 'tyler-hill-camp',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lovable_user_sync_snapshot_company_slug
  ON public.lovable_user_sync_snapshot(company_slug);
CREATE INDEX IF NOT EXISTS idx_lovable_user_sync_snapshot_email_lower
  ON public.lovable_user_sync_snapshot((lower(email)));

-- Convert free-text role into app_role.
CREATE OR REPLACE FUNCTION public.app_role_from_text(_role text)
RETURNS public.app_role
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(_role, '')))
    WHEN 'super_admin' THEN 'super_admin'::public.app_role
    WHEN 'super admin' THEN 'super_admin'::public.app_role
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'staff' THEN 'staff'::public.app_role
    WHEN 'viewer' THEN 'viewer'::public.app_role
    WHEN 'division_leader' THEN 'division_leader'::public.app_role
    WHEN 'division leader' THEN 'division_leader'::public.app_role
    WHEN 'specialist' THEN 'specialist'::public.app_role
    WHEN 'health_center' THEN 'health_center'::public.app_role
    WHEN 'health center' THEN 'health_center'::public.app_role
    ELSE 'staff'::public.app_role
  END
$$;

-- Apply snapshot into target project data model.
-- p_replace_company_roles=true deletes existing roles for matched users in that company before inserting imported role.
CREATE OR REPLACE FUNCTION public.apply_lovable_user_sync(
  p_company_slug text DEFAULT 'tyler-hill-camp',
  p_replace_company_roles boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_updated_profiles int := 0;
  v_deleted_roles int := 0;
  v_inserted_roles int := 0;
  v_upserted_tags int := 0;
  v_missing_emails text[] := ARRAY[]::text[];
BEGIN
  -- Guard: admin/super_admin only.
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Permission denied: admin or super_admin required';
  END IF;

  SELECT id INTO v_company_id
  FROM public.companies
  WHERE slug = p_company_slug
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company slug not found: %', p_company_slug;
  END IF;

  -- Matched source rows joined to target profiles by email.
  CREATE TEMP TABLE _sync_rows ON COMMIT DROP AS
  SELECT
    p.id AS user_id,
    p.email AS target_email,
    s.email AS source_email,
    s.full_name,
    s.approved,
    public.app_role_from_text(s.role_text) AS role_value,
    coalesce(s.tags, ARRAY[]::text[]) AS tags
  FROM public.lovable_user_sync_snapshot s
  JOIN public.profiles p
    ON lower(p.email) = lower(s.email)
  WHERE s.company_slug = p_company_slug;

  -- Collect snapshot emails not found in target profiles (needs auth user migration/create-user first).
  SELECT coalesce(array_agg(s.email), ARRAY[]::text[]) INTO v_missing_emails
  FROM public.lovable_user_sync_snapshot s
  WHERE s.company_slug = p_company_slug
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE lower(p.email) = lower(s.email)
    );

  -- 1) Sync profile core fields/company assignment.
  UPDATE public.profiles p
  SET
    full_name = coalesce(r.full_name, p.full_name),
    approved = coalesce(r.approved, p.approved),
    company_id = v_company_id
  FROM _sync_rows r
  WHERE p.id = r.user_id;

  GET DIAGNOSTICS v_updated_profiles = ROW_COUNT;

  -- 2) Optionally replace company roles for matched users (keeps cross-company roles untouched).
  IF p_replace_company_roles THEN
    DELETE FROM public.user_roles ur
    USING _sync_rows r
    WHERE ur.user_id = r.user_id
      AND ur.company_id = v_company_id;
    GET DIAGNOSTICS v_deleted_roles = ROW_COUNT;
  END IF;

  -- 3) Insert role from snapshot.
  INSERT INTO public.user_roles (user_id, role, company_id)
  SELECT r.user_id, r.role_value, v_company_id
  FROM _sync_rows r
  ON CONFLICT (user_id, role) DO UPDATE
    SET company_id = EXCLUDED.company_id;

  GET DIAGNOSTICS v_inserted_roles = ROW_COUNT;

  -- 4) Sync tags (idempotent merge).
  INSERT INTO public.user_tags (user_id, tag, company_id, created_by)
  SELECT
    r.user_id,
    t.tag_value,
    v_company_id,
    auth.uid()
  FROM _sync_rows r
  CROSS JOIN LATERAL unnest(r.tags) AS t(tag_value)
  WHERE nullif(trim(t.tag_value), '') IS NOT NULL
  ON CONFLICT (user_id, tag, company_id) DO NOTHING;

  GET DIAGNOSTICS v_upserted_tags = ROW_COUNT;

  RETURN jsonb_build_object(
    'company_slug', p_company_slug,
    'company_id', v_company_id,
    'updated_profiles', v_updated_profiles,
    'deleted_company_roles', v_deleted_roles,
    'inserted_or_updated_roles', v_inserted_roles,
    'inserted_tags', v_upserted_tags,
    'missing_emails', v_missing_emails
  );
END;
$$;

COMMENT ON FUNCTION public.apply_lovable_user_sync(text, boolean) IS
'Apply snapshot rows from lovable_user_sync_snapshot into profiles/user_roles/user_tags for a company. Match by lower(email).';

