-- Bunk management parity fix for mobile/web:
-- 1) Normalize legacy is_active values so mobile/web list behavior matches.
-- 2) Ensure company-scoped policies also allow super-admin writes/reads.

ALTER TABLE public.bunks
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE public.bunks
SET is_active = true
WHERE is_active IS NULL;

DROP POLICY IF EXISTS "Users can view bunks for their company" ON public.bunks;
DROP POLICY IF EXISTS "Users can manage bunks for their company" ON public.bunks;

CREATE POLICY "Users can view bunks for their company"
ON public.bunks
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = public.get_user_company(auth.uid())
);

CREATE POLICY "Users can manage bunks for their company"
ON public.bunks
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = public.get_user_company(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR company_id = public.get_user_company(auth.uid())
);

DROP POLICY IF EXISTS "Users can view bunk_staff for their company" ON public.bunk_staff;
DROP POLICY IF EXISTS "Users can manage bunk_staff for their company" ON public.bunk_staff;

CREATE POLICY "Users can view bunk_staff for their company"
ON public.bunk_staff
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = public.get_user_company(auth.uid())
);

CREATE POLICY "Users can manage bunk_staff for their company"
ON public.bunk_staff
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = public.get_user_company(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR company_id = public.get_user_company(auth.uid())
);
