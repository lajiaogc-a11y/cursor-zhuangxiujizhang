
-- =========================================
-- 修复项目汇总数据重复计算问题
-- 问题根源：sync_transaction_to_project 触发器导致重复更新
-- =========================================

-- 第一步：删除导致重复计算的触发器
DROP TRIGGER IF EXISTS sync_transaction_to_project ON public.transactions;

-- 第二步：删除相关函数（已不再需要）
DROP FUNCTION IF EXISTS public.sync_transaction_to_project();

-- 第三步：修复 update_project_income_summary 函数，使其正确计算
-- 问题：原函数同时加了 project_payments 和 paid additions，但 additions 应该只计入 total_addition_myr
CREATE OR REPLACE FUNCTION public.update_project_income_summary()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 只从 project_payments 计算收入，不包含增项
  -- 增项由 update_project_additions_summary 单独处理
  UPDATE public.projects SET
    total_income_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_payments 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- 重新计算净利润 = 收入 + 增项(已收) - 支出
  -- 注意：total_addition_myr 是全部增项，但利润计算应该用已收的增项
  UPDATE public.projects SET
    net_profit_myr = COALESCE(total_income_myr, 0) + 
      COALESCE((
        SELECT SUM(amount_myr) FROM public.project_additions 
        WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND is_paid = true
      ), 0) - COALESCE(total_expense_myr, 0)
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN NEW;
END;
$function$;

-- 第四步：修复 update_project_additions_summary 函数
CREATE OR REPLACE FUNCTION public.update_project_additions_summary()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 更新全部增项金额
  UPDATE public.projects SET
    total_addition_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_additions 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- 重新计算净利润
  UPDATE public.projects SET
    net_profit_myr = COALESCE(total_income_myr, 0) + 
      COALESCE((
        SELECT SUM(amount_myr) FROM public.project_additions 
        WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND is_paid = true
      ), 0) - COALESCE(total_expense_myr, 0)
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 第五步：修复 update_project_financials 函数（项目支出汇总）
CREATE OR REPLACE FUNCTION public.update_project_financials()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 更新项目的支出汇总
  UPDATE public.projects SET
    total_material_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_expenses 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'material'
    ), 0),
    total_labor_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_expenses 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'labor'
    ), 0),
    total_other_expense_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_expenses 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'other'
    ), 0),
    total_expense_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_expenses 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- 重新计算净利润
  UPDATE public.projects SET
    net_profit_myr = COALESCE(total_income_myr, 0) + 
      COALESCE((
        SELECT SUM(amount_myr) FROM public.project_additions 
        WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND is_paid = true
      ), 0) - COALESCE(total_expense_myr, 0)
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 第六步：一次性修复所有项目的汇总数据
-- 从 project_payments 重新计算收入
UPDATE public.projects p SET
  total_income_myr = COALESCE((
    SELECT SUM(amount_myr) FROM public.project_payments pp WHERE pp.project_id = p.id
  ), 0);

-- 从 project_expenses 重新计算支出
UPDATE public.projects p SET
  total_expense_myr = COALESCE((
    SELECT SUM(amount_myr) FROM public.project_expenses pe WHERE pe.project_id = p.id
  ), 0),
  total_material_myr = COALESCE((
    SELECT SUM(amount_myr) FROM public.project_expenses pe WHERE pe.project_id = p.id AND pe.category = 'material'
  ), 0),
  total_labor_myr = COALESCE((
    SELECT SUM(amount_myr) FROM public.project_expenses pe WHERE pe.project_id = p.id AND pe.category = 'labor'
  ), 0),
  total_other_expense_myr = COALESCE((
    SELECT SUM(amount_myr) FROM public.project_expenses pe WHERE pe.project_id = p.id AND pe.category = 'other'
  ), 0);

-- 从 project_additions 重新计算增项
UPDATE public.projects p SET
  total_addition_myr = COALESCE((
    SELECT SUM(amount_myr) FROM public.project_additions pa WHERE pa.project_id = p.id
  ), 0);

-- 重新计算净利润
UPDATE public.projects p SET
  net_profit_myr = COALESCE(p.total_income_myr, 0) + 
    COALESCE((
      SELECT SUM(amount_myr) FROM public.project_additions pa 
      WHERE pa.project_id = p.id AND pa.is_paid = true
    ), 0) - COALESCE(p.total_expense_myr, 0);
