-- Port of web migration 20260130000534_f7f923c0-... (tyler-hill).
-- Adds the division_schedules table so DivisionScheduleUploader.tsx on
-- the web does not error against the mobile Supabase project.
--
-- Idempotent: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

CREATE TABLE IF NOT EXISTS public.division_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  season TEXT NOT NULL DEFAULT '2026',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.division_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view division schedules from their company" ON public.division_schedules;
CREATE POLICY "Users can view division schedules from their company"
ON public.division_schedules FOR SELECT
USING (
  company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage division schedules for their company" ON public.division_schedules;
CREATE POLICY "Admins can manage division schedules for their company"
ON public.division_schedules FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_division_schedules_company_date
  ON public.division_schedules(company_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_division_schedules_division
  ON public.division_schedules(division_id);

-- Web migration also lazily adds staff.person_id for CSV matching.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'person_id'
  ) THEN
    ALTER TABLE public.staff ADD COLUMN person_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_staff_person_id ON public.staff(person_id);
  END IF;
END
$$;
