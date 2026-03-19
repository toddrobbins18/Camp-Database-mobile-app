-- Fix roster template insert RLS failures on mobile/web parity.
-- Adds explicit WITH CHECK and super-admin support for manage policies.

DROP POLICY IF EXISTS "Users can view roster templates from their company" ON public.roster_templates;
DROP POLICY IF EXISTS "Admins can manage roster templates for their company" ON public.roster_templates;

CREATE POLICY "Users can view roster templates from their company"
ON public.roster_templates
FOR SELECT
USING (
  company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage roster templates for their company"
ON public.roster_templates
FOR ALL
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

DROP POLICY IF EXISTS "Users can view roster template children from their company" ON public.roster_template_children;
DROP POLICY IF EXISTS "Admins can manage roster template children for their company" ON public.roster_template_children;

CREATE POLICY "Users can view roster template children from their company"
ON public.roster_template_children
FOR SELECT
USING (
  company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage roster template children for their company"
ON public.roster_template_children
FOR ALL
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
