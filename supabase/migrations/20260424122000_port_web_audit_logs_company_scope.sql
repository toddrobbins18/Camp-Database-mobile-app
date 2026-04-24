-- Port of web migration 20260129152737_99d012a2-... (tyler-hill).
-- Adds company_id multi-tenant isolation to audit_logs and refreshes the
-- log_audit() trigger function to capture company_id from the changed row.
--
-- Mobile already has audit_logs (20251017163212_...); this migration only
-- adds the company_id column + company-scoped admin SELECT policy +
-- updated log_audit() body. All DDL is idempotent.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company
  ON public.audit_logs(company_id);

-- Replace the (loose) "Admins can view audit logs" policy with a
-- company-scoped one matching web.
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs from their company" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs from their company"
ON public.audit_logs
FOR SELECT
USING (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND company_id = public.get_user_company(auth.uid())
  )
  OR public.is_super_admin(auth.uid())
);

-- Refresh log_audit() so INSERT/UPDATE/DELETE triggers capture company_id.
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_company_id uuid;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN
      source_company_id := OLD.company_id;
    ELSE
      source_company_id := NEW.company_id;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    source_company_id := NULL;
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
END;
$$;
