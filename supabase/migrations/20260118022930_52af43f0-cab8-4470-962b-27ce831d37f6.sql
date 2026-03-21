-- 更新项目收入汇总触发器，使增项已收款金额也计入 total_income_myr
CREATE OR REPLACE FUNCTION public.update_project_income_summary()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  -- 更新项目的收入汇总（来自 project_payments）
  UPDATE public.projects SET
    total_income_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_payments 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0) + COALESCE((
      SELECT SUM(amount_myr) FROM public.project_additions 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND is_paid = true
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- 重新计算净利润
  UPDATE public.projects SET
    net_profit_myr = COALESCE(total_income_myr, 0) + COALESCE(total_addition_myr, 0) - COALESCE(total_expense_myr, 0)
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN NEW;
END;
$function$;

-- 创建触发器：project_payments 变更时更新收入汇总
DROP TRIGGER IF EXISTS update_project_income_on_payment ON public.project_payments;
CREATE TRIGGER update_project_income_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.project_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_income_summary();

-- 更新增项收款同步触发器，同时更新项目的 total_income_myr
CREATE OR REPLACE FUNCTION public.sync_project_addition_payment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  project_rec RECORD;
BEGIN
  -- 只在 is_paid 变化时触发
  IF TG_OP = 'UPDATE' THEN
    -- 从未收款变为已收款
    IF NEW.is_paid = true AND (OLD.is_paid = false OR OLD.is_paid IS NULL) THEN
      -- 获取项目信息
      SELECT project_code, project_name INTO project_rec
      FROM public.projects WHERE id = NEW.project_id;
      
      -- 插入收入记录到 transactions 表
      INSERT INTO public.transactions (
        transaction_date,
        type,
        ledger_type,
        category_id,
        category_name,
        summary,
        amount,
        currency,
        account_type,
        exchange_rate,
        amount_myr,
        project_id,
        remark_1,
        remark_2,
        created_by
      ) VALUES (
        CURRENT_DATE,
        'income',
        'project',
        NULL,
        '增项收款',
        NEW.description,
        NEW.amount,
        NEW.currency,
        'bank',
        NEW.exchange_rate,
        NEW.amount_myr,
        NEW.project_id,
        '增项收款',
        NEW.remark,
        NEW.created_by
      );
      
      -- 更新项目收入汇总
      UPDATE public.projects SET
        total_income_myr = COALESCE(total_income_myr, 0) + NEW.amount_myr
      WHERE id = NEW.project_id;
    END IF;
    
    -- 从已收款变为未收款
    IF NEW.is_paid = false AND OLD.is_paid = true THEN
      -- 删除对应的交易记录
      DELETE FROM public.transactions 
      WHERE project_id = NEW.project_id 
        AND remark_1 = '增项收款'
        AND summary = OLD.description
        AND amount_myr = OLD.amount_myr;
      
      -- 减去收入
      UPDATE public.projects SET
        total_income_myr = GREATEST(COALESCE(total_income_myr, 0) - OLD.amount_myr, 0)
      WHERE id = NEW.project_id;
    END IF;
  END IF;
  
  -- 重新计算净利润
  IF TG_OP = 'UPDATE' AND (NEW.is_paid != OLD.is_paid) THEN
    UPDATE public.projects SET
      net_profit_myr = COALESCE(total_income_myr, 0) + COALESCE(total_addition_myr, 0) - COALESCE(total_expense_myr, 0)
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$function$;