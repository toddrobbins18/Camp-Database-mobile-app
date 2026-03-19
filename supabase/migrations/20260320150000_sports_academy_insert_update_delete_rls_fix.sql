-- Fix 403 on sports_academy writes from mobile.
-- Align with robust company-member policy pattern.

-- SELECT
DROP POLICY IF EXISTS "Users can view sports academy from their company" ON public.sports_academy;
CREATE POLICY "Users can view sports academy from their company"
ON public.sports_academy FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

-- INSERT
DROP POLICY IF EXISTS "Admins can manage sports academy for their company" ON public.sports_academy;
DROP POLICY IF EXISTS "Users can insert sports academy for their company" ON public.sports_academy;
CREATE POLICY "Users can insert sports academy for their company"
ON public.sports_academy FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

-- UPDATE
DROP POLICY IF EXISTS "Users can update sports academy for their company" ON public.sports_academy;
CREATE POLICY "Users can update sports academy for their company"
ON public.sports_academy FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

-- DELETE
DROP POLICY IF EXISTS "Users can delete sports academy for their company" ON public.sports_academy;
CREATE POLICY "Users can delete sports academy for their company"
ON public.sports_academy FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);
