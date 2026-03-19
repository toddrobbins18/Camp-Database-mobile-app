-- Add person_name to appointments for display without joining children/staff.
-- Mobile and web can store the selected camper/staff name when creating the appointment.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS person_name TEXT;
