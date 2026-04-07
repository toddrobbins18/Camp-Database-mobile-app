-- Hard reset incident RLS policies to remove legacy conflicts/restrictive leftovers.
-- Keeps RLS ON, but guarantees:
--  - super_admin can read/write across all companies
--  - admin/staff/health_center can read/write within their company

DO $$
DECLARE
  p record;
BEGIN
  -- Drop every existing policy on incident_reports
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'incident_reports'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.incident_reports;', p.policyname);
  END LOOP;

  -- Drop every existing policy on incident_children
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'incident_children'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.incident_children;', p.policyname);
  END LOOP;
END $$;

-- Ensure RLS remains enabled
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_children ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- incident_reports policies
-- -----------------------------------------------------
CREATE POLICY "incident_reports_select"
ON public.incident_reports
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    (company_id = public.get_user_company(auth.uid())
     OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
);

CREATE POLICY "incident_reports_insert"
ON public.incident_reports
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    (company_id = public.get_user_company(auth.uid())
     OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
);

CREATE POLICY "incident_reports_update"
ON public.incident_reports
FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
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
  OR (
    (company_id = public.get_user_company(auth.uid())
     OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
);

CREATE POLICY "incident_reports_delete"
ON public.incident_reports
FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    (company_id = public.get_user_company(auth.uid())
     OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
);

-- -----------------------------------------------------
-- incident_children policies
-- -----------------------------------------------------
CREATE POLICY "incident_children_select"
ON public.incident_children
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (
        (ir.company_id = public.get_user_company(auth.uid())
         OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      )
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'staff'::app_role)
        OR public.has_role(auth.uid(), 'health_center'::app_role)
      )
  )
);

CREATE POLICY "incident_children_manage"
ON public.incident_children
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (
        (ir.company_id = public.get_user_company(auth.uid())
         OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      )
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'staff'::app_role)
        OR public.has_role(auth.uid(), 'health_center'::app_role)
      )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.incident_reports ir
    WHERE ir.id = incident_children.incident_id
      AND (
        (ir.company_id = public.get_user_company(auth.uid())
         OR ir.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      )
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'staff'::app_role)
        OR public.has_role(auth.uid(), 'health_center'::app_role)
      )
  )
);

