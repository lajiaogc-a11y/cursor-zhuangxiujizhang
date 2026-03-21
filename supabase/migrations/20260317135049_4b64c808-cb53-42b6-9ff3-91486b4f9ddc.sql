
-- Fix: recreate views with CASCADE to resolve dependency issue
DROP VIEW IF EXISTS public.financial_summary CASCADE;
DROP VIEW IF EXISTS public.account_balances_summary CASCADE;

CREATE OR REPLACE VIEW public.account_balances_summary AS
SELECT tenant_id, currency, account_type,
  sum(CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END) AS balance
FROM transactions
GROUP BY tenant_id, currency, account_type;

CREATE OR REPLACE VIEW public.financial_summary AS
SELECT tenant_id,
  COALESCE(sum(CASE WHEN currency = 'MYR'::currency_type THEN CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END ELSE 0 END), 0) AS total_myr,
  COALESCE(sum(CASE WHEN currency = 'CNY'::currency_type THEN CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END ELSE 0 END), 0) AS total_cny,
  COALESCE(sum(CASE WHEN currency = 'USD'::currency_type THEN CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END ELSE 0 END), 0) AS total_usd,
  COALESCE(sum(CASE WHEN currency = 'MYR'::currency_type AND account_type = 'cash'::account_type THEN CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END ELSE 0 END), 0) AS myr_cash,
  COALESCE(sum(CASE WHEN currency = 'MYR'::currency_type AND account_type = 'bank'::account_type THEN CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END ELSE 0 END), 0) AS myr_bank,
  COALESCE(sum(CASE WHEN currency = 'CNY'::currency_type AND account_type = 'cash'::account_type THEN CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END ELSE 0 END), 0) AS cny_cash,
  COALESCE(sum(CASE WHEN currency = 'CNY'::currency_type AND account_type = 'bank'::account_type THEN CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END ELSE 0 END), 0) AS cny_bank,
  COALESCE(sum(CASE WHEN currency = 'USD'::currency_type AND account_type = 'cash'::account_type THEN CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END ELSE 0 END), 0) AS usd_cash,
  COALESCE(sum(CASE WHEN currency = 'USD'::currency_type AND account_type = 'bank'::account_type THEN CASE WHEN type = 'income'::transaction_type THEN amount ELSE -amount END ELSE 0 END), 0) AS usd_bank,
  COALESCE(sum(CASE WHEN type = 'income'::transaction_type THEN amount_myr ELSE 0 END), 0) AS total_income_myr,
  COALESCE(sum(CASE WHEN type = 'expense'::transaction_type THEN amount_myr ELSE 0 END), 0) AS total_expense_myr,
  COALESCE(sum(CASE WHEN type = 'income'::transaction_type AND category_name LIKE '%股金%' THEN amount_myr ELSE 0 END), 0) AS equity_income_myr
FROM transactions
GROUP BY tenant_id;
