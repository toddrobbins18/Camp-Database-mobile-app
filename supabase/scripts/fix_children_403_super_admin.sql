-- Fix 403 when adding a child as Super Admin (run in Supabase Dashboard → SQL Editor)
-- Adds RLS policies so super_admin can INSERT/UPDATE/DELETE on children.

DROP POLICY IF EXISTS "Super admins can insert children" ON public.children;
DROP POLICY IF EXISTS "Super admins can update children" ON public.children;
DROP POLICY IF EXISTS "Super admins can delete children" ON public.children;

CREATE POLICY "Super admins can insert children"
ON public.children
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update children"
ON public.children
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete children"
ON public.children
FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));
