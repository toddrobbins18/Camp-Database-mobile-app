-- Fix appointment delete: use direct profiles subquery so delete works when get_user_company() is null.
-- Run after 20260317150000_appointments_delete_rls.sql. Idempotent.

DROP POLICY IF EXISTS "Users can delete appointments for their company" ON public.appointments;

CREATE POLICY "Users can delete appointments for their company"
ON public.appointments FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.get_user_company(auth.uid()) = company_id
  OR public.is_super_admin(auth.uid())
);
