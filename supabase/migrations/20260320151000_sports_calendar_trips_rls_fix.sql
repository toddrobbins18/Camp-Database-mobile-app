-- Fix 403 on sports_calendar (and related) writes from mobile / web when has_role() or FOR ALL WITH CHECK fails.
-- Mirrors sports_academy + special_meals: company match via get_user_company + profiles fallback + super_admin.
-- Also fixes trips insert after adding a sports event (pending sporting_event trip).

-- ========== sports_calendar ==========
DROP POLICY IF EXISTS "Users can view sports calendar from their company" ON public.sports_calendar;
CREATE POLICY "Users can view sports calendar from their company"
ON public.sports_calendar FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage sports calendar for their company" ON public.sports_calendar;
DROP POLICY IF EXISTS "Users can insert sports calendar for their company" ON public.sports_calendar;
CREATE POLICY "Users can insert sports calendar for their company"
ON public.sports_calendar FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update sports calendar for their company" ON public.sports_calendar;
CREATE POLICY "Users can update sports calendar for their company"
ON public.sports_calendar FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete sports calendar for their company" ON public.sports_calendar;
CREATE POLICY "Users can delete sports calendar for their company"
ON public.sports_calendar FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- ========== sports_calendar_divisions ==========
DROP POLICY IF EXISTS "Users can view sports calendar divisions from their company" ON public.sports_calendar_divisions;
CREATE POLICY "Users can view sports calendar divisions from their company"
ON public.sports_calendar_divisions FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage sports calendar divisions for their company" ON public.sports_calendar_divisions;
DROP POLICY IF EXISTS "Users can insert sports calendar divisions for their company" ON public.sports_calendar_divisions;
CREATE POLICY "Users can insert sports calendar divisions for their company"
ON public.sports_calendar_divisions FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update sports calendar divisions for their company" ON public.sports_calendar_divisions;
CREATE POLICY "Users can update sports calendar divisions for their company"
ON public.sports_calendar_divisions FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete sports calendar divisions for their company" ON public.sports_calendar_divisions;
CREATE POLICY "Users can delete sports calendar divisions for their company"
ON public.sports_calendar_divisions FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- ========== trips (linked sporting_event rows) ==========
DROP POLICY IF EXISTS "Users can view trips from their company" ON public.trips;
CREATE POLICY "Users can view trips from their company"
ON public.trips FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage trips for their company" ON public.trips;
DROP POLICY IF EXISTS "Users can insert trips for their company" ON public.trips;
CREATE POLICY "Users can insert trips for their company"
ON public.trips FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update trips for their company" ON public.trips;
CREATE POLICY "Users can update trips for their company"
ON public.trips FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete trips for their company" ON public.trips;
CREATE POLICY "Users can delete trips for their company"
ON public.trips FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);
