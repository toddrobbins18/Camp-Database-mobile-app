-- =============================================================================
-- Storage buckets matching Lovable web app (all private)
-- Run this so uploads from mobile and web use the same buckets.
-- Idempotent: safe to re-run.
-- =============================================================================

-- 1. Ensure all five buckets exist and are private
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('profile-photos', 'profile-photos', false),
  ('daily-wolf-documents', 'daily-wolf-documents', false),
  ('rainy-day-documents', 'rainy-day-documents', false),
  ('division-schedules', 'division-schedules', false),
  ('trip-attachments', 'trip-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. profile-photos: company-scoped (path: company_id/entity_type/entity_id/file)
DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their company profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their company profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company profile photos" ON storage.objects;

CREATE POLICY "Users can view their company profile photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Users can upload their company profile photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Users can update their company profile photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Users can delete their company profile photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- 3. daily-wolf-documents: company-scoped (path: company_id/season/date-timestamp-filename)
DROP POLICY IF EXISTS "Users can upload daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can view daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their company daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their company daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company daily wolf documents" ON storage.objects;

CREATE POLICY "Users can view their company daily wolf documents"
ON storage.objects FOR SELECT USING (
  bucket_id = 'daily-wolf-documents' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Users can upload their company daily wolf documents"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'daily-wolf-documents' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Users can update their company daily wolf documents"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'daily-wolf-documents' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Users can delete their company daily wolf documents"
ON storage.objects FOR DELETE USING (
  bucket_id = 'daily-wolf-documents' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- 4. rainy-day-documents: company-scoped (path: company_id/season/date-timestamp-filename)
DROP POLICY IF EXISTS "Users can upload rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can view rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their company rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their company rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company rainy day documents" ON storage.objects;

CREATE POLICY "Users can view their company rainy day documents"
ON storage.objects FOR SELECT USING (
  bucket_id = 'rainy-day-documents' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Users can upload their company rainy day documents"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'rainy-day-documents' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Users can update their company rainy day documents"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'rainy-day-documents' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Users can delete their company rainy day documents"
ON storage.objects FOR DELETE USING (
  bucket_id = 'rainy-day-documents' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- 5. division-schedules: company-scoped (path: company_id/division_id/date-timestamp.ext)
DROP POLICY IF EXISTS "Authenticated users can view division schedules from their company" ON storage.objects;
DROP POLICY IF EXISTS "Admins and staff can upload division schedules" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete division schedules" ON storage.objects;

CREATE POLICY "Authenticated users can view division schedules from their company"
ON storage.objects FOR SELECT USING (
  bucket_id = 'division-schedules' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
CREATE POLICY "Admins and staff can upload division schedules"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'division-schedules' AND auth.role() = 'authenticated'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "Admins can delete division schedules"
ON storage.objects FOR DELETE USING (
  bucket_id = 'division-schedules' AND auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 6. trip-attachments: path user_id/trip_id/file (upload allowed for authenticated; select by company via trip)
DROP POLICY IF EXISTS "Anyone can view trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their company trip attachments" ON storage.objects;

CREATE POLICY "Users can view their company trip attachments"
ON storage.objects FOR SELECT USING (
  bucket_id = 'trip-attachments' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
-- Allow path userId/tripId/file so first folder can be user id (web uses this)
CREATE POLICY "Authenticated users can upload trip attachments"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'trip-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own trip attachments"
ON storage.objects FOR UPDATE USING (bucket_id = 'trip-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own trip attachments"
ON storage.objects FOR DELETE USING (bucket_id = 'trip-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
