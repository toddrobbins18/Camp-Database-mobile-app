-- Align write RLS with read RLS for activities / trips (super-admin & company-switch).
-- Same intent as tyler-hill 20260425120000_fix_activities_trips_rls_super_admin.sql
-- and datacamp-mobile 20260320132000_special_events_rls_super_admin_fix.sql

DROP POLICY IF EXISTS "Admins can manage field trips for their company" ON public.activities_field_trips;

CREATE POLICY "Admins can manage field trips for their company"
ON public.activities_field_trips
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
);

DROP POLICY IF EXISTS "Admins can manage activity divisions for their company" ON public.activities_field_trips_divisions;

CREATE POLICY "Admins can manage activity divisions for their company"
ON public.activities_field_trips_divisions
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
);

DROP POLICY IF EXISTS "Admins can manage trips for their company" ON public.trips;

CREATE POLICY "Admins can manage trips for their company"
ON public.trips
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
);
