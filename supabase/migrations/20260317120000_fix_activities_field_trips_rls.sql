-- Fix 403 on INSERT: ensure activities_field_trips and activities_field_trips_divisions
-- allow authenticated admin/staff (or super_admin) for their company.
-- Idempotent: safe to re-run.

-- 1. activities_field_trips: replace single FOR ALL policy with explicit INSERT/UPDATE/DELETE + WITH CHECK
DROP POLICY IF EXISTS "Admins can manage field trips for their company" ON public.activities_field_trips;

CREATE POLICY "Users can insert field trips for their company"
ON public.activities_field_trips FOR INSERT TO authenticated
WITH CHECK (
  (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can update field trips for their company"
ON public.activities_field_trips FOR UPDATE TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can delete field trips for their company"
ON public.activities_field_trips FOR DELETE TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
  OR public.is_super_admin(auth.uid())
);

-- 2. activities_field_trips_divisions: ensure INSERT has explicit WITH CHECK (same logic)
DROP POLICY IF EXISTS "Admins can manage activity divisions for their company" ON public.activities_field_trips_divisions;

CREATE POLICY "Users can insert activity divisions for their company"
ON public.activities_field_trips_divisions FOR INSERT TO authenticated
WITH CHECK (
  (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can select activity divisions from their company"
ON public.activities_field_trips_divisions FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update activity divisions for their company"
ON public.activities_field_trips_divisions FOR UPDATE TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can delete activity divisions for their company"
ON public.activities_field_trips_divisions FOR DELETE TO authenticated
USING (
  (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
  OR public.is_super_admin(auth.uid())
);
