-- Fix 403 INSERT on special events for super-admin/company-switch workflows.
-- Align manage policies with explicit WITH CHECK and super-admin support.

DROP POLICY IF EXISTS "Users can view special events from their company" ON public.special_events_activities;
DROP POLICY IF EXISTS "Admins can manage special events for their company" ON public.special_events_activities;

CREATE POLICY "Users can view special events from their company"
ON public.special_events_activities
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage special events for their company"
ON public.special_events_activities
FOR ALL
TO authenticated
USING (
  (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can view special event divisions from their company" ON public.special_events_divisions;
DROP POLICY IF EXISTS "Admins can manage special event divisions for their company" ON public.special_events_divisions;

CREATE POLICY "Users can view special event divisions from their company"
ON public.special_events_divisions
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage special event divisions for their company"
ON public.special_events_divisions
FOR ALL
TO authenticated
USING (
  (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
  OR public.is_super_admin(auth.uid())
);
