
-- ============================================
-- Phase 2 Batch 1: Add tenant_id to CORE financial tables
-- ============================================

-- Helper: Add tenant_id column, backfill default tenant, set NOT NULL, add index
-- We do this for each table individually

-- 1. transactions
ALTER TABLE public.transactions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.transactions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_transactions_tenant ON public.transactions(tenant_id);

-- 2. projects
ALTER TABLE public.projects ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.projects SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.projects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_projects_tenant ON public.projects(tenant_id);

-- 3. employees
ALTER TABLE public.employees ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.employees SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.employees ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.employees ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_employees_tenant ON public.employees(tenant_id);

-- 4. company_accounts
ALTER TABLE public.company_accounts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.company_accounts SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.company_accounts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.company_accounts ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_company_accounts_tenant ON public.company_accounts(tenant_id);

-- 5. exchange_rates
ALTER TABLE public.exchange_rates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.exchange_rates SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.exchange_rates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.exchange_rates ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_exchange_rates_tenant ON public.exchange_rates(tenant_id);

-- 6. exchange_transactions
ALTER TABLE public.exchange_transactions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.exchange_transactions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.exchange_transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.exchange_transactions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_exchange_transactions_tenant ON public.exchange_transactions(tenant_id);

-- 7. payables
ALTER TABLE public.payables ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.payables SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.payables ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payables ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_payables_tenant ON public.payables(tenant_id);

-- 8. payable_payments
ALTER TABLE public.payable_payments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.payable_payments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.payable_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payable_payments ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_payable_payments_tenant ON public.payable_payments(tenant_id);

-- 9. project_expenses
ALTER TABLE public.project_expenses ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.project_expenses SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.project_expenses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.project_expenses ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_project_expenses_tenant ON public.project_expenses(tenant_id);

-- 10. project_payments
ALTER TABLE public.project_payments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.project_payments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.project_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.project_payments ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_project_payments_tenant ON public.project_payments(tenant_id);

-- 11. project_additions
ALTER TABLE public.project_additions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.project_additions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.project_additions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.project_additions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_project_additions_tenant ON public.project_additions(tenant_id);

-- 12. project_alerts
ALTER TABLE public.project_alerts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.project_alerts SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.project_alerts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.project_alerts ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_project_alerts_tenant ON public.project_alerts(tenant_id);

-- 13. project_categories
ALTER TABLE public.project_categories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.project_categories SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.project_categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.project_categories ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_project_categories_tenant ON public.project_categories(tenant_id);

-- 14. contacts
ALTER TABLE public.contacts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.contacts SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.contacts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_contacts_tenant ON public.contacts(tenant_id);

-- 15. invoices
ALTER TABLE public.invoices ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.invoices SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.invoices ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id);

-- 16. invoice_items
ALTER TABLE public.invoice_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.invoice_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.invoice_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.invoice_items ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_invoice_items_tenant ON public.invoice_items(tenant_id);

-- 17. fixed_assets
ALTER TABLE public.fixed_assets ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.fixed_assets SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.fixed_assets ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.fixed_assets ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_fixed_assets_tenant ON public.fixed_assets(tenant_id);

-- 18. memos
ALTER TABLE public.memos ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.memos SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.memos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.memos ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_memos_tenant ON public.memos(tenant_id);

-- 19. salary_payments
ALTER TABLE public.salary_payments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.salary_payments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.salary_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.salary_payments ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_salary_payments_tenant ON public.salary_payments(tenant_id);

-- 20. salary_advances
ALTER TABLE public.salary_advances ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.salary_advances SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.salary_advances ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.salary_advances ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_salary_advances_tenant ON public.salary_advances(tenant_id);

-- 21. insurance_payments
ALTER TABLE public.insurance_payments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.insurance_payments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.insurance_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.insurance_payments ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_insurance_payments_tenant ON public.insurance_payments(tenant_id);

-- 22. alert_rules
ALTER TABLE public.alert_rules ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.alert_rules SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.alert_rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.alert_rules ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_alert_rules_tenant ON public.alert_rules(tenant_id);

-- 23. approval_rules
ALTER TABLE public.approval_rules ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.approval_rules SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.approval_rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.approval_rules ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_approval_rules_tenant ON public.approval_rules(tenant_id);

-- 24. approval_requests
ALTER TABLE public.approval_requests ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.approval_requests SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.approval_requests ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.approval_requests ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_approval_requests_tenant ON public.approval_requests(tenant_id);

-- 25. employee_positions
ALTER TABLE public.employee_positions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.employee_positions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.employee_positions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.employee_positions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_employee_positions_tenant ON public.employee_positions(tenant_id);

-- 26. payroll_settings
ALTER TABLE public.payroll_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.payroll_settings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.payroll_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payroll_settings ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_payroll_settings_tenant ON public.payroll_settings(tenant_id);

-- 27. transaction_categories
ALTER TABLE public.transaction_categories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.transaction_categories SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.transaction_categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.transaction_categories ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_transaction_categories_tenant ON public.transaction_categories(tenant_id);

-- 28. tax_rates
ALTER TABLE public.tax_rates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.tax_rates SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.tax_rates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.tax_rates ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_tax_rates_tenant ON public.tax_rates(tenant_id);

-- 29. bank_import_batches
ALTER TABLE public.bank_import_batches ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.bank_import_batches SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.bank_import_batches ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.bank_import_batches ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_bank_import_batches_tenant ON public.bank_import_batches(tenant_id);

-- 30. bank_statements
ALTER TABLE public.bank_statements ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.bank_statements SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.bank_statements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.bank_statements ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_bank_statements_tenant ON public.bank_statements(tenant_id);

-- 31. reconciliation_rules
ALTER TABLE public.reconciliation_rules ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.reconciliation_rules SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.reconciliation_rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.reconciliation_rules ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_reconciliation_rules_tenant ON public.reconciliation_rules(tenant_id);
