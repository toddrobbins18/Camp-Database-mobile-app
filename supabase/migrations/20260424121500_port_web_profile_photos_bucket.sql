-- Port of web migrations (tyler-hill):
--   20260129130616_c0a9ec7c-... (create photo_url columns + profile-photos bucket)
--   20260129130915_076ed492-... (make bucket private, authenticated read only)
--
-- Web's StaffProfile / ChildProfile screens upload to this bucket and read
-- `photo_url` columns on staff/children. Without these on the mobile
-- Supabase, photo upload/fetch in the web UI fails.
--
-- Idempotent.

ALTER TABLE public.children ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.staff    ADD COLUMN IF NOT EXISTS photo_url text;

-- Create the bucket (private from the start, matching web's later state).
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Drop any stale policies (from earlier incarnations) before recreating.
DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for profile photos"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view profile photos"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete profile photos" ON storage.objects;

-- Authenticated-only access (matches web's 20260129130915 end-state).
CREATE POLICY "Authenticated users can view profile photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated users can upload profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated users can update profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated users can delete profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos');
