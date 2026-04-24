-- Backend parity hardening for mobile Supabase.
-- Scope:
-- 1) Ensure notification preference table/policies exist
-- 2) Align group messaging RLS to recursion-safe helper functions
-- 3) Align trip-attachments storage policies to company-folder scoping

-- 1) user_notification_preferences parity
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  enabled boolean DEFAULT true,
  timing_options jsonb DEFAULT '[]'::jsonb,
  delivery_methods jsonb DEFAULT '["email"]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id, notification_type)
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can manage their own notification preferences"
ON public.user_notification_preferences
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view notification preferences in their company" ON public.user_notification_preferences;
CREATE POLICY "Admins can view notification preferences in their company"
ON public.user_notification_preferences
FOR SELECT
USING (
  (company_id = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
  OR public.is_super_admin(auth.uid())
);

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Recursion-safe message group helpers/policies
CREATE OR REPLACE FUNCTION public.get_user_group_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(ARRAY_AGG(group_id), ARRAY[]::uuid[])
  FROM public.message_group_members
  WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.message_groups
    WHERE id = _group_id AND created_by = _user_id
  )
$$;

DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.message_groups;
CREATE POLICY "Users can view groups they belong to"
ON public.message_groups
FOR SELECT
USING (
  id = ANY(public.get_user_group_ids(auth.uid()))
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Members can view group memberships" ON public.message_group_members;
DROP POLICY IF EXISTS "Members can view group membership" ON public.message_group_members;
CREATE POLICY "Members can view group membership"
ON public.message_group_members
FOR SELECT
USING (group_id = ANY(public.get_user_group_ids(auth.uid())));

DROP POLICY IF EXISTS "Group creator can add members" ON public.message_group_members;
CREATE POLICY "Group creator can add members"
ON public.message_group_members
FOR INSERT
WITH CHECK (public.is_group_creator(auth.uid(), group_id));

DROP POLICY IF EXISTS "Group creator or self can remove members" ON public.message_group_members;
CREATE POLICY "Group creator or self can remove members"
ON public.message_group_members
FOR DELETE
USING (user_id = auth.uid() OR public.is_group_creator(auth.uid(), group_id));

DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;
CREATE POLICY "Members can view group messages"
ON public.group_messages
FOR SELECT
USING (group_id = ANY(public.get_user_group_ids(auth.uid())));

DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;
DROP POLICY IF EXISTS "Members can post to their groups" ON public.group_messages;
CREATE POLICY "Members can post to their groups"
ON public.group_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND group_id = ANY(public.get_user_group_ids(auth.uid()))
);

-- 3) Trip attachments storage company-folder policy alignment
DROP POLICY IF EXISTS "Users can view their company trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their company trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company trip attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view trip attachments" ON storage.objects;

CREATE POLICY "Users can view their company trip attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'trip-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can upload their company trip attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'trip-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company trip attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'trip-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company trip attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'trip-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
  )
);
