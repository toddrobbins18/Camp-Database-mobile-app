-- Division leaders (and viewers) can read nurse data for campers in their assigned divisions.
-- Same as tyler-hill 20260708180000; includes profiles.company_id fallback for mobile JWT context.

DROP POLICY IF EXISTS "Health center and admins can view medication logs" ON public.medication_logs;

CREATE POLICY "Health center and admins can view medication logs"
ON public.medication_logs
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR (
    (
      company_id = public.get_user_company(auth.uid())
      OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
  OR (
    (
      company_id = public.get_user_company(auth.uid())
      OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
    AND child_id IS NOT NULL
    AND public.can_access_child(child_id)
    AND (
      public.has_role(auth.uid(), 'division_leader'::app_role)
      OR public.has_role(auth.uid(), 'viewer'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Health center and admins can view health admissions" ON public.health_center_admissions;

CREATE POLICY "Health center and admins can view health admissions"
ON public.health_center_admissions
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR (
    (
      company_id = public.get_user_company(auth.uid())
      OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
  OR (
    (
      company_id = public.get_user_company(auth.uid())
      OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
    AND child_id IS NOT NULL
    AND public.can_access_child(child_id)
    AND (
      public.has_role(auth.uid(), 'division_leader'::app_role)
      OR public.has_role(auth.uid(), 'viewer'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Users can view health center admission notes" ON public.health_center_admission_notes;

CREATE POLICY "Users can view health center admission notes"
ON public.health_center_admission_notes
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR (
    (
      company_id = public.get_user_company(auth.uid())
      OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'health_center'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.health_center_admissions hca
    WHERE hca.id = admission_id
      AND (
        hca.company_id = public.get_user_company(auth.uid())
        OR hca.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
      )
      AND hca.child_id IS NOT NULL
      AND public.can_access_child(hca.child_id)
      AND (
        public.has_role(auth.uid(), 'division_leader'::app_role)
        OR public.has_role(auth.uid(), 'viewer'::app_role)
      )
  )
);

INSERT INTO public.role_permissions (company_id, role, menu_item, can_access)
SELECT c.id, 'division_leader'::public.app_role, 'nurse', true
FROM public.companies c
WHERE COALESCE(c.is_active, true) = true
ON CONFLICT (company_id, role, menu_item)
DO UPDATE SET can_access = true;
