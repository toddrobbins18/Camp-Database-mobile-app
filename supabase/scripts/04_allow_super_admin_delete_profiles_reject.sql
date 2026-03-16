-- Reject button: allow super_admins to delete profiles (so rejected users disappear from User Approvals)
-- Run in Supabase SQL Editor. Safe to run multiple times.

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Admins and super admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid())
);
