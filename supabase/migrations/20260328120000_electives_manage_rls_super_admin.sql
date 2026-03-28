-- Electives feature: create tables if missing, then RLS (Tyler Hill / any project without prior electives migration).
-- Run this whole file in order. Do not run only the DROP/CREATE POLICY section if tables do not exist.

-- ---------------------------------------------------------------------------
-- 1. Tables (idempotent)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.electives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.electives ADD COLUMN IF NOT EXISTS capacity integer NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.elective_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  elective_id uuid NOT NULL REFERENCES public.electives(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  day_of_week text NOT NULL,
  period text NOT NULL,
  season text DEFAULT '2026',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, child_id, week_start_date, day_of_week, period)
);

ALTER TABLE public.electives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elective_signups ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. electives policies: drop legacy ALL policy, add super_admin on writes
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view electives from their company" ON public.electives;
DROP POLICY IF EXISTS "Admins can manage electives for their company" ON public.electives;
DROP POLICY IF EXISTS "Admins and super admins can insert electives" ON public.electives;
DROP POLICY IF EXISTS "Admins and super admins can update electives" ON public.electives;
DROP POLICY IF EXISTS "Admins and super admins can delete electives" ON public.electives;

CREATE POLICY "Users can view electives from their company"
ON public.electives FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins and super admins can insert electives"
ON public.electives FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
    )
  )
);

CREATE POLICY "Admins and super admins can update electives"
ON public.electives FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
    )
  )
);

CREATE POLICY "Admins and super admins can delete electives"
ON public.electives FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
    )
  )
);

-- ---------------------------------------------------------------------------
-- 3. elective_signups: allow super_admin to manage (camp switch)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view elective signups from their company" ON public.elective_signups;
DROP POLICY IF EXISTS "Admins and staff can manage elective signups" ON public.elective_signups;
DROP POLICY IF EXISTS "Admins and super admins can insert elective signups" ON public.elective_signups;
DROP POLICY IF EXISTS "Admins and super admins can update elective signups" ON public.elective_signups;
DROP POLICY IF EXISTS "Admins and super admins can delete elective signups" ON public.elective_signups;

CREATE POLICY "Users can view elective signups from their company"
ON public.elective_signups FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins and super admins can insert elective signups"
ON public.elective_signups FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
    )
  )
);

CREATE POLICY "Admins and super admins can update elective signups"
ON public.elective_signups FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
    )
  )
);

CREATE POLICY "Admins and super admins can delete elective signups"
ON public.elective_signups FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
    )
  )
);
