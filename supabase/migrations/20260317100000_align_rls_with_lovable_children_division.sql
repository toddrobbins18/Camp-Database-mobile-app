-- Align RLS with Lovable: division-aware children access and can_access_child() for child-scoped tables.
-- Requires: get_user_company(), get_user_divisions(), has_role(), is_super_admin(), app_role.
-- See docs/RLS_COMPARISON_WITH_LOVABLE.md.

-- 1. Helper: can user access a child (company + role/division)?
CREATE OR REPLACE FUNCTION public.can_access_child(_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.children c
    WHERE c.id = _child_id
      AND c.company_id = get_user_company(auth.uid())
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'staff'::app_role)
        OR has_role(auth.uid(), 'health_center'::app_role)
        OR (
          (has_role(auth.uid(), 'division_leader'::app_role)
           OR has_role(auth.uid(), 'specialist'::app_role)
           OR has_role(auth.uid(), 'viewer'::app_role))
          AND c.division_id = ANY(get_user_divisions(auth.uid()))
        )
      )
  )
$$;

-- 2. Children: division-aware SELECT (keep super_admin so mobile super admins see all)
DROP POLICY IF EXISTS "Staff can view children from their company" ON public.children;
DROP POLICY IF EXISTS "Users can view children from their company" ON public.children;
CREATE POLICY "Users can view children from their company"
ON public.children
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    (company_id = get_user_company(auth.uid()))
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
      OR has_role(auth.uid(), 'health_center'::app_role)
      OR (
        (has_role(auth.uid(), 'division_leader'::app_role) OR has_role(auth.uid(), 'specialist'::app_role) OR has_role(auth.uid(), 'viewer'::app_role))
        AND division_id = ANY(get_user_divisions(auth.uid()))
      )
    )
  )
);

-- 3. Daily notes
DROP POLICY IF EXISTS "Users can view daily notes from their company" ON public.daily_notes;
CREATE POLICY "Users can view daily notes from their company"
ON public.daily_notes FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
      OR has_role(auth.uid(), 'health_center'::app_role)
      OR (child_id IS NOT NULL AND can_access_child(child_id))
    )
  )
);

-- 4. Awards
DROP POLICY IF EXISTS "Users can view awards from their company" ON public.awards;
CREATE POLICY "Users can view awards from their company"
ON public.awards FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
      OR (child_id IS NOT NULL AND can_access_child(child_id))
    )
  )
);

-- 5. Camper reports
DROP POLICY IF EXISTS "Users can view camper reports from their company" ON public.camper_reports;
CREATE POLICY "Users can view camper reports from their company"
ON public.camper_reports FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
      OR can_access_child(child_id)
    )
  )
);

-- 6. Appointments
DROP POLICY IF EXISTS "Users can view appointments for their company" ON public.appointments;
CREATE POLICY "Users can view appointments for their company"
ON public.appointments FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
      OR has_role(auth.uid(), 'health_center'::app_role)
      OR (child_id IS NOT NULL AND can_access_child(child_id))
    )
  )
);

-- 7. Sports academy (if table exists)
DROP POLICY IF EXISTS "Users can view sports academy from their company" ON public.sports_academy;
CREATE POLICY "Users can view sports academy from their company"
ON public.sports_academy FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
      OR has_role(auth.uid(), 'specialist'::app_role)
      OR (child_id IS NOT NULL AND can_access_child(child_id))
    )
  )
);

-- 8. Tutoring therapy (if table exists)
DROP POLICY IF EXISTS "Users can view tutoring therapy from their company" ON public.tutoring_therapy;
CREATE POLICY "Users can view tutoring therapy from their company"
ON public.tutoring_therapy FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
      OR has_role(auth.uid(), 'specialist'::app_role)
      OR (child_id IS NOT NULL AND can_access_child(child_id))
    )
  )
);

-- 9. Trip attendees (if table exists)
DROP POLICY IF EXISTS "Users can view trip attendees from their company" ON public.trip_attendees;
CREATE POLICY "Users can view trip attendees from their company"
ON public.trip_attendees FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
      OR can_access_child(child_id)
    )
  )
);

-- 10. Sports event roster (if table exists)
DROP POLICY IF EXISTS "Users can view sports event roster from their company" ON public.sports_event_roster;
CREATE POLICY "Users can view sports event roster from their company"
ON public.sports_event_roster FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
      OR has_role(auth.uid(), 'specialist'::app_role)
      OR can_access_child(child_id)
    )
  )
);
