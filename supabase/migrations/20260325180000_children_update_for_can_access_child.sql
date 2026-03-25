-- Division-scoped and health-center users could SELECT children (via "Users can view children from their company")
-- but only admin/staff had UPDATE. RFID assign / profile edits then failed with 0 rows updated and no visible error.
-- Mirror web behavior: anyone who can access a child row may update it (same boundary as can_access_child()).
-- Idempotent: safe to re-run in SQL Editor (avoids ERROR 42710 policy already exists).

DROP POLICY IF EXISTS "Users can update children they can access" ON public.children;

CREATE POLICY "Users can update children they can access"
ON public.children
FOR UPDATE
TO authenticated
USING (public.can_access_child(id))
WITH CHECK (public.can_access_child(id));
