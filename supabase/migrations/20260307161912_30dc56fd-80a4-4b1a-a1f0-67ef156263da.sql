
-- ============================================================
-- 1. Fix is_super_admin to use hardcoded default tenant ID
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND role = 'owner'
      AND tenant_id = '00000000-0000-0000-0000-000000000001'
      AND is_active = true
  );
$$;

-- ============================================================
-- 2. Restore tenant_id defaults for all business tables
-- ============================================================
ALTER TABLE public.alert_rules ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.approval_requests ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.approval_rules ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.bank_import_batches ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.bank_statements ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.company_accounts ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.contacts ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.employee_positions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.employees ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.exchange_rates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.exchange_transactions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.fixed_assets ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.insurance_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.invitation_codes ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.invoice_items ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.invoices ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.memos ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.payable_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.payables ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.payroll_settings ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.project_additions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.project_alerts ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.project_categories ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.project_expenses ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.project_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.projects ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_breakdown_attachments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_breakdown_items ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_breakdown_versions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_category_method_mapping ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_company_settings ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_customers ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_inventory ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_inventory_transactions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_labor_rates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_material_supplier_prices ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_materials ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_measurement_units ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_method_materials ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_methods ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_po_attachments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_po_audit_logs ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_procurement_materials ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_product_categories ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_product_favorites ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_product_templates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_products ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_project_breakdowns ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_purchase_order_items ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_purchase_orders ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_purchase_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_purchase_receiving_items ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_purchase_receivings ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_quotation_drafts ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_quotation_notes_templates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_quotation_versions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_quotations ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_suppliers ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_user_product_categories ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.q_worker_types ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.reconciliation_rules ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.salary_advances ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.salary_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.tax_rates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.transaction_categories ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.transactions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();

-- ============================================================
-- 3. Fix RLS: Replace 27 loose SELECT policies with tenant-scoped ones
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;

DROP POLICY IF EXISTS "Authenticated users can view payroll settings" ON public.payroll_settings;
CREATE POLICY "Tenant members can view payroll settings" ON public.payroll_settings
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_breakdown_attachments" ON public.q_breakdown_attachments;
CREATE POLICY "Tenant members can view q_breakdown_attachments" ON public.q_breakdown_attachments
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_breakdown_items" ON public.q_breakdown_items;
CREATE POLICY "Tenant members can view q_breakdown_items" ON public.q_breakdown_items
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_breakdown_versions" ON public.q_breakdown_versions;
CREATE POLICY "Tenant members can view q_breakdown_versions" ON public.q_breakdown_versions
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_category_method_mapping" ON public.q_category_method_mapping;
CREATE POLICY "Tenant members can view q_category_method_mapping" ON public.q_category_method_mapping
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_company_settings" ON public.q_company_settings;
CREATE POLICY "Tenant members can view q_company_settings" ON public.q_company_settings
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_customers" ON public.q_customers;
CREATE POLICY "Tenant members can view q_customers" ON public.q_customers
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_inventory" ON public.q_inventory;
CREATE POLICY "Tenant members can view q_inventory" ON public.q_inventory
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_inventory_transactions" ON public.q_inventory_transactions;
CREATE POLICY "Tenant members can view q_inventory_transactions" ON public.q_inventory_transactions
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_labor_rates" ON public.q_labor_rates;
CREATE POLICY "Tenant members can view q_labor_rates" ON public.q_labor_rates
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_measurement_units" ON public.q_measurement_units;
CREATE POLICY "Tenant members can view q_measurement_units" ON public.q_measurement_units
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_method_materials" ON public.q_method_materials;
CREATE POLICY "Tenant members can view q_method_materials" ON public.q_method_materials
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_methods" ON public.q_methods;
CREATE POLICY "Tenant members can view q_methods" ON public.q_methods
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_po_attachments" ON public.q_po_attachments;
CREATE POLICY "Tenant members can view q_po_attachments" ON public.q_po_attachments
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_po_audit_logs" ON public.q_po_audit_logs;
CREATE POLICY "Tenant members can view q_po_audit_logs" ON public.q_po_audit_logs
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_procurement_materials" ON public.q_procurement_materials;
CREATE POLICY "Tenant members can view q_procurement_materials" ON public.q_procurement_materials
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_product_categories" ON public.q_product_categories;
CREATE POLICY "Tenant members can view q_product_categories" ON public.q_product_categories
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_products" ON public.q_products;
CREATE POLICY "Tenant members can view q_products" ON public.q_products
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_project_breakdowns" ON public.q_project_breakdowns;
CREATE POLICY "Tenant members can view q_project_breakdowns" ON public.q_project_breakdowns
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_purchase_order_items" ON public.q_purchase_order_items;
CREATE POLICY "Tenant members can view q_purchase_order_items" ON public.q_purchase_order_items
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_purchase_orders" ON public.q_purchase_orders;
CREATE POLICY "Tenant members can view q_purchase_orders" ON public.q_purchase_orders
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_purchase_payments" ON public.q_purchase_payments;
CREATE POLICY "Tenant members can view q_purchase_payments" ON public.q_purchase_payments
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_purchase_receiving_items" ON public.q_purchase_receiving_items;
CREATE POLICY "Tenant members can view q_purchase_receiving_items" ON public.q_purchase_receiving_items
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_quotation_versions" ON public.q_quotation_versions;
CREATE POLICY "Tenant members can view q_quotation_versions" ON public.q_quotation_versions
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_quotations" ON public.q_quotations;
CREATE POLICY "Tenant members can view q_quotations" ON public.q_quotations
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view q_worker_types" ON public.q_worker_types;
CREATE POLICY "Tenant members can view q_worker_types" ON public.q_worker_types
  FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- ============================================================
-- 4. Create auth.users trigger for handle_new_user_complete
-- ============================================================
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_complete();
