-- Allow super_admin to INSERT, UPDATE, and DELETE on children (fixes 403 when adding camper as Todd)
-- Existing policies only allow admin/staff with company match; super_admin was missing.

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
