-- Allow super_admin to manage evaluation_questions (fix 403 on mobile/web inserts)
-- Safe to re-run: drops known policies and recreates company-isolated admin policy.

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.evaluation_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (names from earlier migrations)
DROP POLICY IF EXISTS "Users can view evaluation questions from their company" ON public.evaluation_questions;
DROP POLICY IF EXISTS "Admins can manage evaluation questions in their company" ON public.evaluation_questions;

-- Also drop older generic admin/staff policies if they exist
DROP POLICY IF EXISTS "Admins and staff can view evaluation questions" ON public.evaluation_questions;
DROP POLICY IF EXISTS "Only admins can manage evaluation questions" ON public.evaluation_questions;

-- SELECT: company isolation, but super_admin can view all
CREATE POLICY "Users can view evaluation questions from their company (super_admin included)"
ON public.evaluation_questions FOR SELECT
USING (
  company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- FOR ALL: admin role can manage within their company; super_admin can manage all companies
CREATE POLICY "Admins and super admins can manage evaluation questions"
ON public.evaluation_questions FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
);

