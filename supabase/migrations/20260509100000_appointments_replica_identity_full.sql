-- Realtime `postgres_changes` with `filter: company_id=eq....` needs full row replicas.
-- With DEFAULT replica identity, DELETE sends only PK columns, so the filter never matches
-- and other clients (e.g. web after a mobile delete) do not refetch.
ALTER TABLE IF EXISTS public.appointments REPLICA IDENTITY FULL;
