-- Fix automated_email_config RLS to support current role model and multi-company scope.
-- Old policy only allowed has_role(..., 'admin') and predates company_id support.

ALTER TABLE public.automated_email_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email config" ON public.automated_email_config;
DROP POLICY IF EXISTS "Authenticated users can view email config" ON public.automated_email_config;
DROP POLICY IF EXISTS "Users can view automated email config for their company" ON public.automated_email_config;
DROP POLICY IF EXISTS "Admins and super admins can manage automated email config" ON public.automated_email_config;

CREATE POLICY "Users can view automated email config for their company"
ON public.automated_email_config
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = public.get_user_company(auth.uid())
);

CREATE POLICY "Admins and super admins can manage automated email config"
ON public.automated_email_config
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
