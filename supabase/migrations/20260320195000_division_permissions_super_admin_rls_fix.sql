-- =====================================================
-- Division Permissions RLS Fix
-- Ensure super_admin can view/manage division_permissions
-- =====================================================

ALTER TABLE public.division_permissions ENABLE ROW LEVEL SECURITY;

-- Remove legacy policies that only allow "admin"
DROP POLICY IF EXISTS "Admins can manage division permissions" ON public.division_permissions;
DROP POLICY IF EXISTS "Users can view own division permissions" ON public.division_permissions;

-- Admins + super_admin can manage (SELECT/INSERT/UPDATE/DELETE)
CREATE POLICY "Admins and super admins can manage division permissions"
ON public.division_permissions
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Users can view their own division permissions (super_admin also included)
CREATE POLICY "Users can view own division permissions (super_admin included)"
ON public.division_permissions
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

