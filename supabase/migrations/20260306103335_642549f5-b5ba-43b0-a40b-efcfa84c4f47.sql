
-- ============================================
-- Phase 2.5 Batch 1: Rewrite RLS policies for core tables with tenant_id
-- Strategy: Drop old policies, create new ones with tenant_id = get_user_tenant_id()
-- ============================================

-- Helper function: check tenant membership + role
CREATE OR REPLACE FUNCTION public.is_tenant_admin_or_accountant(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'accountant')
  ) AND EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id AND is_active = true
      AND tenant_id = public.get_user_tenant_id()
  );
$$;

-- ===== TRANSACTIONS =====
DROP POLICY IF EXISTS "Admin or accountant can manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users with management role can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Project managers can manage project transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Accountants can manage all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Managers can view transactions" ON public.transactions;

CREATE POLICY "Tenant members can view transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_management_role(auth.uid()));

CREATE POLICY "Tenant admin/accountant can manage transactions"
  ON public.transactions FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== PROJECTS =====
DROP POLICY IF EXISTS "Admin or accountant can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Users with management role can view projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Project managers can manage assigned projects" ON public.projects;

CREATE POLICY "Tenant members can view projects"
  ON public.projects FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_management_role(auth.uid()));

CREATE POLICY "Tenant admin/accountant can manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== EMPLOYEES =====
DROP POLICY IF EXISTS "Admin or payroll users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Admin can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Admin or payroll permission can view employees" ON public.employees;

CREATE POLICY "Tenant admin can manage employees"
  ON public.employees FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant payroll users can view employees"
  ON public.employees FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.payroll'));

-- ===== COMPANY_ACCOUNTS =====
DROP POLICY IF EXISTS "Admin or accountant can manage company accounts" ON public.company_accounts;
DROP POLICY IF EXISTS "Users with management role can view company accounts" ON public.company_accounts;

CREATE POLICY "Tenant members can view accounts"
  ON public.company_accounts FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_management_role(auth.uid()));

CREATE POLICY "Tenant admin/accountant can manage accounts"
  ON public.company_accounts FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== EXCHANGE_RATES =====
DROP POLICY IF EXISTS "Admin or accountant can manage exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Users with management role can view exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Authenticated users can view exchange rates" ON public.exchange_rates;

CREATE POLICY "Tenant members can view exchange rates"
  ON public.exchange_rates FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admin/accountant can manage exchange rates"
  ON public.exchange_rates FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== EXCHANGE_TRANSACTIONS =====
DROP POLICY IF EXISTS "Admin or accountant can manage exchange transactions" ON public.exchange_transactions;
DROP POLICY IF EXISTS "Users with management role can view exchange transactions" ON public.exchange_transactions;

CREATE POLICY "Tenant members can view exchange transactions"
  ON public.exchange_transactions FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_management_role(auth.uid()));

CREATE POLICY "Tenant admin/accountant can manage exchange transactions"
  ON public.exchange_transactions FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== PAYABLES =====
DROP POLICY IF EXISTS "Admin or accountant can manage payables" ON public.payables;
DROP POLICY IF EXISTS "Users with nav permission can view payables" ON public.payables;
DROP POLICY IF EXISTS "Authenticated users can manage payables" ON public.payables;

CREATE POLICY "Tenant members can view payables"
  ON public.payables FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.payables'));

CREATE POLICY "Tenant admin/accountant can manage payables"
  ON public.payables FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== PAYABLE_PAYMENTS =====
DROP POLICY IF EXISTS "Admin or accountant can manage payable payments" ON public.payable_payments;
DROP POLICY IF EXISTS "Users with nav permission can view payable payments" ON public.payable_payments;
DROP POLICY IF EXISTS "Authenticated users can manage payable payments" ON public.payable_payments;

CREATE POLICY "Tenant members can view payable payments"
  ON public.payable_payments FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.payables'));

CREATE POLICY "Tenant admin/accountant can manage payable payments"
  ON public.payable_payments FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== PROJECT_EXPENSES =====
DROP POLICY IF EXISTS "Admin or accountant can manage project expenses" ON public.project_expenses;
DROP POLICY IF EXISTS "Users with management role can view project expenses" ON public.project_expenses;

CREATE POLICY "Tenant members can view project expenses"
  ON public.project_expenses FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_management_role(auth.uid()));

CREATE POLICY "Tenant admin/accountant can manage project expenses"
  ON public.project_expenses FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== PROJECT_PAYMENTS =====
DROP POLICY IF EXISTS "Admin or accountant can manage project payments" ON public.project_payments;
DROP POLICY IF EXISTS "Users with management role can view project payments" ON public.project_payments;

CREATE POLICY "Tenant members can view project payments"
  ON public.project_payments FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_management_role(auth.uid()));

CREATE POLICY "Tenant admin/accountant can manage project payments"
  ON public.project_payments FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== PROJECT_ADDITIONS =====
DROP POLICY IF EXISTS "Admin or accountant can manage project additions" ON public.project_additions;
DROP POLICY IF EXISTS "Users with management role can view project additions" ON public.project_additions;

CREATE POLICY "Tenant members can view project additions"
  ON public.project_additions FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_management_role(auth.uid()));

CREATE POLICY "Tenant admin/accountant can manage project additions"
  ON public.project_additions FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== PROJECT_ALERTS =====
DROP POLICY IF EXISTS "Admin or accountant can manage project alerts" ON public.project_alerts;
DROP POLICY IF EXISTS "Users with view permission can view project alerts" ON public.project_alerts;
DROP POLICY IF EXISTS "Users with alert permission can view alerts" ON public.project_alerts;

CREATE POLICY "Tenant members can view project alerts"
  ON public.project_alerts FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND can_view_alerts(auth.uid()));

CREATE POLICY "Tenant admin can manage project alerts"
  ON public.project_alerts FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- ===== PROJECT_CATEGORIES =====
DROP POLICY IF EXISTS "Admin or accountant can manage project categories" ON public.project_categories;
DROP POLICY IF EXISTS "Authenticated users can view project categories" ON public.project_categories;

CREATE POLICY "Tenant members can view project categories"
  ON public.project_categories FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admin can manage project categories"
  ON public.project_categories FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== CONTACTS =====
DROP POLICY IF EXISTS "Admin or accountant can manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users with nav permission can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can manage contacts" ON public.contacts;

CREATE POLICY "Tenant members can view contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.contacts'));

CREATE POLICY "Tenant admin/accountant can manage contacts"
  ON public.contacts FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== INVOICES =====
DROP POLICY IF EXISTS "Admin or accountant can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users with nav permission can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;

CREATE POLICY "Tenant members can view invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.invoices'));

CREATE POLICY "Tenant admin/accountant can manage invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== INVOICE_ITEMS =====
DROP POLICY IF EXISTS "Admin or accountant can manage invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users with nav permission can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can manage invoice items" ON public.invoice_items;

CREATE POLICY "Tenant members can view invoice items"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.invoices'));

CREATE POLICY "Tenant admin/accountant can manage invoice items"
  ON public.invoice_items FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== FIXED_ASSETS =====
DROP POLICY IF EXISTS "Admin or accountant can manage fixed assets" ON public.fixed_assets;
DROP POLICY IF EXISTS "Users with nav permission can view fixed assets" ON public.fixed_assets;
DROP POLICY IF EXISTS "Authenticated users can manage fixed assets" ON public.fixed_assets;

CREATE POLICY "Tenant members can view fixed assets"
  ON public.fixed_assets FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.fixed_assets'));

CREATE POLICY "Tenant admin/accountant can manage fixed assets"
  ON public.fixed_assets FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== MEMOS =====
DROP POLICY IF EXISTS "Authenticated users can manage memos" ON public.memos;
DROP POLICY IF EXISTS "Users can manage own memos" ON public.memos;
DROP POLICY IF EXISTS "Admin can view all memos" ON public.memos;

CREATE POLICY "Tenant members can manage own memos"
  ON public.memos FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND created_by = auth.uid());

CREATE POLICY "Tenant admin can view all memos"
  ON public.memos FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- ===== SALARY_PAYMENTS =====
DROP POLICY IF EXISTS "Admin or payroll users can manage salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Admin can manage salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Admin or payroll permission can view salary payments" ON public.salary_payments;

CREATE POLICY "Tenant admin can manage salary payments"
  ON public.salary_payments FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_nav_permission(auth.uid(), 'nav.payroll')));

-- ===== SALARY_ADVANCES =====
DROP POLICY IF EXISTS "Admin or payroll users can manage salary advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Admin can manage salary advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Admin or payroll permission can view salary advances" ON public.salary_advances;

CREATE POLICY "Tenant admin can manage salary advances"
  ON public.salary_advances FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_nav_permission(auth.uid(), 'nav.payroll')));

-- ===== INSURANCE_PAYMENTS =====
DROP POLICY IF EXISTS "Admin or payroll users can manage insurance payments" ON public.insurance_payments;
DROP POLICY IF EXISTS "Admin can manage insurance payments" ON public.insurance_payments;
DROP POLICY IF EXISTS "Admin or payroll permission can view insurance payments" ON public.insurance_payments;

CREATE POLICY "Tenant admin can manage insurance payments"
  ON public.insurance_payments FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_nav_permission(auth.uid(), 'nav.payroll')));

-- ===== ALERT_RULES =====
DROP POLICY IF EXISTS "Admin can manage alert rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Users with view permission can view alert rules" ON public.alert_rules;

CREATE POLICY "Tenant members can view alert rules"
  ON public.alert_rules FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND can_view_alerts(auth.uid()));

CREATE POLICY "Tenant admin can manage alert rules"
  ON public.alert_rules FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- ===== APPROVAL_RULES =====
DROP POLICY IF EXISTS "Admin can manage approval rules" ON public.approval_rules;
DROP POLICY IF EXISTS "Authenticated users can view approval rules" ON public.approval_rules;

CREATE POLICY "Tenant members can view approval rules"
  ON public.approval_rules FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admin can manage approval rules"
  ON public.approval_rules FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- ===== APPROVAL_REQUESTS =====
DROP POLICY IF EXISTS "Admin can manage approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Admin or accountant can update approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Authenticated users can create approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Users can view own approval requests" ON public.approval_requests;

CREATE POLICY "Tenant members can view own approval requests"
  ON public.approval_requests FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND (requested_by = auth.uid() OR is_admin_or_accountant(auth.uid())));

CREATE POLICY "Tenant members can create approval requests"
  ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Tenant admin/accountant can manage approval requests"
  ON public.approval_requests FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== EMPLOYEE_POSITIONS =====
DROP POLICY IF EXISTS "Admin can manage employee positions" ON public.employee_positions;
DROP POLICY IF EXISTS "Authenticated users can view positions" ON public.employee_positions;

CREATE POLICY "Tenant members can view positions"
  ON public.employee_positions FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admin can manage positions"
  ON public.employee_positions FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- ===== PAYROLL_SETTINGS =====
DROP POLICY IF EXISTS "Admin can manage payroll settings" ON public.payroll_settings;
DROP POLICY IF EXISTS "Admin or payroll users can view payroll settings" ON public.payroll_settings;

CREATE POLICY "Tenant admin can manage payroll settings"
  ON public.payroll_settings FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_nav_permission(auth.uid(), 'nav.payroll')));

-- ===== TRANSACTION_CATEGORIES =====
DROP POLICY IF EXISTS "Admin or accountant can manage transaction categories" ON public.transaction_categories;
DROP POLICY IF EXISTS "Authenticated users can view transaction categories" ON public.transaction_categories;

CREATE POLICY "Tenant members can view transaction categories"
  ON public.transaction_categories FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admin can manage transaction categories"
  ON public.transaction_categories FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== TAX_RATES =====
DROP POLICY IF EXISTS "Admin can manage tax rates" ON public.tax_rates;
DROP POLICY IF EXISTS "Authenticated users can view tax rates" ON public.tax_rates;

CREATE POLICY "Tenant members can view tax rates"
  ON public.tax_rates FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admin can manage tax rates"
  ON public.tax_rates FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- ===== BANK_IMPORT_BATCHES =====
DROP POLICY IF EXISTS "Admin or accountant can manage bank import batches" ON public.bank_import_batches;
DROP POLICY IF EXISTS "Users with permission can view bank import batches" ON public.bank_import_batches;

CREATE POLICY "Tenant members can view bank imports"
  ON public.bank_import_batches FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.bank_reconciliation'));

CREATE POLICY "Tenant admin/accountant can manage bank imports"
  ON public.bank_import_batches FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== BANK_STATEMENTS =====
DROP POLICY IF EXISTS "Admin or accountant can manage bank statements" ON public.bank_statements;
DROP POLICY IF EXISTS "Users with permission can view bank statements" ON public.bank_statements;

CREATE POLICY "Tenant members can view bank statements"
  ON public.bank_statements FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.bank_reconciliation'));

CREATE POLICY "Tenant admin/accountant can manage bank statements"
  ON public.bank_statements FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));

-- ===== RECONCILIATION_RULES =====
DROP POLICY IF EXISTS "Admin or accountant can manage reconciliation rules" ON public.reconciliation_rules;
DROP POLICY IF EXISTS "Users with permission can view reconciliation rules" ON public.reconciliation_rules;

CREATE POLICY "Tenant members can view reconciliation rules"
  ON public.reconciliation_rules FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND has_nav_permission(auth.uid(), 'nav.bank_reconciliation'));

CREATE POLICY "Tenant admin/accountant can manage reconciliation rules"
  ON public.reconciliation_rules FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND is_admin_or_accountant(auth.uid()));
