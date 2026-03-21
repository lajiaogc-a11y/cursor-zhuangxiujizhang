
CREATE OR REPLACE FUNCTION public.log_audit_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  table_display text;
  action_display text;
BEGIN
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
    WHEN 'payables' THEN '应付待收'
    WHEN 'payable_payments' THEN '应付付款'
    WHEN 'contacts' THEN '联系人'
    WHEN 'invoices' THEN '发票'
    WHEN 'fixed_assets' THEN '固定资产'
    WHEN 'q_materials' THEN '材料库'
    WHEN 'q_suppliers' THEN '供应商'
    WHEN 'q_material_supplier_prices' THEN '材料报价'
    ELSE TG_TABLE_NAME
  END;

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
$function$;
