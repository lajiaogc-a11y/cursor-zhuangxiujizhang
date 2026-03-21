
-- ==========================================
-- 1. Contacts (CRM - 客户/供应商管理)
-- ==========================================
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type TEXT NOT NULL DEFAULT 'customer',
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  default_currency TEXT DEFAULT 'MYR',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or accountant can manage contacts" ON public.contacts
  FOR ALL USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view contacts" ON public.contacts
  FOR SELECT USING (has_nav_permission(auth.uid(), 'nav.contacts'));

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger for contacts
CREATE TRIGGER audit_contacts
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ==========================================
-- 2. Tax Rates (税务管理)
-- ==========================================
CREATE TABLE public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  tax_type TEXT NOT NULL DEFAULT 'SST',
  is_inclusive BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or accountant can manage tax rates" ON public.tax_rates
  FOR ALL USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Authenticated users can view tax rates" ON public.tax_rates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_tax_rates_updated_at
  BEFORE UPDATE ON public.tax_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 3. Invoices (发票管理)
-- ==========================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_type TEXT NOT NULL DEFAULT 'invoice',
  contact_id UUID REFERENCES public.contacts(id),
  status TEXT NOT NULL DEFAULT 'draft',
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'MYR',
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount_myr NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  project_id UUID REFERENCES public.projects(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or accountant can manage invoices" ON public.invoices
  FOR ALL USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view invoices" ON public.invoices
  FOR SELECT USING (has_nav_permission(auth.uid(), 'nav.invoices'));

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate_id UUID REFERENCES public.tax_rates(id),
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or accountant can manage invoice items" ON public.invoice_items
  FOR ALL USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view invoice items" ON public.invoice_items
  FOR SELECT USING (has_nav_permission(auth.uid(), 'nav.invoices'));

-- ==========================================
-- 4. Approval Workflow (审批流程)
-- ==========================================
CREATE TABLE public.approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'expense',
  threshold_amount NUMERIC NOT NULL DEFAULT 0,
  threshold_currency TEXT NOT NULL DEFAULT 'MYR',
  approver_role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage approval rules" ON public.approval_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view approval rules" ON public.approval_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.approval_rules(id),
  request_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  record_table TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage approval requests" ON public.approval_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own approval requests" ON public.approval_requests
  FOR SELECT USING (requested_by = auth.uid() OR is_admin_or_accountant(auth.uid()));

CREATE POLICY "Admin or accountant can update approval requests" ON public.approval_requests
  FOR UPDATE USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Authenticated users can create approval requests" ON public.approval_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ==========================================
-- 5. Fixed Assets (固定资产管理)
-- ==========================================
CREATE TABLE public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purchase_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MYR',
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  purchase_amount_myr NUMERIC NOT NULL DEFAULT 0,
  useful_life_months INTEGER DEFAULT 60,
  salvage_value NUMERIC DEFAULT 0,
  depreciation_method TEXT DEFAULT 'straight_line',
  current_value NUMERIC DEFAULT 0,
  accumulated_depreciation NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  location TEXT,
  notes TEXT,
  project_id UUID REFERENCES public.projects(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or accountant can manage fixed assets" ON public.fixed_assets
  FOR ALL USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view fixed assets" ON public.fixed_assets
  FOR SELECT USING (has_nav_permission(auth.uid(), 'nav.fixed_assets'));

CREATE TRIGGER update_fixed_assets_updated_at
  BEFORE UPDATE ON public.fixed_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_fixed_assets
  AFTER INSERT OR UPDATE OR DELETE ON public.fixed_assets
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ==========================================
-- 6. Auto Reconciliation Rules (自动对账规则)
-- ==========================================
CREATE TABLE public.reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  match_amount BOOLEAN DEFAULT true,
  amount_tolerance NUMERIC DEFAULT 0,
  match_date BOOLEAN DEFAULT true,
  date_tolerance_days INTEGER DEFAULT 3,
  match_description BOOLEAN DEFAULT false,
  description_pattern TEXT,
  auto_category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or accountant can manage reconciliation rules" ON public.reconciliation_rules
  FOR ALL USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view reconciliation rules" ON public.reconciliation_rules
  FOR SELECT USING (has_nav_permission(auth.uid(), 'nav.bank_reconciliation'));

-- Update audit log function to include new tables
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
