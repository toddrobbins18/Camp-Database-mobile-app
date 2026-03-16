-- Allow super_admins to delete profiles (so Reject button works in User Approvals).
-- Previously only role = 'admin' could delete; super_admin was excluded.

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Admins and super admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid())
);
