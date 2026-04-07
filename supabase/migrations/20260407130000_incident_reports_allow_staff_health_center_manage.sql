-- Align incident reporting RLS with Tyler Hill web app:
-- staff + health_center + admin + super_admin can create/update/delete incidents
-- for their company, and can manage incident_children rows for those incidents.

-- =====================================================
-- incident_reports: INSERT
-- =====================================================
DROP POLICY IF EXISTS "Admins and super admins can insert incidents" ON public.incident_reports;
DROP POLICY IF EXISTS "Admins can manage incidents for their company" ON public.incident_reports;
DROP POLICY IF EXISTS "Admins and staff can manage incidents" ON public.incident_reports;

CREATE POLICY "Authorized roles can insert incidents"
ON public.incident_reports
FOR INSERT TO authenticated
WITH CHECK (
  (company_id = public.get_user_company(auth.uid())
   OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
    OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR public.is_super_admin(auth.uid())
  )
);

-- =====================================================
-- incident_reports: UPDATE
-- =====================================================
DROP POLICY IF EXISTS "Admins and super admins can update incidents" ON public.incident_reports;

CREATE POLICY "Authorized roles can update incidents"
ON public.incident_reports
FOR UPDATE TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid())
   OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
    OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  (company_id = public.get_user_company(auth.uid())
   OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
    OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR public.is_super_admin(auth.uid())
  )
);

-- =====================================================
-- incident_reports: DELETE
-- =====================================================
DROP POLICY IF EXISTS "Admins and super admins can delete incidents" ON public.incident_reports;

CREATE POLICY "Authorized roles can delete incidents"
ON public.incident_reports
FOR DELETE TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid())
   OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
    OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR public.is_super_admin(auth.uid())
  )
);

-- =====================================================
-- incident_children: MANAGE (insert/update/delete)
-- =====================================================
DROP POLICY IF EXISTS "Admins and super admins can manage incident children" ON public.incident_children;
DROP POLICY IF EXISTS "Admins and staff can manage incident children" ON public.incident_children;

CREATE POLICY "Authorized roles can manage incident children"
ON public.incident_children
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (ir.company_id = public.get_user_company(auth.uid())
           OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'staff'::app_role)
        OR public.has_role(auth.uid(), 'health_center'::app_role)
        OR public.is_super_admin(auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (ir.company_id = public.get_user_company(auth.uid())
           OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'staff'::app_role)
        OR public.has_role(auth.uid(), 'health_center'::app_role)
        OR public.is_super_admin(auth.uid())
      )
  )
);

