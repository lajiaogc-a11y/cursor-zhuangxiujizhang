
-- ═══════════════════════════════════════════════════════════════
-- FIX 1: Remove public INSERT policy on audit_logs (prevent forgery)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "System can insert audit logs via trigger" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.audit_logs;

-- ═══════════════════════════════════════════════════════════════
-- FIX 2: Rebuild financial views with security_invoker = true
-- ═══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS public.financial_summary;
DROP VIEW IF EXISTS public.account_balances_summary;

CREATE VIEW public.account_balances_summary
WITH (security_invoker = true) AS
SELECT 
  tenant_id,
  currency,
  account_type,
  SUM(CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END) AS balance
FROM public.transactions
GROUP BY tenant_id, currency, account_type;

CREATE VIEW public.financial_summary
WITH (security_invoker = true) AS
SELECT
  tenant_id,
  COALESCE(SUM(CASE WHEN currency = 'MYR' THEN
    CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0) AS total_myr,
  COALESCE(SUM(CASE WHEN currency = 'CNY' THEN
    CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0) AS total_cny,
  COALESCE(SUM(CASE WHEN currency = 'USD' THEN
    CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0) AS total_usd,
  COALESCE(SUM(CASE WHEN currency = 'MYR' AND account_type = 'cash' THEN
    CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0) AS myr_cash,
  COALESCE(SUM(CASE WHEN currency = 'MYR' AND account_type = 'bank' THEN
    CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0) AS myr_bank,
  COALESCE(SUM(CASE WHEN currency = 'CNY' AND account_type = 'cash' THEN
    CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0) AS cny_cash,
  COALESCE(SUM(CASE WHEN currency = 'CNY' AND account_type = 'bank' THEN
    CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0) AS cny_bank,
  COALESCE(SUM(CASE WHEN currency = 'USD' AND account_type = 'cash' THEN
    CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0) AS usd_cash,
  COALESCE(SUM(CASE WHEN currency = 'USD' AND account_type = 'bank' THEN
    CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0) AS usd_bank,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount_myr ELSE 0 END), 0) AS total_income_myr,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_myr ELSE 0 END), 0) AS total_expense_myr,
  COALESCE(SUM(CASE WHEN type = 'income' AND category_name LIKE '%股金%' THEN amount_myr ELSE 0 END), 0) AS equity_income_myr
FROM public.transactions
GROUP BY tenant_id;

CREATE OR REPLACE VIEW public.transactions_with_details
WITH (security_invoker = true) AS
SELECT t.id, t.sequence_no, t.transaction_date, t.category_id, t.category_name,
  t.summary, t.type, t.amount, t.currency, t.account_type, t.exchange_rate,
  t.amount_myr, t.project_id, t.receipt_url_1, t.receipt_url_2, t.remark_1,
  t.remark_2, t.ledger_type, t.created_by, t.created_at, t.tenant_id,
  p.display_name AS creator_name, proj.project_code, proj.project_name
FROM public.transactions t
LEFT JOIN public.profiles p ON t.created_by = p.user_id
LEFT JOIN public.projects proj ON t.project_id = proj.id;

-- ═══════════════════════════════════════════════════════════════
-- FIX 3: Fix import_history RLS (remove {public} role policies)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Admin and accountant can view import history" ON public.import_history;
DROP POLICY IF EXISTS "Admin can manage import history" ON public.import_history;

CREATE POLICY "Admins can view import history"
  ON public.import_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage import history"
  ON public.import_history FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
