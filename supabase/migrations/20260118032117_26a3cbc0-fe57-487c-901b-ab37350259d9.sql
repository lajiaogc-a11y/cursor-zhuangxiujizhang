
-- 1. 修复增项收款的来源显示问题 - remark_1 只保存类型标识，不包含UUID
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
      '增项收款',  -- 只保存类型标识
      COALESCE(NEW.remark, '') || ' [增项ID:' || NEW.id || ']',  -- 增项ID放到remark_2备注里
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
        '增项收款',  -- 只保存类型标识
        COALESCE(NEW.remark, '') || ' [增项ID:' || NEW.id || ']',
        NEW.created_by
      );
      
      -- 更新项目收入汇总
      UPDATE public.projects SET
        total_income_myr = COALESCE(total_income_myr, 0) + NEW.amount_myr
      WHERE id = NEW.project_id;
    END IF;
    
    -- 从已收款变为未收款 - 通过 summary 中的增项ID匹配删除
    IF NEW.is_paid = false AND OLD.is_paid = true THEN
      DELETE FROM public.transactions 
      WHERE category_name = '增项收款' 
        AND project_id = OLD.project_id
        AND remark_2 LIKE '%[增项ID:' || OLD.id || ']%';
      
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
    WHERE category_name = '增项收款' 
      AND project_id = OLD.project_id
      AND remark_2 LIKE '%[增项ID:' || OLD.id || ']%';
    
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
$$;

-- 修复现有的乱码数据
UPDATE public.transactions 
SET remark_1 = '增项收款'
WHERE remark_1 LIKE '增项收款-%';

-- 2. 确保管理员触发器正确工作 - 重新创建触发器绑定
-- 先删除可能存在的旧触发器
DROP TRIGGER IF EXISTS on_first_user_created ON auth.users;

-- 重新创建触发器函数（确保是最新的）
CREATE OR REPLACE FUNCTION public.assign_first_user_as_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_count INTEGER;
BEGIN
  -- 统计现有用户角色数量（不是用户数量，是角色记录数量）
  SELECT COUNT(*) INTO role_count FROM public.user_roles;
  
  -- 如果没有任何角色记录，第一个注册的用户设置为管理员
  IF role_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 重新创建触发器到 auth.users
CREATE TRIGGER on_first_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_first_user_as_admin();
