-- Ensure medication recurrence fields are present and normalized for web/mobile parity.

ALTER TABLE public.medication_logs
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS days_of_week TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS end_date DATE;

UPDATE public.medication_logs
SET is_recurring = false
WHERE is_recurring IS NULL;

UPDATE public.medication_logs
SET frequency = 'daily'
WHERE frequency IS NULL OR btrim(frequency) = '';

UPDATE public.medication_logs
SET days_of_week = '{}'::text[]
WHERE days_of_week IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'medication_logs_frequency_check'
      AND conrelid = 'public.medication_logs'::regclass
  ) THEN
    ALTER TABLE public.medication_logs
      ADD CONSTRAINT medication_logs_frequency_check
      CHECK (frequency IN ('daily', 'weekly', 'custom'));
  END IF;
END $$;
