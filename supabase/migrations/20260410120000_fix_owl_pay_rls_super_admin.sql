-- Owl Pay RLS: align with tyler-hill intent + multi-tenant fixes used elsewhere in this project.
-- Original manage policies required company_id + admin/staff but did NOT grant is_super_admin()
-- the same rights as SELECT — super admins could list items but INSERT/UPDATE/DELETE failed.
-- Also use explicit public.app_role casts for has_role().

-- ---------------------------------------------------------------------------
-- owl_pay_items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage owl pay items" ON public.owl_pay_items;

CREATE POLICY "Admins staff and super admins can manage owl pay items"
ON public.owl_pay_items
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

-- ---------------------------------------------------------------------------
-- owl_pay_transactions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins and staff can manage owl pay transactions" ON public.owl_pay_transactions;

CREATE POLICY "Admins staff and super admins can manage owl pay transactions"
ON public.owl_pay_transactions
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

-- ---------------------------------------------------------------------------
-- owl_pay_daily_scans
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins and staff can manage daily scans" ON public.owl_pay_daily_scans;

CREATE POLICY "Admins staff and super admins can manage daily scans"
ON public.owl_pay_daily_scans
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

-- ---------------------------------------------------------------------------
-- owl_pay_email_config (Settings tab: super_admin could not save before)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage config" ON public.owl_pay_email_config;

CREATE POLICY "Admins and super admins can manage owl pay email config"
ON public.owl_pay_email_config
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND public.is_admin(auth.uid()))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND public.is_admin(auth.uid()))
);
