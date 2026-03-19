-- Allow company members to insert/update/delete awards (fix 403 on Add Award).
-- Align with appointments: use get_user_company + profiles fallback + super_admin.
-- Idempotent: safe to re-run.

-- INSERT
DROP POLICY IF EXISTS "Users can insert awards for their company" ON public.awards;
CREATE POLICY "Users can insert awards for their company"
ON public.awards FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

-- UPDATE
DROP POLICY IF EXISTS "Users can update awards for their company" ON public.awards;
CREATE POLICY "Users can update awards for their company"
ON public.awards FOR UPDATE TO authenticated
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

-- DELETE (profiles check first so delete works when get_user_company() is null)
DROP POLICY IF EXISTS "Users can delete awards for their company" ON public.awards;
CREATE POLICY "Users can delete awards for their company"
ON public.awards FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);
