-- OwlPay core schema (ported from lovable-web-app)
-- Safe/idempotent creation for mobile environment

ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS owl_pay_balance numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.owl_pay_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'snacks',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.owl_pay_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view owl pay items from their company" ON public.owl_pay_items;
CREATE POLICY "Users can view owl pay items from their company"
  ON public.owl_pay_items FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage owl pay items" ON public.owl_pay_items;
CREATE POLICY "Admins can manage owl pay items"
  ON public.owl_pay_items FOR ALL TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  );

CREATE TABLE IF NOT EXISTS public.owl_pay_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.children(id) ON DELETE SET NULL,
  item_id uuid REFERENCES public.owl_pay_items(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  transaction_type text NOT NULL DEFAULT 'purchase',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.owl_pay_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view owl pay transactions from their company" ON public.owl_pay_transactions;
CREATE POLICY "Users can view owl pay transactions from their company"
  ON public.owl_pay_transactions FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and staff can manage owl pay transactions" ON public.owl_pay_transactions;
CREATE POLICY "Admins and staff can manage owl pay transactions"
  ON public.owl_pay_transactions FOR ALL TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  );

CREATE TABLE IF NOT EXISTS public.owl_pay_daily_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  scan_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (company_id, child_id, scan_date)
);

ALTER TABLE public.owl_pay_daily_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view daily scans from their company" ON public.owl_pay_daily_scans;
CREATE POLICY "Users can view daily scans from their company"
  ON public.owl_pay_daily_scans FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and staff can manage daily scans" ON public.owl_pay_daily_scans;
CREATE POLICY "Admins and staff can manage daily scans"
  ON public.owl_pay_daily_scans FOR ALL TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  );

CREATE TABLE IF NOT EXISTS public.owl_pay_email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  low_balance_alerts_enabled boolean NOT NULL DEFAULT false,
  low_balance_threshold numeric NOT NULL DEFAULT 5.00,
  low_balance_recipient_email text,
  staff_purchase_reports_enabled boolean NOT NULL DEFAULT false,
  staff_report_frequency text NOT NULL DEFAULT 'daily',
  staff_report_recipient_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE public.owl_pay_email_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company config" ON public.owl_pay_email_config;
CREATE POLICY "Users can view own company config"
  ON public.owl_pay_email_config FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage config" ON public.owl_pay_email_config;
CREATE POLICY "Admins can manage config"
  ON public.owl_pay_email_config FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.campminder_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  cm_transaction_id text NOT NULL,
  person_id text NOT NULL,
  amount numeric NOT NULL,
  transaction_type text NOT NULL DEFAULT 'deposit',
  synced_at timestamptz DEFAULT now(),
  UNIQUE (company_id, cm_transaction_id)
);

ALTER TABLE public.campminder_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view own company transactions" ON public.campminder_transactions;
CREATE POLICY "Authenticated users can view own company transactions"
  ON public.campminder_transactions FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE OR REPLACE FUNCTION public.increment_camper_balance(
  _child_id uuid,
  _amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.children
  SET owl_pay_balance = owl_pay_balance + _amount,
      updated_at = now()
  WHERE id = _child_id
  RETURNING owl_pay_balance INTO new_balance;

  RETURN new_balance;
END;
$$;
