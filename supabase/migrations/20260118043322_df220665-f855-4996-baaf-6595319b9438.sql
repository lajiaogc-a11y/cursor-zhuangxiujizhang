-- 修复视图安全性：使用 security_invoker 替代 security_definer
DROP VIEW IF EXISTS public.transactions_with_details;
DROP VIEW IF EXISTS public.financial_summary;
DROP VIEW IF EXISTS public.account_balances_summary;

-- 1. 重新创建账户余额汇总视图（使用 security_invoker）
CREATE VIEW public.account_balances_summary
WITH (security_invoker=on) AS
SELECT 
  currency,
  account_type,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
FROM public.transactions
GROUP BY currency, account_type;

-- 2. 重新创建财务统计视图
CREATE VIEW public.financial_summary
WITH (security_invoker=on) AS
SELECT 
  COALESCE((SELECT SUM(balance) FROM public.account_balances_summary WHERE currency = 'MYR'), 0) as total_myr,
  COALESCE((SELECT SUM(balance) FROM public.account_balances_summary WHERE currency = 'CNY'), 0) as total_cny,
  COALESCE((SELECT SUM(balance) FROM public.account_balances_summary WHERE currency = 'USD'), 0) as total_usd,
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'MYR' AND account_type = 'cash'), 0) as myr_cash,
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'MYR' AND account_type = 'bank'), 0) as myr_bank,
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'CNY' AND account_type = 'cash'), 0) as cny_cash,
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'CNY' AND account_type = 'bank'), 0) as cny_bank,
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'USD' AND account_type = 'cash'), 0) as usd_cash,
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'USD' AND account_type = 'bank'), 0) as usd_bank,
  COALESCE((SELECT SUM(amount_myr) FROM public.transactions WHERE type = 'income'), 0) as total_income_myr,
  COALESCE((SELECT SUM(amount_myr) FROM public.transactions WHERE type = 'expense'), 0) as total_expense_myr,
  COALESCE((SELECT SUM(amount_myr) FROM public.transactions WHERE type = 'income' AND category_name LIKE '%股金%'), 0) as equity_income_myr;

-- 3. 重新创建交易明细视图
CREATE VIEW public.transactions_with_details
WITH (security_invoker=on) AS
SELECT 
  t.*,
  p.display_name as creator_name,
  proj.project_code,
  proj.project_name
FROM public.transactions t
LEFT JOIN public.profiles p ON t.created_by = p.user_id
LEFT JOIN public.projects proj ON t.project_id = proj.id;