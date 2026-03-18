-- =============================================================================
-- SYNC SCHEMA FROM LOVABLE (main app) TO MOBILE SUPABASE
-- Run in Supabase SQL Editor after run_in_sql_editor.sql.
-- Idempotent where possible (safe to re-run). Requires: app_role, get_user_company(),
-- is_super_admin(), has_role(), get_user_divisions(), update_updated_at_column().
-- =============================================================================

-- ##############################################################################
-- 1. division_permissions: unique on (user_id, division_id)
-- ##############################################################################
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'division_permissions_user_division_unique'
  ) THEN
    ALTER TABLE public.division_permissions
    ADD CONSTRAINT division_permissions_user_division_unique UNIQUE (user_id, division_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ##############################################################################
-- 2. profiles: drop overly permissive policy
-- ##############################################################################
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- ##############################################################################
-- 3. profile-photos bucket + storage (authenticated read, then company-scoped)
-- ##############################################################################
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view profile photos" ON storage.objects;
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

-- ##############################################################################
-- 4. staff_days_off: extra columns
-- ##############################################################################
ALTER TABLE public.staff_days_off
  ADD COLUMN IF NOT EXISTS late_override BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS late_override_approved_at TIMESTAMP WITH TIME ZONE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_days_off' AND column_name='late_override_approved_by') THEN
    ALTER TABLE public.staff_days_off ADD COLUMN late_override_approved_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_days_off' AND column_name='checked_out_by') THEN
    ALTER TABLE public.staff_days_off ADD COLUMN checked_out_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_days_off' AND column_name='checked_in_by') THEN
    ALTER TABLE public.staff_days_off ADD COLUMN checked_in_by UUID REFERENCES auth.users(id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ##############################################################################
-- 5. audit_logs: company_id + RLS + log_audit
-- ##############################################################################
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs(company_id);

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs from their company" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs from their company"
ON public.audit_logs FOR SELECT USING (
  (public.has_role(auth.uid(), 'admin'::app_role) AND company_id = public.get_user_company(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE source_company_id uuid;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN source_company_id := OLD.company_id;
    ELSE source_company_id := NEW.company_id; END IF;
  EXCEPTION WHEN undefined_column THEN source_company_id := NULL;
  END;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, table_name, record_id, action, old_data, new_data, company_id)
    VALUES (auth.uid(), TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), NULL, source_company_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, table_name, record_id, action, old_data, new_data, company_id)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), source_company_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, table_name, record_id, action, old_data, new_data, company_id)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, NULL, row_to_json(NEW), source_company_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END; $$;

-- ##############################################################################
-- 6. Storage: company-scoped daily-wolf and rainy-day
-- ##############################################################################
DROP POLICY IF EXISTS "Company members can view daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can update daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can delete daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can view rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can update rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can delete rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their company daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their company daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company daily wolf documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their company rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their company rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company rainy day documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company rainy day documents" ON storage.objects;

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

-- ##############################################################################
-- 7. division_schedules table + bucket
-- ##############################################################################
CREATE TABLE IF NOT EXISTS public.division_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  season TEXT NOT NULL DEFAULT '2026',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.division_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view division schedules from their company" ON public.division_schedules;
CREATE POLICY "Users can view division schedules from their company"
ON public.division_schedules FOR SELECT
USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage division schedules for their company" ON public.division_schedules;
CREATE POLICY "Admins can manage division schedules for their company"
ON public.division_schedules FOR ALL
USING (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)))
WITH CHECK (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)));
CREATE INDEX IF NOT EXISTS idx_division_schedules_company_date ON public.division_schedules(company_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_division_schedules_division ON public.division_schedules(division_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('division-schedules', 'division-schedules', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Authenticated users can view division schedules from their company" ON storage.objects;
CREATE POLICY "Authenticated users can view division schedules from their company"
ON storage.objects FOR SELECT USING (
  bucket_id = 'division-schedules' AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);
DROP POLICY IF EXISTS "Admins and staff can upload division schedules" ON storage.objects;
CREATE POLICY "Admins and staff can upload division schedules"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'division-schedules' AND auth.role() = 'authenticated'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
DROP POLICY IF EXISTS "Admins can delete division schedules" ON storage.objects;
CREATE POLICY "Admins can delete division schedules"
ON storage.objects FOR DELETE USING (
  bucket_id = 'division-schedules' AND auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- ##############################################################################
-- 8. staff person_id
-- ##############################################################################
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff' AND column_name='person_id') THEN
    ALTER TABLE public.staff ADD COLUMN person_id TEXT;
    CREATE INDEX idx_staff_person_id ON public.staff(person_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ##############################################################################
-- 9. kanban_notes table
-- ##############################################################################
CREATE TABLE IF NOT EXISTS public.kanban_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  column_status TEXT NOT NULL DEFAULT 'todo' CHECK (column_status IN ('todo', 'in_progress', 'done')),
  title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  season TEXT NOT NULL DEFAULT '2026'
);
ALTER TABLE public.kanban_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view kanban notes from their company" ON public.kanban_notes;
CREATE POLICY "Users can view kanban notes from their company"
ON public.kanban_notes FOR SELECT
USING ((company_id = public.get_user_company(auth.uid())) OR public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins and staff can manage kanban notes for their company" ON public.kanban_notes;
CREATE POLICY "Admins and staff can manage kanban notes for their company"
ON public.kanban_notes FOR ALL
USING ((company_id = public.get_user_company(auth.uid())) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)));
DROP TRIGGER IF EXISTS update_kanban_notes_updated_at ON public.kanban_notes;
CREATE TRIGGER update_kanban_notes_updated_at BEFORE UPDATE ON public.kanban_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ##############################################################################
-- 10. trip_attachments table + bucket
-- ##############################################################################
CREATE TABLE IF NOT EXISTS public.trip_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.trip_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view trip attachments from their company" ON public.trip_attachments;
CREATE POLICY "Users can view trip attachments from their company"
ON public.trip_attachments FOR SELECT
USING ((company_id = public.get_user_company(auth.uid())) OR public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins and staff can manage trip attachments for their company" ON public.trip_attachments;
CREATE POLICY "Admins and staff can manage trip attachments for their company"
ON public.trip_attachments FOR ALL
USING ((company_id = public.get_user_company(auth.uid())) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)));
CREATE INDEX IF NOT EXISTS idx_trip_attachments_trip_id ON public.trip_attachments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_attachments_company_id ON public.trip_attachments(company_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('trip-attachments', 'trip-attachments', false) ON CONFLICT (id) DO UPDATE SET public = false;
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
CREATE POLICY "Authenticated users can upload trip attachments"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'trip-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own trip attachments"
ON storage.objects FOR UPDATE USING (bucket_id = 'trip-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own trip attachments"
ON storage.objects FOR DELETE USING (bucket_id = 'trip-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ##############################################################################
-- 11. user_notification_preferences table
-- ##############################################################################
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  enabled boolean DEFAULT true,
  timing_options jsonb DEFAULT '[]'::jsonb,
  delivery_methods jsonb DEFAULT '["email"]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, company_id, notification_type)
);
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can manage their own notification preferences"
ON public.user_notification_preferences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view notification preferences in their company" ON public.user_notification_preferences;
CREATE POLICY "Admins can view notification preferences in their company"
ON public.user_notification_preferences FOR SELECT USING (
  (company_id = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role)) OR public.is_super_admin(auth.uid())
);
DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ##############################################################################
-- 12. staff division_id (if missing)
-- ##############################################################################
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff' AND column_name='division_id') THEN
    ALTER TABLE public.staff ADD COLUMN division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL;
    CREATE INDEX idx_staff_division_id ON public.staff(division_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ##############################################################################
-- 13. staff_leader_assignments table
-- ##############################################################################
CREATE TABLE IF NOT EXISTS public.staff_leader_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, leader_id, company_id, season)
);
ALTER TABLE public.staff_leader_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view leader assignments for their company" ON public.staff_leader_assignments;
CREATE POLICY "Users can view leader assignments for their company"
ON public.staff_leader_assignments FOR SELECT USING (
  company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage leader assignments" ON public.staff_leader_assignments;
CREATE POLICY "Admins can manage leader assignments"
ON public.staff_leader_assignments FOR ALL USING (
  company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
);
INSERT INTO public.staff_leader_assignments (staff_id, leader_id, company_id, season)
SELECT s.id, s.leader_id, s.company_id, s.season
FROM public.staff s
WHERE s.leader_id IS NOT NULL AND s.company_id IS NOT NULL AND s.season IS NOT NULL
ON CONFLICT (staff_id, leader_id, company_id, season) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_staff_leader_assignments_staff ON public.staff_leader_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_leader_assignments_leader ON public.staff_leader_assignments(leader_id);
CREATE INDEX IF NOT EXISTS idx_staff_leader_assignments_company_season ON public.staff_leader_assignments(company_id, season);

-- ##############################################################################
-- 14. messages: parent_message_id, group_id (columns + indexes)
-- ##############################################################################
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS group_id uuid;
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON public.messages(parent_message_id);

-- ##############################################################################
-- 15. message_groups, message_group_members, group_messages
-- ##############################################################################
CREATE TABLE IF NOT EXISTS public.message_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.message_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.message_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.message_group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.message_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  parent_message_id uuid REFERENCES public.group_messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_parent ON public.group_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.message_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.message_group_members(group_id);

-- Helper functions (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_group_ids(_user_id uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT COALESCE(ARRAY_AGG(group_id), ARRAY[]::uuid[]) FROM public.message_group_members WHERE user_id = _user_id
$$;
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT EXISTS (SELECT 1 FROM public.message_groups WHERE id = _group_id AND created_by = _user_id)
$$;

DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.message_groups;
CREATE POLICY "Users can view groups they belong to"
ON public.message_groups FOR SELECT USING (
  id = ANY(public.get_user_group_ids(auth.uid())) OR created_by = auth.uid()
);
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.message_groups;
CREATE POLICY "Authenticated users can create groups"
ON public.message_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Group creator can update group" ON public.message_groups;
CREATE POLICY "Group creator can update group"
ON public.message_groups FOR UPDATE USING (created_by = auth.uid());
DROP POLICY IF EXISTS "Group creator can delete group" ON public.message_groups;
CREATE POLICY "Group creator can delete group"
ON public.message_groups FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Members can view group membership" ON public.message_group_members;
CREATE POLICY "Members can view group membership"
ON public.message_group_members FOR SELECT USING (group_id = ANY(public.get_user_group_ids(auth.uid())));
DROP POLICY IF EXISTS "Group creator can add members" ON public.message_group_members;
CREATE POLICY "Group creator can add members"
ON public.message_group_members FOR INSERT WITH CHECK (public.is_group_creator(auth.uid(), group_id));
DROP POLICY IF EXISTS "Group creator or self can remove members" ON public.message_group_members;
CREATE POLICY "Group creator or self can remove members"
ON public.message_group_members FOR DELETE USING (
  user_id = auth.uid() OR public.is_group_creator(auth.uid(), group_id)
);

DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;
CREATE POLICY "Members can view group messages"
ON public.group_messages FOR SELECT USING (group_id = ANY(public.get_user_group_ids(auth.uid())));
DROP POLICY IF EXISTS "Members can post to their groups" ON public.group_messages;
CREATE POLICY "Members can post to their groups"
ON public.group_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND group_id = ANY(public.get_user_group_ids(auth.uid()))
);

DROP TRIGGER IF EXISTS update_message_groups_updated_at ON public.message_groups;
CREATE TRIGGER update_message_groups_updated_at
BEFORE UPDATE ON public.message_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- messages.group_id FK (after message_groups exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_group_id_fkey' AND table_name = 'messages') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.message_groups(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id) WHERE group_id IS NOT NULL;

-- ##############################################################################
-- 16. can_access_child() + children + daily_notes, awards, etc. SELECT policies
-- ##############################################################################
CREATE OR REPLACE FUNCTION public.can_access_child(_child_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = _child_id
      AND c.company_id = public.get_user_company(auth.uid())
      AND (
        public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'health_center'::app_role)
        OR (
          (public.has_role(auth.uid(), 'division_leader'::app_role) OR public.has_role(auth.uid(), 'specialist'::app_role) OR public.has_role(auth.uid(), 'viewer'::app_role))
          AND c.division_id = ANY(public.get_user_divisions(auth.uid()))
        )
      )
  )
$$;

DROP POLICY IF EXISTS "Staff can view children from their company" ON public.children;
DROP POLICY IF EXISTS "Users can view children from their company" ON public.children;
CREATE POLICY "Users can view children from their company"
ON public.children FOR SELECT USING (
  (company_id = public.get_user_company(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR (
      (public.has_role(auth.uid(), 'division_leader'::app_role) OR public.has_role(auth.uid(), 'specialist'::app_role) OR public.has_role(auth.uid(), 'viewer'::app_role))
      AND division_id = ANY(public.get_user_divisions(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can view daily notes from their company" ON public.daily_notes;
CREATE POLICY "Users can view daily notes from their company"
ON public.daily_notes FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR (child_id IS NOT NULL AND public.can_access_child(child_id))
  ))
);

DROP POLICY IF EXISTS "Users can view awards from their company" ON public.awards;
CREATE POLICY "Users can view awards from their company"
ON public.awards FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR (child_id IS NOT NULL AND public.can_access_child(child_id))
  ))
);

DROP POLICY IF EXISTS "Users can view camper reports from their company" ON public.camper_reports;
CREATE POLICY "Users can view camper reports from their company"
ON public.camper_reports FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.can_access_child(child_id)
  ))
);

DROP POLICY IF EXISTS "Users can view appointments for their company" ON public.appointments;
CREATE POLICY "Users can view appointments for their company"
ON public.appointments FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'health_center'::app_role)
    OR (child_id IS NOT NULL AND public.can_access_child(child_id))
  ))
);

DROP POLICY IF EXISTS "Users can view sports academy from their company" ON public.sports_academy;
CREATE POLICY "Users can view sports academy from their company"
ON public.sports_academy FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'specialist'::app_role)
    OR (child_id IS NOT NULL AND public.can_access_child(child_id))
  ))
);

DROP POLICY IF EXISTS "Users can view tutoring therapy from their company" ON public.tutoring_therapy;
CREATE POLICY "Users can view tutoring therapy from their company"
ON public.tutoring_therapy FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'specialist'::app_role)
    OR (child_id IS NOT NULL AND public.can_access_child(child_id))
  ))
);

DROP POLICY IF EXISTS "Users can view trip attendees from their company" ON public.trip_attendees;
CREATE POLICY "Users can view trip attendees from their company"
ON public.trip_attendees FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.can_access_child(child_id)
  ))
);

DROP POLICY IF EXISTS "Users can view sports event roster from their company" ON public.sports_event_roster;
CREATE POLICY "Users can view sports event roster from their company"
ON public.sports_event_roster FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'specialist'::app_role)
    OR public.can_access_child(child_id)
  ))
);

-- ##############################################################################
-- 17. role_permissions: specialist-sport-assignments, notification-preferences, full matrix
-- ##############################################################################
INSERT INTO public.role_permissions (company_id, role, menu_item, can_access)
SELECT DISTINCT company_id, role, 'specialist-sport-assignments',
  CASE WHEN role IN ('admin'::app_role, 'super_admin'::app_role) THEN true ELSE false END
FROM public.role_permissions
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp2
  WHERE rp2.company_id = role_permissions.company_id AND rp2.role = role_permissions.role AND rp2.menu_item = 'specialist-sport-assignments'
)
ON CONFLICT (company_id, role, menu_item) DO NOTHING;

INSERT INTO public.role_permissions (company_id, role, menu_item, can_access)
SELECT DISTINCT company_id, role, 'notification-preferences', true
FROM public.role_permissions
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp2
  WHERE rp2.company_id = role_permissions.company_id AND rp2.role = role_permissions.role AND rp2.menu_item = 'notification-preferences'
)
ON CONFLICT (company_id, role, menu_item) DO NOTHING;

WITH all_menu_items AS (
  SELECT unnest(ARRAY[
    'activities', 'admin', 'appointments', 'athletics', 'awards', 'calendar',
    'daily-schedule', 'daily-wolf-management', 'daily-wolf-printable', 'dashboard',
    'division-permissions', 'evaluation-questions', 'incidents', 'menu', 'messages',
    'notes', 'notification-preferences', 'nurse', 'od-management', 'rainy-day',
    'reports', 'role-permissions', 'roster', 'roster-templates', 'special-events',
    'special-meals', 'specialist-sport-assignments', 'sports-academy', 'sports-calendar',
    'staff', 'transportation', 'tutoring-therapy', 'user-approvals'
  ]) AS menu_item
),
all_roles AS (
  SELECT unnest(ARRAY['admin', 'staff', 'viewer', 'division_leader', 'specialist', 'super_admin', 'health_center']::app_role[]) AS role
),
all_companies AS (SELECT id AS company_id FROM public.companies WHERE is_active = true),
full_matrix AS (
  SELECT c.company_id, r.role, m.menu_item,
    CASE
      WHEN m.menu_item IN ('admin', 'role-permissions', 'division-permissions', 'evaluation-questions', 'user-approvals', 'specialist-sport-assignments')
           AND r.role IN ('admin'::app_role, 'super_admin'::app_role) THEN true
      WHEN m.menu_item IN ('dashboard', 'roster', 'staff', 'calendar', 'menu', 'messages', 'activities', 'athletics', 'sports-calendar', 'transportation',
                           'notes', 'awards', 'incidents', 'nurse', 'sports-academy', 'rainy-day', 'special-events', 'tutoring-therapy', 'roster-templates',
                           'od-management', 'appointments', 'daily-schedule', 'reports', 'daily-wolf-printable', 'daily-wolf-management', 'special-meals', 'notification-preferences')
           AND r.role IN ('admin'::app_role, 'super_admin'::app_role, 'staff'::app_role) THEN true
      WHEN m.menu_item IN ('nurse', 'appointments', 'od-management') AND r.role = 'health_center'::app_role THEN true
      WHEN m.menu_item IN ('dashboard', 'roster', 'calendar', 'menu', 'athletics', 'sports-calendar', 'activities', 'special-events', 'awards', 'notification-preferences')
           AND r.role IN ('division_leader'::app_role, 'specialist'::app_role, 'viewer'::app_role) THEN true
      ELSE false
    END AS can_access
  FROM all_companies c CROSS JOIN all_roles r CROSS JOIN all_menu_items m
)
INSERT INTO public.role_permissions (company_id, role, menu_item, can_access)
SELECT fm.company_id, fm.role, fm.menu_item, fm.can_access
FROM full_matrix fm
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.company_id = fm.company_id AND rp.role = fm.role AND rp.menu_item = fm.menu_item
)
ON CONFLICT (company_id, role, menu_item) DO NOTHING;

-- ##############################################################################
-- 18. automated_email_config: toothfairy + specific_recipient_id
-- ##############################################################################
INSERT INTO public.automated_email_config (company_id, email_type, recipient_tags, enabled, send_timing)
SELECT c.id, 'toothfairy', ARRAY['nurse']::text[], true, ARRAY['on_create']::text[]
FROM public.companies c
WHERE NOT EXISTS (SELECT 1 FROM public.automated_email_config aec WHERE aec.company_id = c.id AND aec.email_type = 'toothfairy');

ALTER TABLE public.automated_email_config ADD COLUMN IF NOT EXISTS specific_recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
