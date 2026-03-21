-- ============================================================
-- Fix remaining cross-tenant data leakage in SELECT policies
-- ============================================================

-- ==========================================
-- PART 1: Drop 3 policies with qual = true
-- ==========================================

DROP POLICY IF EXISTS "Users can view project additions" ON public.project_additions;
DROP POLICY IF EXISTS "Users can view project expenses" ON public.project_expenses;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.transaction_categories;

-- ==========================================
-- PART 2: Replace 17 non-tenant-scoped SELECT policies
-- Each is dropped and recreated with tenant_id check
-- ==========================================

-- company_accounts
DROP POLICY IF EXISTS "Users with permission can view company accounts" ON public.company_accounts;
CREATE POLICY "Users with permission can view company accounts" ON public.company_accounts
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND (has_nav_permission(auth.uid(), 'nav.transactions') OR has_nav_permission(auth.uid(), 'nav.dashboard') OR has_nav_permission(auth.uid(), 'nav.balance_ledger'))
  );

-- contacts
DROP POLICY IF EXISTS "Users with permission can view contacts" ON public.contacts;
CREATE POLICY "Users with permission can view contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.contacts')
  );

-- employees
DROP POLICY IF EXISTS "Users with payroll permission can view employees" ON public.employees;
CREATE POLICY "Users with payroll permission can view employees" ON public.employees
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.payroll')
  );

-- exchange_transactions
DROP POLICY IF EXISTS "Users with permission can view exchange transactions" ON public.exchange_transactions;
CREATE POLICY "Users with permission can view exchange transactions" ON public.exchange_transactions
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND (has_nav_permission(auth.uid(), 'nav.exchange') OR has_nav_permission(auth.uid(), 'nav.dashboard'))
  );

-- fixed_assets
DROP POLICY IF EXISTS "Users with permission can view fixed assets" ON public.fixed_assets;
CREATE POLICY "Users with permission can view fixed assets" ON public.fixed_assets
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.fixed_assets')
  );

-- insurance_payments
DROP POLICY IF EXISTS "Users with payroll permission can view insurance payments" ON public.insurance_payments;
CREATE POLICY "Users with payroll permission can view insurance payments" ON public.insurance_payments
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.payroll')
  );

-- invoice_items
DROP POLICY IF EXISTS "Users with permission can view invoice items" ON public.invoice_items;
CREATE POLICY "Users with permission can view invoice items" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.invoices')
  );

-- invoices
DROP POLICY IF EXISTS "Users with permission can view invoices" ON public.invoices;
CREATE POLICY "Users with permission can view invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.invoices')
  );

-- payable_payments
DROP POLICY IF EXISTS "Users with permission can view payable payments" ON public.payable_payments;
CREATE POLICY "Users with permission can view payable payments" ON public.payable_payments
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND (has_nav_permission(auth.uid(), 'nav.payables') OR has_nav_permission(auth.uid(), 'nav.dashboard'))
  );

-- payables
DROP POLICY IF EXISTS "Users with permission can view payables" ON public.payables;
CREATE POLICY "Users with permission can view payables" ON public.payables
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND (has_nav_permission(auth.uid(), 'nav.payables') OR has_nav_permission(auth.uid(), 'nav.dashboard'))
  );

-- project_payments
DROP POLICY IF EXISTS "Admin and accountant can view project payments" ON public.project_payments;
CREATE POLICY "Admin and accountant can view project payments" ON public.project_payments
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND is_admin_or_accountant(auth.uid())
  );

-- q_material_supplier_prices
DROP POLICY IF EXISTS "Users with permission can view material prices" ON public.q_material_supplier_prices;
CREATE POLICY "Users with permission can view material prices" ON public.q_material_supplier_prices
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND (has_nav_permission(auth.uid(), 'nav.materials') OR has_nav_permission(auth.uid(), 'nav.suppliers'))
  );

-- q_materials
DROP POLICY IF EXISTS "Users with permission can view materials" ON public.q_materials;
CREATE POLICY "Users with permission can view materials" ON public.q_materials
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.materials')
  );

-- q_suppliers
DROP POLICY IF EXISTS "Users with permission can view suppliers" ON public.q_suppliers;
CREATE POLICY "Users with permission can view suppliers" ON public.q_suppliers
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.suppliers')
  );

-- salary_advances
DROP POLICY IF EXISTS "Users with payroll permission can view salary advances" ON public.salary_advances;
CREATE POLICY "Users with payroll permission can view salary advances" ON public.salary_advances
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.payroll')
  );

-- salary_payments
DROP POLICY IF EXISTS "Users with payroll permission can view salary payments" ON public.salary_payments;
CREATE POLICY "Users with payroll permission can view salary payments" ON public.salary_payments
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND has_nav_permission(auth.uid(), 'nav.payroll')
  );

-- transactions
DROP POLICY IF EXISTS "Users with permission can view transactions" ON public.transactions;
CREATE POLICY "Users with permission can view transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND (has_nav_permission(auth.uid(), 'nav.transactions') OR has_nav_permission(auth.uid(), 'nav.dashboard'))
  );
