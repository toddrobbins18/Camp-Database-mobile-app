-- Align sports_calendar.home_away with web (lowercase) and allow 'neutral'.
-- Mobile previously sent 'Home'/'Away' which violated sports_calendar_home_away_check.

UPDATE public.sports_calendar
SET home_away = lower(trim(home_away))
WHERE home_away IS NOT NULL;

-- Clear values that still are not allowed so ADD CONSTRAINT succeeds
UPDATE public.sports_calendar
SET home_away = NULL
WHERE home_away IS NOT NULL
  AND home_away NOT IN ('home', 'away', 'neutral');

ALTER TABLE public.sports_calendar
DROP CONSTRAINT IF EXISTS sports_calendar_home_away_check;

ALTER TABLE public.sports_calendar
ADD CONSTRAINT sports_calendar_home_away_check
CHECK (home_away IS NULL OR home_away IN ('home', 'away', 'neutral'));
