-- Clean up existing duplicate active admissions, keeping only the most recent per child per company.
DELETE FROM public.health_center_admissions
WHERE checked_out_at IS NULL
  AND id NOT IN (
    SELECT DISTINCT ON (company_id, child_id) id
    FROM public.health_center_admissions
    WHERE checked_out_at IS NULL
    ORDER BY company_id, child_id, admitted_at DESC
  );

-- Now create the constraint to prevent future duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_admission_per_child
  ON public.health_center_admissions (company_id, child_id)
  WHERE checked_out_at IS NULL;
