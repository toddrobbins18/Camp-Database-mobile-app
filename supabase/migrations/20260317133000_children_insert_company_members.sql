-- Fix mobile 403 when adding a child.
-- Allow authenticated users to INSERT children rows for their own company.
-- This matches common UI expectations (company members can add campers) while preserving company boundaries.
-- Idempotent: safe to re-run.

CREATE POLICY "Company members can insert children for their company"
ON public.children
FOR INSERT
TO authenticated
WITH CHECK (
  (company_id = public.get_user_company(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

