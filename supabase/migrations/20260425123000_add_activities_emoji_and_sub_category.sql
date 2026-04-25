-- Backfill web parity columns for Activities & Field Trips.
-- Without this, REST inserts that include `emoji` can fail with 400 (unknown column).

ALTER TABLE public.activities_field_trips
ADD COLUMN IF NOT EXISTS emoji TEXT,
ADD COLUMN IF NOT EXISTS sub_category TEXT;
