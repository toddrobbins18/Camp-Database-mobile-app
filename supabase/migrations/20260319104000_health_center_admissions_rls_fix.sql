-- Fix health_center_admissions 403 on admit: use profiles fallback + super_admin for manage.
-- Same pattern as menu_items/incident_reports. Idempotent.

-- SELECT: allow when company matches get_user_company OR profiles.company_id
DROP POLICY IF EXISTS "Health center and admins can view health admissions" ON public.health_center_admissions;
CREATE POLICY "Health center and admins can view health admissions"
ON public.health_center_admissions
FOR SELECT
USING (
  (company_id = public.get_user_company(auth.uid())
   OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
   OR public.is_super_admin(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR public.is_super_admin(auth.uid())
  )
);

-- Manage (INSERT/UPDATE/DELETE): same company logic + WITH CHECK for INSERT
DROP POLICY IF EXISTS "Health center and admins can manage health admissions" ON public.health_center_admissions;
CREATE POLICY "Health center and admins can manage health admissions"
ON public.health_center_admissions
FOR ALL
TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid())
   OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
   OR public.is_super_admin(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  (company_id = public.get_user_company(auth.uid())
   OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
   OR public.is_super_admin(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR public.is_super_admin(auth.uid())
  )
);
