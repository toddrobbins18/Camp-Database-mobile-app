-- Fix 403 on tutoring_therapy writes from mobile (align with sports_academy RLS pattern).
-- Replaces legacy FOR ALL policy with explicit INSERT/UPDATE/DELETE + profile company fallback.

DROP POLICY IF EXISTS "Admins can manage tutoring therapy for their company" ON public.tutoring_therapy;

CREATE POLICY "Users can insert tutoring therapy for their company"
ON public.tutoring_therapy FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can update tutoring therapy for their company"
ON public.tutoring_therapy FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can delete tutoring therapy for their company"
ON public.tutoring_therapy FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  OR company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);
