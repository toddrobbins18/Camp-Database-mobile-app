-- Fix "missing" admins / division leaders in Tyler Hill admin panel.
--
-- Web UserRoleManagement and mobile useAdminUsers both load:
--   SELECT * FROM profiles WHERE company_id = <current camp id>
-- They never join user_roles to discover staff who belong to the camp
-- only via roles. So anyone with user_roles.company_id = Tyler Hill but
-- profiles.company_id NULL or a different UUID never appears in the list.
--
-- Migration 20260424120000 only rewrote rows pinned to slug 'default'.
-- Real data often has NULL profile.company_id (never fully approved) or
-- a wrong camp after imports — while user_roles already says Tyler Hill.
--
-- This migration sets profiles.company_id to Tyler Hill for every user
-- who has at least one user_roles row for Tyler Hill Camp. Idempotent.
--
-- Note: A user with roles at multiple camps has a single profiles.company_id.
-- After this run they will list under Tyler Hill admin; if they must
-- "home" to another camp, set profiles.company_id manually afterward.

DO $$
DECLARE
  _tyler_hill_id uuid := '0d0b7f4f-327e-4497-83ff-3aa501ffc295';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = _tyler_hill_id) THEN
    RAISE NOTICE 'Tyler Hill company (%) missing; skipping profile sync.', _tyler_hill_id;
    RETURN;
  END IF;

  UPDATE public.profiles p
  SET company_id = _tyler_hill_id
  WHERE EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.company_id = _tyler_hill_id
  )
  AND p.company_id IS DISTINCT FROM _tyler_hill_id;
END
$$;
