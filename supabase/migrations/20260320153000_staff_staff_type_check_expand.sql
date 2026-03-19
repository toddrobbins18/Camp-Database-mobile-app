-- Allow staff_type values used by web AddStaffDialog (support, leadership) and mobile UI.
-- Previously only general_counselor | specialist | both — caused 400 on insert.

ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_staff_type_check;

ALTER TABLE public.staff
ADD CONSTRAINT staff_staff_type_check
CHECK (
  staff_type IS NULL
  OR staff_type IN (
    'general_counselor',
    'specialist',
    'both',
    'support',
    'leadership'
  )
);
