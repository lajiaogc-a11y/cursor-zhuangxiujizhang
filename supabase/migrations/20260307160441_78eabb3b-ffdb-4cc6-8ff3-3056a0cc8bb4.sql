
-- Fix: Change all tenant_id columns from hardcoded default to function-based default
-- and make them nullable so schema diff doesn't cause FK violations on publish

-- Step 1: Change default from hardcoded UUID to function call
ALTER TABLE public.alert_rules ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.approval_requests ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.approval_rules ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.bank_import_batches ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.bank_statements ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.company_accounts ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.employee_positions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.employees ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.exchange_rates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.exchange_transactions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.fixed_assets ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.insurance_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.invoice_items ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.memos ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.payable_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.payables ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.payroll_settings ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.project_additions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.project_alerts ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.project_categories ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.project_expenses ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.project_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.projects ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_breakdown_attachments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_breakdown_items ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_breakdown_versions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_category_method_mapping ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_company_settings ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_customers ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_inventory ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_inventory_transactions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_labor_rates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_material_supplier_prices ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_materials ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_measurement_units ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_method_materials ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_methods ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_po_attachments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_po_audit_logs ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_procurement_materials ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_product_categories ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_product_favorites ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_product_templates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_products ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_project_breakdowns ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_purchase_order_items ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_purchase_orders ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_purchase_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_purchase_receiving_items ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_purchase_receivings ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_quotation_drafts ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_quotation_notes_templates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_quotation_versions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_quotations ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_suppliers ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_user_product_categories ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.q_worker_types ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.reconciliation_rules ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.salary_advances ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.salary_payments ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.tax_rates ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.transaction_categories ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id(), ALTER COLUMN tenant_id DROP NOT NULL;

-- Also make invitation_codes tenant_id nullable
ALTER TABLE public.invitation_codes ALTER COLUMN tenant_id DROP NOT NULL;
