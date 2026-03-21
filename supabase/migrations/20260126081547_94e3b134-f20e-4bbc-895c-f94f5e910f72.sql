
-- =========================================
-- 修复：从 transactions 表重新计算项目汇总
-- 因为实际项目收支数据存储在 transactions 表中
-- =========================================

-- 从 transactions 表重新计算项目收入
UPDATE public.projects p SET
  total_income_myr = COALESCE((
    SELECT SUM(amount_myr) 
    FROM public.transactions t 
    WHERE t.project_id = p.id 
    AND t.ledger_type = 'project' 
    AND t.type = 'income'
  ), 0);

-- 从 transactions 表重新计算项目支出
UPDATE public.projects p SET
  total_expense_myr = COALESCE((
    SELECT SUM(amount_myr) 
    FROM public.transactions t 
    WHERE t.project_id = p.id 
    AND t.ledger_type = 'project' 
    AND t.type = 'expense'
  ), 0);

-- 按类别分别计算支出（从 transactions 的 category_name 推断）
UPDATE public.projects p SET
  total_material_myr = COALESCE((
    SELECT SUM(amount_myr) 
    FROM public.transactions t 
    WHERE t.project_id = p.id 
    AND t.ledger_type = 'project' 
    AND t.type = 'expense'
    AND t.category_name = '材料费'
  ), 0),
  total_labor_myr = COALESCE((
    SELECT SUM(amount_myr) 
    FROM public.transactions t 
    WHERE t.project_id = p.id 
    AND t.ledger_type = 'project' 
    AND t.type = 'expense'
    AND t.category_name = '人工费'
  ), 0),
  total_other_expense_myr = COALESCE((
    SELECT SUM(amount_myr) 
    FROM public.transactions t 
    WHERE t.project_id = p.id 
    AND t.ledger_type = 'project' 
    AND t.type = 'expense'
    AND t.category_name NOT IN ('材料费', '人工费')
  ), 0);

-- 重新计算净利润
UPDATE public.projects p SET
  net_profit_myr = COALESCE(p.total_income_myr, 0) - COALESCE(p.total_expense_myr, 0);
