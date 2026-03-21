-- 创建触发器函数：当增项标记为已收款时同步到 transactions 表
CREATE OR REPLACE FUNCTION public.sync_project_addition_payment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  project_rec RECORD;
BEGIN
  -- 只在 is_paid 从 false 变为 true 时触发
  IF TG_OP = 'UPDATE' AND NEW.is_paid = true AND (OLD.is_paid = false OR OLD.is_paid IS NULL) THEN
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
  END IF;
  
  -- 如果从已收款改为未收款，删除对应的交易记录
  IF TG_OP = 'UPDATE' AND NEW.is_paid = false AND OLD.is_paid = true THEN
    DELETE FROM public.transactions 
    WHERE project_id = NEW.project_id 
      AND remark_1 = '增项收款'
      AND summary = OLD.description
      AND amount_myr = OLD.amount_myr;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_sync_addition_payment ON project_additions;
CREATE TRIGGER trigger_sync_addition_payment
  AFTER UPDATE ON public.project_additions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_project_addition_payment();