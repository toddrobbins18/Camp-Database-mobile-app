-- Allow company members to insert/update/delete special_meals (fix 403 on Add Special Meal).
-- Mirrors menu_items RLS pattern with get_user_company + profiles fallback + super_admin.
-- Idempotent and safe to re-run.

-- SELECT
DROP POLICY IF EXISTS "Users can view special meals from their company" ON public.special_meals;
CREATE POLICY "Users can view special meals from their company"
ON public.special_meals FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

-- INSERT
DROP POLICY IF EXISTS "Admins can manage special meals for their company" ON public.special_meals;
DROP POLICY IF EXISTS "Users can insert special meals for their company" ON public.special_meals;
CREATE POLICY "Users can insert special meals for their company"
ON public.special_meals FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

-- UPDATE
DROP POLICY IF EXISTS "Users can update special meals for their company" ON public.special_meals;
CREATE POLICY "Users can update special meals for their company"
ON public.special_meals FOR UPDATE TO authenticated
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

-- DELETE
DROP POLICY IF EXISTS "Users can delete special meals for their company" ON public.special_meals;
CREATE POLICY "Users can delete special meals for their company"
ON public.special_meals FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);
