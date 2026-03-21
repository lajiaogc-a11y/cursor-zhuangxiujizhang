-- 1. 创建账户余额汇总视图
CREATE OR REPLACE VIEW public.account_balances_summary AS
SELECT 
  currency,
  account_type,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
FROM public.transactions
GROUP BY currency, account_type;

-- 2. 创建财务统计视图（按币种和账户类型汇总）
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT 
  -- 各币种各账户余额
  COALESCE((SELECT SUM(balance) FROM public.account_balances_summary WHERE currency = 'MYR'), 0) as total_myr,
  COALESCE((SELECT SUM(balance) FROM public.account_balances_summary WHERE currency = 'CNY'), 0) as total_cny,
  COALESCE((SELECT SUM(balance) FROM public.account_balances_summary WHERE currency = 'USD'), 0) as total_usd,
  
  -- MYR 明细
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'MYR' AND account_type = 'cash'), 0) as myr_cash,
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'MYR' AND account_type = 'bank'), 0) as myr_bank,
  
  -- CNY 明细
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'CNY' AND account_type = 'cash'), 0) as cny_cash,
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'CNY' AND account_type = 'bank'), 0) as cny_bank,
  
  -- USD 明细
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'USD' AND account_type = 'cash'), 0) as usd_cash,
  COALESCE((SELECT balance FROM public.account_balances_summary WHERE currency = 'USD' AND account_type = 'bank'), 0) as usd_bank,
  
  -- 收支总额（马币）
  COALESCE((SELECT SUM(amount_myr) FROM public.transactions WHERE type = 'income'), 0) as total_income_myr,
  COALESCE((SELECT SUM(amount_myr) FROM public.transactions WHERE type = 'expense'), 0) as total_expense_myr,
  
  -- 股金收入（假设类目包含"股金"）
  COALESCE((SELECT SUM(amount_myr) FROM public.transactions WHERE type = 'income' AND category_name LIKE '%股金%'), 0) as equity_income_myr;

-- 3. 创建交易列表视图（包含创建者名称和项目信息）
CREATE OR REPLACE VIEW public.transactions_with_details AS
SELECT 
  t.*,
  p.display_name as creator_name,
  proj.project_code,
  proj.project_name
FROM public.transactions t
LEFT JOIN public.profiles p ON t.created_by = p.user_id
LEFT JOIN public.projects proj ON t.project_id = proj.id
ORDER BY t.transaction_date DESC, t.sequence_no DESC;

-- 4. 创建获取交易总数的函数（用于分页）
CREATE OR REPLACE FUNCTION public.get_transactions_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.transactions;
$$;