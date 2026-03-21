
-- =============================================
-- 1. 创建 payables 表（应付账款主表）
-- =============================================
CREATE TABLE public.payables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payable_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_name text NOT NULL,
  description text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  currency public.currency_type NOT NULL DEFAULT 'MYR',
  exchange_rate numeric NOT NULL DEFAULT 1,
  total_amount_myr numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_amount_myr numeric NOT NULL DEFAULT 0,
  unpaid_amount numeric NOT NULL DEFAULT 0,
  unpaid_amount_myr numeric NOT NULL DEFAULT 0,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  due_date date,
  remark text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 2. 创建 payable_payments 表（付款记录表）
-- =============================================
CREATE TABLE public.payable_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payable_id uuid NOT NULL REFERENCES public.payables(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  currency public.currency_type NOT NULL DEFAULT 'MYR',
  exchange_rate numeric NOT NULL DEFAULT 1,
  amount_myr numeric NOT NULL DEFAULT 0,
  account_type public.account_type NOT NULL DEFAULT 'bank',
  remark text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 3. RLS 策略
-- =============================================
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payable_payments ENABLE ROW LEVEL SECURITY;

-- payables: admin/accountant 全权限
CREATE POLICY "Admin or accountant can manage payables"
  ON public.payables FOR ALL
  USING (is_admin_or_accountant(auth.uid()));

-- payables: 有权限的用户可查看
CREATE POLICY "Users with permission can view payables"
  ON public.payables FOR SELECT
  USING (has_nav_permission(auth.uid(), 'nav.payables') OR has_nav_permission(auth.uid(), 'nav.dashboard'));

-- payable_payments: admin/accountant 全权限
CREATE POLICY "Admin or accountant can manage payable payments"
  ON public.payable_payments FOR ALL
  USING (is_admin_or_accountant(auth.uid()));

-- payable_payments: 有权限的用户可查看
CREATE POLICY "Users with permission can view payable payments"
  ON public.payable_payments FOR SELECT
  USING (has_nav_permission(auth.uid(), 'nav.payables') OR has_nav_permission(auth.uid(), 'nav.dashboard'));

-- =============================================
-- 4. updated_at 触发器
-- =============================================
CREATE TRIGGER update_payables_updated_at
  BEFORE UPDATE ON public.payables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 5. 审计日志触发器
-- =============================================

-- 更新 log_audit_changes 函数以支持新表
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
    WHEN 'payables' THEN '应付账款'
    WHEN 'payable_payments' THEN '应付付款'
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

CREATE TRIGGER audit_payables
  AFTER INSERT OR UPDATE OR DELETE ON public.payables
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER audit_payable_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payable_payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- =============================================
-- 6. 自动更新 payables 汇总的触发器
-- =============================================
CREATE OR REPLACE FUNCTION public.update_payable_summary()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  target_payable_id uuid;
  calc_paid numeric;
  calc_paid_myr numeric;
  p_total numeric;
  p_total_myr numeric;
BEGIN
  target_payable_id := COALESCE(NEW.payable_id, OLD.payable_id);

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(amount_myr), 0)
  INTO calc_paid, calc_paid_myr
  FROM public.payable_payments
  WHERE payable_id = target_payable_id;

  SELECT total_amount, total_amount_myr
  INTO p_total, p_total_myr
  FROM public.payables
  WHERE id = target_payable_id;

  UPDATE public.payables SET
    paid_amount = calc_paid,
    paid_amount_myr = calc_paid_myr,
    unpaid_amount = p_total - calc_paid,
    unpaid_amount_myr = p_total_myr - calc_paid_myr,
    status = CASE
      WHEN calc_paid >= p_total THEN 'paid'
      WHEN calc_paid > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE id = target_payable_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER update_payable_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payable_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_payable_summary();

-- =============================================
-- 7. 付款同步到 transactions 的触发器
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_payable_payment_to_transaction()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  supplier text;
  payable_remark text;
BEGIN
  SELECT supplier_name, remark INTO supplier, payable_remark
  FROM public.payables
  WHERE id = COALESCE(NEW.payable_id, OLD.payable_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_name,
      summary, amount, currency, account_type,
      exchange_rate, amount_myr, remark_1, remark_2, created_by
    ) VALUES (
      NEW.payment_date, 'expense', 'company_daily', '应付账款',
      COALESCE(supplier, '') || ' 付款',
      NEW.amount, NEW.currency, NEW.account_type,
      NEW.exchange_rate, NEW.amount_myr, '应付账款', NEW.remark, NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.payment_date,
      summary = COALESCE(supplier, '') || ' 付款',
      amount = NEW.amount,
      currency = NEW.currency,
      account_type = NEW.account_type,
      exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 = '应付账款'
      AND category_name = '应付账款'
      AND transaction_date = OLD.payment_date
      AND amount = OLD.amount
      AND created_by = OLD.created_by;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions
    WHERE remark_1 = '应付账款'
      AND category_name = '应付账款'
      AND transaction_date = OLD.payment_date
      AND amount = OLD.amount
      AND created_by = OLD.created_by;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER sync_payable_payment_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.payable_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_payable_payment_to_transaction();
