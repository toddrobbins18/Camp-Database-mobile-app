-- Align special_meals RLS with current company-scoped patterns.
-- Adds explicit WITH CHECK and super-admin allowance for write operations.

DROP POLICY IF EXISTS "Users can view special meals from their company" ON public.special_meals;
DROP POLICY IF EXISTS "Admins can manage special meals for their company" ON public.special_meals;

CREATE POLICY "Users can view special meals from their company"
ON public.special_meals
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage special meals for their company"
ON public.special_meals
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
