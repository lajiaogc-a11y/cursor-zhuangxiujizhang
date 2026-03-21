-- 1. 创建触发器：第一个注册用户自动成为管理员
CREATE OR REPLACE FUNCTION public.assign_first_user_as_admin()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- 统计现有用户角色数量
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  -- 如果是第一个用户，设置为管理员
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 创建触发器，在用户注册时执行
DROP TRIGGER IF EXISTS assign_first_user_admin ON auth.users;
CREATE TRIGGER assign_first_user_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_first_user_as_admin();

-- 2. 修复增项同步触发器：支持INSERT时is_paid=true也能同步到transactions
CREATE OR REPLACE FUNCTION public.sync_project_addition_payment()
RETURNS TRIGGER AS $$
DECLARE
  project_rec RECORD;
BEGIN
  -- 获取项目信息
  SELECT project_code, project_name INTO project_rec
  FROM public.projects WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- INSERT 时如果 is_paid = true，直接插入收入记录
  IF TG_OP = 'INSERT' AND NEW.is_paid = true THEN
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
      '增项收款-' || NEW.id,
      NEW.remark,
      NEW.created_by
    );
    
    -- 更新项目收入汇总
    UPDATE public.projects SET
      total_income_myr = COALESCE(total_income_myr, 0) + NEW.amount_myr
    WHERE id = NEW.project_id;
    
    -- 重新计算净利润
    UPDATE public.projects SET
      net_profit_myr = COALESCE(total_income_myr, 0) + COALESCE(total_addition_myr, 0) - COALESCE(total_expense_myr, 0)
    WHERE id = NEW.project_id;
  END IF;
  
  -- UPDATE 时处理
  IF TG_OP = 'UPDATE' THEN
    -- 从未收款变为已收款
    IF NEW.is_paid = true AND (OLD.is_paid = false OR OLD.is_paid IS NULL) THEN
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
        '增项收款-' || NEW.id,
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
      DELETE FROM public.transactions 
      WHERE remark_1 = '增项收款-' || OLD.id;
      
      -- 减去收入
      UPDATE public.projects SET
        total_income_myr = GREATEST(COALESCE(total_income_myr, 0) - OLD.amount_myr, 0)
      WHERE id = NEW.project_id;
    END IF;
    
    -- 重新计算净利润
    IF NEW.is_paid != OLD.is_paid THEN
      UPDATE public.projects SET
        net_profit_myr = COALESCE(total_income_myr, 0) + COALESCE(total_addition_myr, 0) - COALESCE(total_expense_myr, 0)
      WHERE id = NEW.project_id;
    END IF;
  END IF;
  
  -- DELETE 时如果已收款，删除对应交易记录
  IF TG_OP = 'DELETE' AND OLD.is_paid = true THEN
    DELETE FROM public.transactions 
    WHERE remark_1 = '增项收款-' || OLD.id;
    
    -- 减去收入
    UPDATE public.projects SET
      total_income_myr = GREATEST(COALESCE(total_income_myr, 0) - OLD.amount_myr, 0)
    WHERE id = OLD.project_id;
    
    -- 重新计算净利润
    UPDATE public.projects SET
      net_profit_myr = COALESCE(total_income_myr, 0) + COALESCE(total_addition_myr, 0) - COALESCE(total_expense_myr, 0)
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 重建触发器以支持DELETE
DROP TRIGGER IF EXISTS trigger_sync_addition_payment ON public.project_additions;
CREATE TRIGGER trigger_sync_addition_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.project_additions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_project_addition_payment();