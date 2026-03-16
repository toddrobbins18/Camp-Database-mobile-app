-- =============================================================================
-- ONE-TIME: Remove ALL users from User Approvals (pending = not yet approved).
-- Run once in Supabase SQL Editor. New signups will appear in User Approvals
-- and can then be accepted or rejected.
-- =============================================================================

-- 1. Remove roles for pending users
DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM public.profiles WHERE approved IS NOT TRUE);

-- 2. Nullify FK references in incident_reports (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='incident_reports') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incident_reports' AND column_name='resolved_by') THEN
      UPDATE public.incident_reports SET resolved_by = NULL
      WHERE resolved_by IN (SELECT id FROM public.profiles WHERE approved IS NOT TRUE);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incident_reports' AND column_name='created_by') THEN
      UPDATE public.incident_reports SET created_by = NULL
      WHERE created_by IN (SELECT id FROM public.profiles WHERE approved IS NOT TRUE);
    END IF;
  END IF;
END $$;

-- 2b. Nullify daily_notes.created_by if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_notes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_notes' AND column_name='created_by') THEN
      UPDATE public.daily_notes SET created_by = NULL
      WHERE created_by IN (SELECT id FROM public.profiles WHERE approved IS NOT TRUE);
    END IF;
  END IF;
END $$;

-- 3. Delete all pending profiles (they disappear from User Approvals)
DELETE FROM public.profiles
WHERE approved IS NOT TRUE;

-- Done. User Approvals screen will be empty. New users will show up when they sign up.
