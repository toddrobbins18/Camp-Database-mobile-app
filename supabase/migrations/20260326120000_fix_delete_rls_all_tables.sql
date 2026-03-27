-- Comprehensive fix for DELETE RLS across all major tables.
-- Root cause: many tables only have a FOR ALL policy that checks profile company_id,
-- but super_admins switching companies need explicit is_super_admin() bypass.
-- Also: some tables lack any DELETE-specific policy entirely.
-- This migration is idempotent and safe to re-run.

-- ============================================================
-- 1. APPOINTMENTS
-- ============================================================
DROP POLICY IF EXISTS "Users can delete appointments for their company" ON public.appointments;
DROP POLICY IF EXISTS "Users can manage appointments for their company" ON public.appointments;

CREATE POLICY "Users can delete appointments for their company"
ON public.appointments FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- Ensure INSERT / UPDATE also work for super_admin + company members
DROP POLICY IF EXISTS "Users can insert appointments for their company" ON public.appointments;
CREATE POLICY "Users can insert appointments for their company"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Users can update appointments for their company" ON public.appointments;
CREATE POLICY "Users can update appointments for their company"
ON public.appointments FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 2. ACTIVITIES & FIELD TRIPS
-- ============================================================
DROP POLICY IF EXISTS "Users can delete activities for their company" ON public.activities_field_trips;
DROP POLICY IF EXISTS "Users can manage activities for their company" ON public.activities_field_trips;

CREATE POLICY "Users can delete activities for their company"
ON public.activities_field_trips FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Users can insert activities for their company" ON public.activities_field_trips;
CREATE POLICY "Users can insert activities for their company"
ON public.activities_field_trips FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Users can update activities for their company" ON public.activities_field_trips;
CREATE POLICY "Users can update activities for their company"
ON public.activities_field_trips FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 3. CHILDREN (Campers)
-- ============================================================
DROP POLICY IF EXISTS "Users can delete children from their company" ON public.children;
DROP POLICY IF EXISTS "Admins and staff can delete children" ON public.children;

CREATE POLICY "Users can delete children from their company"
ON public.children FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  )
);

-- ============================================================
-- 4. STAFF
-- ============================================================
DROP POLICY IF EXISTS "Users can delete staff from their company" ON public.staff;
DROP POLICY IF EXISTS "Users can manage staff from their company" ON public.staff;

CREATE POLICY "Users can delete staff from their company"
ON public.staff FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  )
);

-- ============================================================
-- 5. TRIPS (Transportation)
-- ============================================================
DROP POLICY IF EXISTS "Users can delete trips from their company" ON public.trips;
DROP POLICY IF EXISTS "Users can manage trips" ON public.trips;

CREATE POLICY "Users can delete trips from their company"
ON public.trips FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 6. MEDICATION LOGS
-- ============================================================
DROP POLICY IF EXISTS "Users can delete medication logs for their company" ON public.medication_logs;
DROP POLICY IF EXISTS "Users can manage medication logs" ON public.medication_logs;

CREATE POLICY "Users can delete medication logs for their company"
ON public.medication_logs FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 7. INCIDENT REPORTS
-- ============================================================
DROP POLICY IF EXISTS "Users can delete incident reports for their company" ON public.incident_reports;
DROP POLICY IF EXISTS "Admins and super admins can delete incident reports" ON public.incident_reports;

CREATE POLICY "Users can delete incident reports for their company"
ON public.incident_reports FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  )
);

-- ============================================================
-- 8. MENU ITEMS
-- ============================================================
DROP POLICY IF EXISTS "Users can delete menu items for their company" ON public.menu_items;
DROP POLICY IF EXISTS "Company members can delete menu items" ON public.menu_items;

CREATE POLICY "Users can delete menu items for their company"
ON public.menu_items FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 9. SPORTS ACADEMY
-- ============================================================
DROP POLICY IF EXISTS "Users can delete sports academy from their company" ON public.sports_academy;
DROP POLICY IF EXISTS "Company members can delete sports academy" ON public.sports_academy;

CREATE POLICY "Users can delete sports academy from their company"
ON public.sports_academy FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 10. SPORTS CALENDAR
-- ============================================================
DROP POLICY IF EXISTS "Users can delete sports calendar from their company" ON public.sports_calendar;
DROP POLICY IF EXISTS "Company members can delete sports calendar" ON public.sports_calendar;

CREATE POLICY "Users can delete sports calendar from their company"
ON public.sports_calendar FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 11. SPECIAL EVENTS ACTIVITIES
-- ============================================================
DROP POLICY IF EXISTS "Users can delete special events for their company" ON public.special_events_activities;
DROP POLICY IF EXISTS "Company members can delete special events" ON public.special_events_activities;

CREATE POLICY "Users can delete special events for their company"
ON public.special_events_activities FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 12. AWARDS
-- ============================================================
DROP POLICY IF EXISTS "Users can delete awards from their company" ON public.awards;
DROP POLICY IF EXISTS "Company members can delete awards" ON public.awards;

CREATE POLICY "Users can delete awards from their company"
ON public.awards FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 13. TUTORING THERAPY
-- ============================================================
DROP POLICY IF EXISTS "Users can delete tutoring therapy from their company" ON public.tutoring_therapy;
DROP POLICY IF EXISTS "Company members can delete tutoring therapy" ON public.tutoring_therapy;

CREATE POLICY "Users can delete tutoring therapy from their company"
ON public.tutoring_therapy FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 14. SPECIAL MEALS
-- ============================================================
DROP POLICY IF EXISTS "Users can delete special meals for their company" ON public.special_meals;
DROP POLICY IF EXISTS "Company members can delete special meals" ON public.special_meals;

CREATE POLICY "Users can delete special meals for their company"
ON public.special_meals FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
