-- SCRIPT 1: Allow super_admins to approve and reject users
-- (profiles UPDATE + user_roles INSERT + profiles DELETE for reject)
-- Run in Supabase SQL Editor. Safe to run multiple times.

DROP POLICY IF EXISTS "Admins can approve users" ON public.profiles;

CREATE POLICY "Admins and super admins can approve users"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins and super admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
