-- Allow company members to insert/update/delete menu_items (fix 403 on Add Menu).
-- Align with awards/appointments: use get_user_company + profiles fallback + super_admin.
-- Idempotent: safe to re-run.

-- INSERT
DROP POLICY IF EXISTS "Users can insert menu for their company" ON public.menu_items;
CREATE POLICY "Users can insert menu for their company"
ON public.menu_items FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

-- UPDATE
DROP POLICY IF EXISTS "Users can update menu for their company" ON public.menu_items;
CREATE POLICY "Users can update menu for their company"
ON public.menu_items FOR UPDATE TO authenticated
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

-- DELETE (profiles check first so delete works when get_user_company() is null)
DROP POLICY IF EXISTS "Users can delete menu for their company" ON public.menu_items;
CREATE POLICY "Users can delete menu for their company"
ON public.menu_items FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

