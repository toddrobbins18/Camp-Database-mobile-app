-- Align staff_days_off schema with web OD flow
-- Adds audit columns for manual check in/out and late sign-out override tracking.

ALTER TABLE public.staff_days_off
ADD COLUMN IF NOT EXISTS checked_out_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS late_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS late_override_reason TEXT,
ADD COLUMN IF NOT EXISTS late_override_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS late_override_approved_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.staff_days_off.checked_out_by IS 'User ID of who manually checked the staff out';
COMMENT ON COLUMN public.staff_days_off.checked_in_by IS 'User ID of who manually checked the staff in';
COMMENT ON COLUMN public.staff_days_off.late_override IS 'True when sign-out was approved via late override';
COMMENT ON COLUMN public.staff_days_off.late_override_reason IS 'Reason entered for late sign-out override';
COMMENT ON COLUMN public.staff_days_off.late_override_approved_by IS 'User ID who approved the late override';
COMMENT ON COLUMN public.staff_days_off.late_override_approved_at IS 'Timestamp when late override was approved';
