-- Allow super_admins to approve users (update profiles.approved/company_id and insert user_roles).
-- Previously only admins could do this, so super_admin approvers saw no effect.

-- 1. Profiles: allow super_admin to update profiles (for approval/assignment)
DROP POLICY IF EXISTS "Admins can approve users" ON public.profiles;

CREATE POLICY "Admins and super admins can approve users"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()));

-- 2. user_roles: allow super_admin to insert roles (so approval can add Staff role)
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins and super admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
