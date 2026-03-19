-- Ensure appointments can be deleted by company members (fix delete button not working).
-- Row is removed from the database when user has access.
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "Users can manage appointments for their company" ON public.appointments;

CREATE POLICY "Users can select appointments for their company"
ON public.appointments FOR SELECT TO authenticated
USING (
  public.get_user_company(auth.uid()) = company_id
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can insert appointments for their company"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_company(auth.uid()) = company_id
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can update appointments for their company"
ON public.appointments FOR UPDATE TO authenticated
USING (
  public.get_user_company(auth.uid()) = company_id
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.get_user_company(auth.uid()) = company_id
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can delete appointments for their company"
ON public.appointments FOR DELETE TO authenticated
USING (
  public.get_user_company(auth.uid()) = company_id
  OR public.is_super_admin(auth.uid())
);
