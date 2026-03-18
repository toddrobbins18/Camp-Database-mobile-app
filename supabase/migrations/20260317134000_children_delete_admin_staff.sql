-- Fix mobile/web mismatch: allow admin/staff to delete children for their company.
-- Idempotent: safe to re-run.

CREATE POLICY "Admins and staff can delete children for their company"
ON public.children
FOR DELETE
TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid())
   AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
  OR public.is_super_admin(auth.uid())
);

