-- Ensure messaging/group flow tables and policies exist for mobile parity

-- 1) Messages threading + group link columns
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS parent_message_id uuid,
  ADD COLUMN IF NOT EXISTS group_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_parent_message_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_parent_message_id_fkey
      FOREIGN KEY (parent_message_id) REFERENCES public.messages(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON public.messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id) WHERE group_id IS NOT NULL;

-- 2) Group conversations tables
CREATE TABLE IF NOT EXISTS public.message_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.message_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.message_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.message_group_members(group_id);

CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.message_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_message_id uuid REFERENCES public.group_messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_parent ON public.group_messages(parent_message_id);

-- Add FK from messages.group_id -> message_groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_group_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES public.message_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_message_groups_updated_at ON public.message_groups;
CREATE TRIGGER update_message_groups_updated_at
BEFORE UPDATE ON public.message_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) RLS
ALTER TABLE public.message_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.message_groups;
CREATE POLICY "Users can view groups they belong to"
ON public.message_groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.message_group_members mgm
    WHERE mgm.group_id = message_groups.id
      AND mgm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can create groups in their company" ON public.message_groups;
CREATE POLICY "Authenticated users can create groups in their company"
ON public.message_groups FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = message_groups.company_id
  )
);

DROP POLICY IF EXISTS "Group creator can update group" ON public.message_groups;
CREATE POLICY "Group creator can update group"
ON public.message_groups FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Group creator can delete group" ON public.message_groups;
CREATE POLICY "Group creator can delete group"
ON public.message_groups FOR DELETE
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Members can view group memberships" ON public.message_group_members;
CREATE POLICY "Members can view group memberships"
ON public.message_group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.message_group_members self
    WHERE self.group_id = message_group_members.group_id
      AND self.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Group creator can add members" ON public.message_group_members;
CREATE POLICY "Group creator can add members"
ON public.message_group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.message_groups mg
    WHERE mg.id = message_group_members.group_id
      AND mg.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Group creator or self can remove members" ON public.message_group_members;
CREATE POLICY "Group creator or self can remove members"
ON public.message_group_members FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.message_groups mg
    WHERE mg.id = message_group_members.group_id
      AND mg.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;
CREATE POLICY "Members can view group messages"
ON public.group_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.message_group_members mgm
    WHERE mgm.group_id = group_messages.group_id
      AND mgm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;
CREATE POLICY "Members can send group messages"
ON public.group_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.message_group_members mgm
    WHERE mgm.group_id = group_messages.group_id
      AND mgm.user_id = auth.uid()
  )
);
