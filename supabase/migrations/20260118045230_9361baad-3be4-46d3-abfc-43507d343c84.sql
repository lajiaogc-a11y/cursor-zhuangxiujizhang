-- 1. 修复 stack depth limit exceeded 问题 - 重写触发器避免循环
-- 2. 优化 remark 字段存储格式

-- 首先删除导致循环的触发器
DROP TRIGGER IF EXISTS sync_transaction_to_project ON public.transactions;

-- 重新创建 sync_transaction_to_project 函数，避免循环调用
CREATE OR REPLACE FUNCTION public.sync_transaction_to_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 只处理有project_id且ledger_type为'project'的记录
  -- 跳过所有同步过来的记录（通过remark_1判断）
  IF NEW.project_id IS NOT NULL AND NEW.ledger_type = 'project' THEN
    -- 跳过已同步的记录，避免无限循环
    IF NEW.remark_1 IN ('项目支出', '项目收款', '增项收款', '换汇交易') THEN
      RETURN NEW;
    END IF;
    
    -- 更新项目汇总数据
    IF NEW.type = 'expense' THEN
      UPDATE public.projects SET
        total_expense_myr = COALESCE(total_expense_myr, 0) + NEW.amount_myr,
        net_profit_myr = COALESCE(total_income_myr, 0) + COALESCE(total_addition_myr, 0) - (COALESCE(total_expense_myr, 0) + NEW.amount_myr),
        updated_at = now()
      WHERE id = NEW.project_id;
    ELSIF NEW.type = 'income' THEN
      UPDATE public.projects SET
        total_income_myr = COALESCE(total_income_myr, 0) + NEW.amount_myr,
        net_profit_myr = (COALESCE(total_income_myr, 0) + NEW.amount_myr) + COALESCE(total_addition_myr, 0) - COALESCE(total_expense_myr, 0),
        updated_at = now()
      WHERE id = NEW.project_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 重新创建触发器（使用 WHEN 条件减少触发次数）
CREATE TRIGGER sync_transaction_to_project 
AFTER INSERT ON public.transactions 
FOR EACH ROW 
WHEN (NEW.project_id IS NOT NULL AND NEW.ledger_type = 'project')
EXECUTE FUNCTION public.sync_transaction_to_project();

-- 优化 sync_project_addition_payment 函数 - 简化 remark 格式
CREATE OR REPLACE FUNCTION public.sync_project_addition_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_rec RECORD;
BEGIN
  -- 获取项目信息
  SELECT project_code, project_name INTO project_rec
  FROM public.projects WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- INSERT 时如果 is_paid = true，直接插入收入记录
  IF TG_OP = 'INSERT' AND NEW.is_paid = true THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_id, category_name,
      summary, amount, currency, account_type, exchange_rate, amount_myr,
      project_id, remark_1, remark_2, created_by
    ) VALUES (
      NEW.addition_date,
      'income',
      'project',
      NULL,
      '增项收款',
      '[' || COALESCE(project_rec.project_code, '') || '] ' || NEW.description,
      NEW.amount,
      NEW.currency,
      'bank',
      NEW.exchange_rate,
      NEW.amount_myr,
      NEW.project_id,
      '增项收款',
      COALESCE(NEW.remark, ''),  -- 只保存用户输入的备注，不加代码标识
      NEW.created_by
    );
  END IF;
  
  -- UPDATE 时处理
  IF TG_OP = 'UPDATE' THEN
    -- 从未收款变为已收款
    IF NEW.is_paid = true AND (OLD.is_paid = false OR OLD.is_paid IS NULL) THEN
      INSERT INTO public.transactions (
        transaction_date, type, ledger_type, category_id, category_name,
        summary, amount, currency, account_type, exchange_rate, amount_myr,
        project_id, remark_1, remark_2, created_by
      ) VALUES (
        NEW.addition_date,
        'income',
        'project',
        NULL,
        '增项收款',
        '[' || COALESCE(project_rec.project_code, '') || '] ' || NEW.description,
        NEW.amount,
        NEW.currency,
        'bank',
        NEW.exchange_rate,
        NEW.amount_myr,
        NEW.project_id,
        '增项收款',
        COALESCE(NEW.remark, ''),
        NEW.created_by
      );
    END IF;
    
    -- 从已收款变为未收款 - 通过 summary 和 category_name 匹配删除
    IF NEW.is_paid = false AND OLD.is_paid = true THEN
      DELETE FROM public.transactions 
      WHERE category_name = '增项收款' 
        AND project_id = OLD.project_id
        AND summary LIKE '%' || OLD.description || '%'
        AND transaction_date = OLD.addition_date;
    END IF;
  END IF;
  
  -- DELETE 时如果已收款，删除对应交易记录
  IF TG_OP = 'DELETE' AND OLD.is_paid = true THEN
    DELETE FROM public.transactions 
    WHERE category_name = '增项收款' 
      AND project_id = OLD.project_id
      AND summary LIKE '%' || OLD.description || '%'
      AND transaction_date = OLD.addition_date;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 清理现有的长代码备注（历史数据修复）
UPDATE public.transactions 
SET remark_2 = regexp_replace(remark_2, '\s*\[增项ID:[^]]+\]', '', 'g')
WHERE remark_2 LIKE '%[增项ID:%';