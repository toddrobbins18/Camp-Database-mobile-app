-- =============================================================================
-- Ensure Tyler Hill + TLC staff roles (from web admin screenshots).
-- EXCLUDES raeessajidali10@gmail.com (super admin — manage separately).
--
-- Run in Supabase SQL Editor (postgres). Requires existing auth.users rows.
-- Idempotent for these emails: sets profile company, clears user_roles for user,
-- inserts one role row (matches web UserRoleManagement single-role pattern).
-- =============================================================================

DO $$
DECLARE
  th uuid;
  tlc uuid;
  rec record;
  uid uuid;
BEGIN
  SELECT id INTO th FROM public.companies WHERE slug = 'tyler-hill-camp' LIMIT 1;
  SELECT id INTO tlc FROM public.companies WHERE slug = 'timber-lake-camp' LIMIT 1;

  IF th IS NULL THEN
    RAISE EXCEPTION 'Company tyler-hill-camp not found';
  END IF;
  IF tlc IS NULL THEN
    RAISE EXCEPTION 'Company timber-lake-camp not found';
  END IF;

  -- Excludes raeessajidali10@gmail.com (super admin — configure separately).
  FOR rec IN
    SELECT * FROM (VALUES
      -- Tyler Hill — Health Center
      ('health@tylerhillcamp.com'::text, 'health_center'::public.app_role, th),
      -- Tyler Hill — Division Leaders
      ('kansasgallagher13@gmail.com', 'division_leader'::public.app_role, th),
      ('lydiaellenbird99@gmail.com', 'division_leader'::public.app_role, th),
      ('owenschnoor4@gmail.com', 'division_leader'::public.app_role, th),
      ('jkobak04@gmail.com', 'division_leader'::public.app_role, th),
      ('finnturner2003@gmail.com', 'division_leader'::public.app_role, th),
      ('kennethblack20@gmail.com', 'division_leader'::public.app_role, th),
      ('summer.oz@outlook.com', 'division_leader'::public.app_role, th),
      -- Tyler Hill — Admins (screenshot 1)
      ('nick@tylerhillcamp.com', 'admin'::public.app_role, th),
      ('gabriella.chaya@hotmail.ca', 'admin'::public.app_role, th),
      -- Timber Lake Camp — Admin (screenshot 1)
      ('mike@camptlc.com', 'admin'::public.app_role, tlc)
    ) AS t(email, app_role, company_id)
  LOOP
    uid := NULL;
    SELECT a.id INTO uid FROM auth.users a WHERE lower(trim(a.email)) = lower(trim(rec.email));
    IF uid IS NULL THEN
      RAISE NOTICE 'Skip — no auth.users row for %', rec.email;
      CONTINUE;
    END IF;

    UPDATE public.profiles
    SET company_id = rec.company_id
    WHERE id = uid;

    DELETE FROM public.user_roles WHERE user_id = uid;

    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (uid, rec.app_role, rec.company_id);

    RAISE NOTICE 'OK % → % @ company %', rec.email, rec.app_role, rec.company_id;
  END LOOP;
END $$;
