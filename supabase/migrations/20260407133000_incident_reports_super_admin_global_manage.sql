-- Allow super_admin to manage incident reports across companies (no company_id constraint),
-- and allow normal roles to manage within their company.
--
-- This fixes cases where a super_admin account has no profile.company_id set (common when
-- super admins switch camps in-app) which otherwise causes INSERT/UPDATE/DELETE to fail.

-- =====================================================
-- incident_reports: INSERT
-- =====================================================
DROP POLICY IF EXISTS "Admins and super admins can insert incidents" ON public.incident_reports;
DROP POLICY IF EXISTS "Authorized roles can insert incidents" ON public.incident_reports;

CREATE POLICY "Authorized roles can insert incidents"
ON public.incident_reports
FOR INSERT TO authenticated
WITH CHECK (
  (
    public.is_super_admin(auth.uid())
  )
  OR
  (
    (company_id = public.get_user_company(auth.uid())
     OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
);

-- =====================================================
-- incident_reports: UPDATE
-- =====================================================
DROP POLICY IF EXISTS "Admins and super admins can update incidents" ON public.incident_reports;
DROP POLICY IF EXISTS "Authorized roles can update incidents" ON public.incident_reports;

CREATE POLICY "Authorized roles can update incidents"
ON public.incident_reports
FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    (company_id = public.get_user_company(auth.uid())
     OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    (company_id = public.get_user_company(auth.uid())
     OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
);

-- =====================================================
-- incident_reports: DELETE
-- =====================================================
DROP POLICY IF EXISTS "Admins and super admins can delete incidents" ON public.incident_reports;
DROP POLICY IF EXISTS "Authorized roles can delete incidents" ON public.incident_reports;

CREATE POLICY "Authorized roles can delete incidents"
ON public.incident_reports
FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    (company_id = public.get_user_company(auth.uid())
     OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
);

-- =====================================================
-- incident_children: MANAGE (insert/update/delete)
-- =====================================================
DROP POLICY IF EXISTS "Admins and super admins can manage incident children" ON public.incident_children;
DROP POLICY IF EXISTS "Admins and staff can manage incident children" ON public.incident_children;
DROP POLICY IF EXISTS "Authorized roles can manage incident children" ON public.incident_children;

CREATE POLICY "Authorized roles can manage incident children"
ON public.incident_children
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (ir.company_id = public.get_user_company(auth.uid())
           OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'staff'::app_role)
        OR public.has_role(auth.uid(), 'health_center'::app_role)
      )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (ir.company_id = public.get_user_company(auth.uid())
           OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'staff'::app_role)
        OR public.has_role(auth.uid(), 'health_center'::app_role)
      )
  )
);

