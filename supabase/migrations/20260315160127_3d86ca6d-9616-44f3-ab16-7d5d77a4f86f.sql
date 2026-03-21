
-- Add super admin read-all bypass to all tenant-scoped business tables
-- This allows the super admin (owner of default tenant) to view ALL data across ALL tenants
-- Uses the existing is_super_admin() SECURITY DEFINER function

DO $$
DECLARE
  tbl TEXT;
  policy_name TEXT;
  tables TEXT[] := ARRAY[
    'alert_rules', 'approval_requests', 'approval_rules', 'attendance_records',
    'bank_import_batches', 'bank_statements', 'company_accounts',
    'contact_activities', 'contact_reminders', 'contacts',
    'contract_amendments', 'contract_payment_plans', 'contract_signatures',
    'contract_templates', 'contracts',
    'employee_positions', 'employees', 'exchange_rates', 'exchange_transactions',
    'fixed_assets', 'insurance_payments', 'invoice_items', 'invoices',
    'leave_requests', 'material_issues', 'memos',
    'payable_payments', 'payables', 'payroll_settings',
    'project_additions', 'project_alerts', 'project_categories',
    'project_expenses', 'project_payments', 'projects',
    'q_breakdown_attachments', 'q_breakdown_items', 'q_breakdown_versions',
    'q_category_method_mapping', 'q_company_settings', 'q_customers',
    'q_inventory', 'q_inventory_transactions', 'q_labor_rates',
    'q_material_supplier_prices', 'q_materials', 'q_measurement_units',
    'q_method_materials', 'q_methods', 'q_po_attachments', 'q_po_audit_logs',
    'q_procurement_materials', 'q_product_categories', 'q_product_favorites',
    'q_product_templates', 'q_products', 'q_project_breakdowns',
    'q_purchase_order_items', 'q_purchase_orders', 'q_purchase_payments',
    'q_purchase_receiving_items', 'q_purchase_receivings',
    'q_quotation_drafts', 'q_quotation_notes_templates', 'q_quotation_versions',
    'q_quotations', 'q_suppliers', 'q_user_product_categories', 'q_worker_types',
    'reconciliation_rules', 'safety_reports', 'salary_advances', 'salary_payments',
    'shift_assignments', 'shifts', 'site_workers', 'sites',
    'tax_rates', 'tenant_members', 'tenant_subscriptions', 'tenants',
    'transaction_categories', 'transactions', 'work_orders', 'workforce_payroll'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    policy_name := 'Super admin can read all ' || tbl;
    -- Drop if exists to make migration idempotent
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    -- Create permissive SELECT policy for super admin
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()))',
      policy_name, tbl
    );
  END LOOP;
END $$;
