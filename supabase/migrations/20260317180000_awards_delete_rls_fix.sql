-- Fix awards delete: backfill company_id where null, then allow delete using same rules as SELECT (view).
-- Run after 20260317170000_awards_insert_rls.sql. Idempotent.

-- 1. Backfill company_id on awards from children (in case any rows have null company_id)
UPDATE public.awards a
SET company_id = c.company_id
FROM public.children c
WHERE a.child_id = c.id
  AND (a.company_id IS NULL OR a.company_id <> c.company_id);

-- 2. Drop and recreate DELETE policy: mirror SELECT policy so "can see = can delete"; add profiles fallback.
DROP POLICY IF EXISTS "Users can delete awards for their company" ON public.awards;

CREATE POLICY "Users can delete awards for their company"
ON public.awards FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    (company_id = public.get_user_company(auth.uid())
     OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR (child_id IS NOT NULL AND public.can_access_child(child_id))
    )
  )
);
