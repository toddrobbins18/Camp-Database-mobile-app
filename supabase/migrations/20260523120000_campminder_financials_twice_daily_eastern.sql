-- Owl Pay / financials sync: twice daily at 8 AM and 8 PM America/New_York (Eastern).
-- See tyler-hill/supabase/migrations/20260523120000_campminder_financials_twice_daily_eastern.sql

CREATE OR REPLACE FUNCTION public.run_campminder_eastern_sync_window()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  et_hour int;
BEGIN
  et_hour := EXTRACT(HOUR FROM (timezone('America/New_York', now())))::int;

  IF et_hour = 6 THEN
    PERFORM public.trigger_campminder_sync('campers');
  ELSIF et_hour = 7 THEN
    PERFORM public.trigger_campminder_sync('staff');
  ELSIF et_hour = 8 THEN
    PERFORM public.trigger_campminder_sync('financials');
  ELSIF et_hour = 18 THEN
    PERFORM public.trigger_campminder_sync('campers');
  ELSIF et_hour = 19 THEN
    PERFORM public.trigger_campminder_sync('staff');
  ELSIF et_hour = 20 THEN
    PERFORM public.trigger_campminder_sync('financials');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_campminder_eastern_pre_sync_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  et_hour int;
BEGIN
  et_hour := EXTRACT(HOUR FROM (timezone('America/New_York', now())))::int;

  IF et_hour IN (5, 17, 7, 19) THEN
    PERFORM public.cleanup_stale_campminder_sync_jobs(150);
  END IF;
END;
$$;
