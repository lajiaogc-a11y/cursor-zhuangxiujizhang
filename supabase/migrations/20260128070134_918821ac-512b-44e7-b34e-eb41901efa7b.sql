-- 为配置数据表添加审计日志触发器

-- 1. transaction_categories 表
CREATE TRIGGER audit_transaction_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.transaction_categories
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- 2. project_categories 表
CREATE TRIGGER audit_project_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.project_categories
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- 3. exchange_rates 表
CREATE TRIGGER audit_exchange_rates
  AFTER INSERT OR UPDATE OR DELETE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- 4. memos 表
CREATE TRIGGER audit_memos
  AFTER INSERT OR UPDATE OR DELETE ON public.memos
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- 5. alert_rules 表
CREATE TRIGGER audit_alert_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- 6. profiles 表
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- 7. user_roles 表
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- 更新 log_audit_changes 函数，添加新表的中文名称映射
CREATE OR REPLACE FUNCTION public.log_audit_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  table_display text;
  action_display text;
BEGIN
  -- Map table names to Chinese display names
  table_display := CASE TG_TABLE_NAME
    WHEN 'projects' THEN '工程项目'
    WHEN 'project_expenses' THEN '项目支出'
    WHEN 'project_additions' THEN '项目增项'
    WHEN 'project_payments' THEN '项目收款'
    WHEN 'transactions' THEN '公司收支'
    WHEN 'exchange_transactions' THEN '换汇交易'
    WHEN 'company_accounts' THEN '公司账户'
    WHEN 'transaction_categories' THEN '交易分类'
    WHEN 'project_categories' THEN '项目分类'
    WHEN 'exchange_rates' THEN '汇率记录'
    WHEN 'memos' THEN '备忘录'
    WHEN 'alert_rules' THEN '预警规则'
    WHEN 'profiles' THEN '用户资料'
    WHEN 'user_roles' THEN '用户角色'
    ELSE TG_TABLE_NAME
  END;

  -- Map actions to Chinese display
  action_display := CASE TG_OP
    WHEN 'INSERT' THEN '新增'
    WHEN 'UPDATE' THEN '修改'
    WHEN 'DELETE' THEN '删除'
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, table_name, table_display_name, action, action_display, record_id, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, table_display, TG_OP, action_display, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, table_name, table_display_name, action, action_display, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, table_display, TG_OP, action_display, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, table_name, table_display_name, action, action_display, record_id, old_data)
    VALUES (auth.uid(), TG_TABLE_NAME, table_display, TG_OP, action_display, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;