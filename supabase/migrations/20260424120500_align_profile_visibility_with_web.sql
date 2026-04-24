-- Port of web migration 20260128195649_e75ef9cd-... (tyler-hill).
-- Allow company admins to SELECT pending user profiles that don't yet
-- have a company_id (approval queue). Without this, web's UserApprovals
-- page shows nothing when pending users were created via email signup
-- (profile.company_id = NULL) and the admin is not a super_admin.
--
-- The mobile project already has a "Users view own profile admins view all"
-- policy (see 20251207123405_...). We DROP it and recreate it with the
-- extra OR clause matching web verbatim.

DROP POLICY IF EXISTS "Users view own profile admins view all" ON public.profiles;

CREATE POLICY "Users view own profile admins view all"
ON public.profiles
FOR SELECT
USING (
  (id = auth.uid())
  OR public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND (
      company_id = public.get_user_company(auth.uid())
      OR (approved = false AND company_id IS NULL)
    )
  )
);
