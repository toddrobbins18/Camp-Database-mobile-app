-- Incident reports: only admins and super admins can add, edit, delete.
-- SELECT remains as in 20251207123405 (admin, health_center, staff, super_admin can view).
-- Idempotent: safe to re-run.

-- incident_reports: INSERT (admin + super_admin only)
DROP POLICY IF EXISTS "Admins and super admins can insert incidents" ON public.incident_reports;
CREATE POLICY "Admins and super admins can insert incidents"
ON public.incident_reports FOR INSERT TO authenticated
WITH CHECK (
  (company_id = public.get_user_company(auth.uid()) OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  )
);

-- incident_reports: UPDATE (admin + super_admin only)
DROP POLICY IF EXISTS "Admins and super admins can update incidents" ON public.incident_reports;
CREATE POLICY "Admins and super admins can update incidents"
ON public.incident_reports FOR UPDATE TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid()) OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  (company_id = public.get_user_company(auth.uid()) OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  )
);

-- incident_reports: DELETE (admin + super_admin only)
DROP POLICY IF EXISTS "Admins and super admins can delete incidents" ON public.incident_reports;
CREATE POLICY "Admins and super admins can delete incidents"
ON public.incident_reports FOR DELETE TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid()) OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  )
);

-- incident_children: restrict manage to admin + super_admin (was "Admins and staff")
DROP POLICY IF EXISTS "Admins and staff can manage incident children" ON public.incident_children;
CREATE POLICY "Admins and super admins can manage incident children"
ON public.incident_children FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (ir.company_id = public.get_user_company(auth.uid()) OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.is_super_admin(auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (ir.company_id = public.get_user_company(auth.uid()) OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.is_super_admin(auth.uid())
      )
  )
);

-- incident_children: allow SELECT for same roles that can view incidents (so list/detail works)
DROP POLICY IF EXISTS "Authorized roles can view incident children" ON public.incident_children;
CREATE POLICY "Authorized roles can view incident children"
ON public.incident_children FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (ir.company_id = public.get_user_company(auth.uid()) OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'health_center'::app_role)
        OR public.has_role(auth.uid(), 'staff'::app_role)
        OR public.is_super_admin(auth.uid())
      )
  )
);
