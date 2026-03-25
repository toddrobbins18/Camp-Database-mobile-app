-- Allow all birthday party type values used by the mobile/web UI.
-- (Existing constraint may be outdated relative to UI radio options.)
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.children'::regclass
    AND contype = 'c'
    AND conname ILIKE '%birthday_party_type%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.children DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS birthday_party_type_check;

ALTER TABLE public.children
  ADD CONSTRAINT birthday_party_type_check
  CHECK (
    birthday_party_type IS NULL
    OR birthday_party_type IN (
      -- Legacy/normalized values
      'pizza',
      'campfire',
      'movie',
      'ice_cream_sundae',
      -- UI values (mobile + web)
      'pizza_soda',
      'campfire_smores',
      'cookies_movie',
      'ice_cream'
    )
  );

