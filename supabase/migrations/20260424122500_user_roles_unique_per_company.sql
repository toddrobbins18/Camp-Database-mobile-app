-- Align user_roles uniqueness with what the web app assumes.
--
-- Web's UserApprovals.tsx does:
--   upsert({ onConflict: 'user_id,company_id' }, ...)
-- Web's RolePermissions / DivisionPermissions flows treat a user as
-- having at most one role per company (one row in user_roles per
-- (user_id, company_id)).
--
-- The original table constraint is UNIQUE(user_id, role), which:
--   - blocks the same role across multiple companies (breaks super-admin
--     invited into two camps, etc.)
--   - does not satisfy web's onConflict target, so upsert errors with
--     42P10 "there is no unique or exclusion constraint matching the
--     ON CONFLICT specification".
--
-- Fix:
--   1. De-dupe any rows that would violate UNIQUE(user_id, company_id).
--      Kept row is the most-privileged role per (user_id, company_id):
--      super_admin > admin > division_leader > specialist > staff >
--      health_center > viewer.
--   2. Drop the old UNIQUE(user_id, role).
--   3. Add UNIQUE(user_id, company_id) (primary conflict target web
--      relies on).
--   4. Add UNIQUE(user_id, role, company_id) as an explicit safety net
--      (redundant with #3 but makes multi-company role queries obvious).
--   5. Update apply_lovable_user_sync() so its ON CONFLICT target moves
--      from (user_id, role) to (user_id, company_id) to keep the role
--      parity sync pipeline working after #2.

-- 1. De-dupe: keep one row per (user_id, company_id), preferring highest role.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, company_id
      ORDER BY
        CASE role::text
          WHEN 'super_admin'     THEN 1
          WHEN 'admin'           THEN 2
          WHEN 'division_leader' THEN 3
          WHEN 'specialist'      THEN 4
          WHEN 'staff'           THEN 5
          WHEN 'health_center'   THEN 6
          WHEN 'viewer'          THEN 7
          ELSE 99
        END,
        created_at NULLS LAST,
        id
    ) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked r
WHERE ur.id = r.id
  AND r.rn > 1;

-- 2. Drop the legacy UNIQUE(user_id, role) constraint if present.
DO $$
DECLARE
  _constraint_name text;
BEGIN
  SELECT conname INTO _constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.user_roles'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE 'UNIQUE (user_id, role)';

  IF _constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', _constraint_name);
  END IF;
END
$$;

-- 3. Add UNIQUE(user_id, company_id) matching web's upsert onConflict target.
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_company_id_key;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_company_id_key UNIQUE (user_id, company_id);

-- 4. Add UNIQUE(user_id, role, company_id) as an explicit safety net.
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_company_id_key;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_role_company_id_key UNIQUE (user_id, role, company_id);

-- 5. Refresh apply_lovable_user_sync() to use the new conflict target.
--    Definition is otherwise identical to 20260423103000_admin_role_parity_sync.sql.
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

  SELECT coalesce(array_agg(s.email), ARRAY[]::text[]) INTO v_missing_emails
  FROM public.lovable_user_sync_snapshot s
  WHERE s.company_slug = p_company_slug
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE lower(p.email) = lower(s.email)
    );

  UPDATE public.profiles p
  SET
    full_name = coalesce(r.full_name, p.full_name),
    approved = coalesce(r.approved, p.approved),
    company_id = v_company_id
  FROM _sync_rows r
  WHERE p.id = r.user_id;

  GET DIAGNOSTICS v_updated_profiles = ROW_COUNT;

  IF p_replace_company_roles THEN
    DELETE FROM public.user_roles ur
    USING _sync_rows r
    WHERE ur.user_id = r.user_id
      AND ur.company_id = v_company_id;
    GET DIAGNOSTICS v_deleted_roles = ROW_COUNT;
  END IF;

  -- NEW conflict target: (user_id, company_id) instead of (user_id, role).
  INSERT INTO public.user_roles (user_id, role, company_id)
  SELECT r.user_id, r.role_value, v_company_id
  FROM _sync_rows r
  ON CONFLICT (user_id, company_id) DO UPDATE
    SET role = EXCLUDED.role;

  GET DIAGNOSTICS v_inserted_roles = ROW_COUNT;

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
