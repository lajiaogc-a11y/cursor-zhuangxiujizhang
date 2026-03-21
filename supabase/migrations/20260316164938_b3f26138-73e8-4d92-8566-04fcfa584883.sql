
-- =============================================
-- Accounting Period Locking
-- =============================================

-- 1. Create accounting_periods table
CREATE TABLE public.accounting_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  period_year integer NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by uuid,
  closed_at timestamptz,
  reopened_by uuid,
  reopened_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period_year, period_month)
);

-- 2. Enable RLS
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Tenant members can view periods"
  ON public.accounting_periods FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins can manage periods"
  ON public.accounting_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND public.is_admin_or_accountant(auth.uid())
  );

CREATE POLICY "Admins can update periods"
  ON public.accounting_periods FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND public.is_admin_or_accountant(auth.uid())
  );

-- 4. Updated_at trigger
CREATE TRIGGER update_accounting_periods_updated_at
  BEFORE UPDATE ON public.accounting_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper function to check if a period is locked
CREATE OR REPLACE FUNCTION public.is_period_locked(_tenant_id uuid, _date date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_periods
    WHERE tenant_id = _tenant_id
      AND period_year = EXTRACT(YEAR FROM _date)::integer
      AND period_month = EXTRACT(MONTH FROM _date)::integer
      AND status = 'closed'
  );
$$;

-- 6. Validation trigger: block INSERT/UPDATE/DELETE on transactions in closed periods
CREATE OR REPLACE FUNCTION public.validate_transaction_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  check_date date;
  check_tenant uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    check_date := OLD.transaction_date;
    check_tenant := OLD.tenant_id;
  ELSE
    check_date := NEW.transaction_date;
    check_tenant := NEW.tenant_id;
  END IF;

  IF check_tenant IS NOT NULL AND check_date IS NOT NULL
     AND public.is_period_locked(check_tenant, check_date) THEN
    RAISE EXCEPTION '该会计期间已关闭，无法修改数据 (Period % is closed)',
      to_char(check_date, 'YYYY-MM');
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.transaction_date IS DISTINCT FROM NEW.transaction_date THEN
    IF OLD.tenant_id IS NOT NULL AND public.is_period_locked(OLD.tenant_id, OLD.transaction_date) THEN
      RAISE EXCEPTION '原交易日期所在会计期间已关闭，无法修改 (Period % is closed)',
        to_char(OLD.transaction_date, 'YYYY-MM');
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER validate_transaction_period_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_period();

-- 7. Also protect exchange_transactions
CREATE TRIGGER validate_exchange_period_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.exchange_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_period();

-- 8. Protect payable_payments
CREATE OR REPLACE FUNCTION public.validate_payment_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  check_date date;
  check_tenant uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    check_date := OLD.payment_date;
    check_tenant := OLD.tenant_id;
  ELSE
    check_date := NEW.payment_date;
    check_tenant := NEW.tenant_id;
  END IF;

  IF check_tenant IS NOT NULL AND check_date IS NOT NULL
     AND public.is_period_locked(check_tenant, check_date) THEN
    RAISE EXCEPTION '该会计期间已关闭，无法修改数据 (Period % is closed)',
      to_char(check_date, 'YYYY-MM');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER validate_payable_payment_period_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.payable_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_period();

-- 9. Protect salary_payments
CREATE TRIGGER validate_salary_payment_period_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.salary_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_period();

-- 10. Protect salary_advances
CREATE OR REPLACE FUNCTION public.validate_advance_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  check_date date;
  check_tenant uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    check_date := OLD.advance_date;
    check_tenant := OLD.tenant_id;
  ELSE
    check_date := NEW.advance_date;
    check_tenant := NEW.tenant_id;
  END IF;

  IF check_tenant IS NOT NULL AND check_date IS NOT NULL
     AND public.is_period_locked(check_tenant, check_date) THEN
    RAISE EXCEPTION '该会计期间已关闭，无法修改数据 (Period % is closed)',
      to_char(check_date, 'YYYY-MM');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER validate_advance_period_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.salary_advances
  FOR EACH ROW EXECUTE FUNCTION public.validate_advance_period();

-- 11. Audit trigger
CREATE TRIGGER audit_accounting_periods
  AFTER INSERT OR UPDATE OR DELETE ON public.accounting_periods
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
