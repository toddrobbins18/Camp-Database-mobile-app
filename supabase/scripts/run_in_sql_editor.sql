-- =============================================================================
-- AUTH & APPROVALS: Match main app (Lovable). Run in Supabase SQL Editor.
-- Safe to re-run (idempotent). Requires: profiles, user_roles, companies,
-- role_permissions, app_role, get_user_company(), is_super_admin(), has_role().
-- =============================================================================

-- ##############################################################################
-- 1. PROFILES: SELECT (admins see pending users with no company)
-- ##############################################################################
DROP POLICY IF EXISTS "Users can view profiles from their company" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile admins view all" ON public.profiles;

CREATE POLICY "Users view own profile admins view all"
ON public.profiles FOR SELECT USING (
  (id = auth.uid())
  OR public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND (
      company_id = public.get_user_company(auth.uid())
      OR (approved = false AND company_id IS NULL)
    )
  )
);

-- ##############################################################################
-- 2. PROFILES: UPDATE (approve = set approved + company_id)
-- ##############################################################################
DROP POLICY IF EXISTS "Admins can approve users" ON public.profiles;
DROP POLICY IF EXISTS "Admins and super admins can approve users" ON public.profiles;

CREATE POLICY "Admins and super admins can approve users"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()));

-- ##############################################################################
-- 3. PROFILES: DELETE (reject = remove from list)
-- ##############################################################################
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and super admins can delete profiles" ON public.profiles;

CREATE POLICY "Admins and super admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()));

-- ##############################################################################
-- 4. USER_ROLES: INSERT (approve = add staff role for company)
-- ##############################################################################
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and super admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins and super admins can insert roles"
ON public.user_roles FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- ##############################################################################
-- 5. USER_ROLES: DELETE (so admin can remove roles before deleting a user)
-- ##############################################################################
DROP POLICY IF EXISTS "Admins and super admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins and super admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()));

-- ##############################################################################
-- 6. INCIDENT_REPORTS: UPDATE (so admin can nullify FK refs before deleting user)
-- ##############################################################################
DROP POLICY IF EXISTS "Admins and super admins can update incident reports" ON public.incident_reports;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='incident_reports') THEN
    EXECUTE 'CREATE POLICY "Admins and super admins can update incident reports"
      ON public.incident_reports FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), ''admin''::app_role) OR public.is_super_admin(auth.uid()))';
  END IF;
END $$;

-- ##############################################################################
-- 7. RPC: admin_delete_user() — SECURITY DEFINER so it bypasses RLS entirely.
--    The app calls supabase.rpc('admin_delete_user', { target_user_id: '...' })
-- ##############################################################################
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_roles text[];
  rows_deleted int;
BEGIN
  -- 1. Check caller is admin or super_admin
  SELECT COALESCE(array_agg(role::text), ARRAY[]::text[])
  INTO caller_roles
  FROM public.user_roles
  WHERE user_id = auth.uid();

  IF NOT ('admin' = ANY(caller_roles) OR 'super_admin' = ANY(caller_roles)) THEN
    RAISE EXCEPTION 'Permission denied: you must be admin or super_admin';
  END IF;

  -- 2. Delete user_roles for the target user
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- 3. Nullify FK references in incident_reports
  UPDATE public.incident_reports SET resolved_by = NULL WHERE resolved_by = target_user_id;
  UPDATE public.incident_reports SET created_by = NULL  WHERE created_by = target_user_id;

  -- 4. Nullify FK references in daily_notes (created_by)
  BEGIN
    UPDATE public.daily_notes SET created_by = NULL WHERE created_by = target_user_id;
  EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
  END;

  -- 5. Delete profile
  DELETE FROM public.profiles WHERE id = target_user_id;
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  IF rows_deleted = 0 THEN
    RAISE EXCEPTION 'No profile found for user %', target_user_id;
  END IF;
END;
$$;

-- ##############################################################################
-- 8. Ensure Todd is super_admin (run after Todd has signed up once)
-- ##############################################################################
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

-- ##############################################################################
-- 8. Role permissions matrix (all roles x menu items, fills missing rows)
-- ##############################################################################
WITH all_menu_items AS (
  SELECT unnest(ARRAY[
    'activities', 'admin', 'appointments', 'athletics', 'awards', 'calendar',
    'daily-schedule', 'daily-wolf-management', 'daily-wolf-printable', 'dashboard',
    'division-permissions', 'evaluation-questions', 'incidents', 'menu', 'messages',
    'notes', 'notification-preferences', 'nurse', 'od-management', 'rainy-day',
    'reports', 'role-permissions', 'roster', 'roster-templates', 'special-events',
    'special-meals', 'specialist-sport-assignments', 'sports-academy', 'sports-calendar',
    'staff', 'transportation', 'tutoring-therapy', 'user-approvals'
  ]) AS menu_item
),
all_roles AS (
  SELECT unnest(ARRAY[
    'admin', 'staff', 'viewer', 'division_leader', 'specialist', 'super_admin', 'health_center'
  ]::app_role[]) AS role
),
all_companies AS (
  SELECT id AS company_id FROM public.companies WHERE is_active = true
),
full_matrix AS (
  SELECT
    c.company_id,
    r.role,
    m.menu_item,
    CASE
      WHEN m.menu_item IN ('admin', 'role-permissions', 'division-permissions',
                           'evaluation-questions', 'user-approvals', 'specialist-sport-assignments')
           AND r.role IN ('admin'::app_role, 'super_admin'::app_role) THEN true
      WHEN m.menu_item IN ('dashboard', 'roster', 'staff', 'calendar', 'menu', 'messages',
                           'activities', 'athletics', 'sports-calendar', 'transportation',
                           'notes', 'awards', 'incidents', 'nurse', 'sports-academy',
                           'rainy-day', 'special-events', 'tutoring-therapy', 'roster-templates',
                           'od-management', 'appointments', 'daily-schedule', 'reports',
                           'daily-wolf-printable', 'daily-wolf-management', 'special-meals',
                           'notification-preferences')
           AND r.role IN ('admin'::app_role, 'super_admin'::app_role, 'staff'::app_role) THEN true
      WHEN m.menu_item IN ('nurse', 'appointments', 'od-management')
           AND r.role = 'health_center'::app_role THEN true
      WHEN m.menu_item IN ('dashboard', 'roster', 'calendar', 'menu', 'athletics',
                           'sports-calendar', 'activities', 'special-events', 'awards',
                           'notification-preferences')
           AND r.role IN ('division_leader'::app_role, 'specialist'::app_role, 'viewer'::app_role) THEN true
      ELSE false
    END AS can_access
  FROM all_companies c
  CROSS JOIN all_roles r
  CROSS JOIN all_menu_items m
)
INSERT INTO public.role_permissions (company_id, role, menu_item, can_access)
SELECT fm.company_id, fm.role, fm.menu_item, fm.can_access
FROM full_matrix fm
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.company_id = fm.company_id
    AND rp.role = fm.role
    AND rp.menu_item = fm.menu_item
)
ON CONFLICT (company_id, role, menu_item) DO NOTHING;
