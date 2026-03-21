
-- ============================================
-- 1. Add Missing Foreign Keys
-- ============================================

-- q_methods.category_id → q_product_categories
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_methods_category_id_fkey') THEN
    ALTER TABLE public.q_methods
      ADD CONSTRAINT q_methods_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.q_product_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- q_method_materials.method_id → q_methods
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_method_materials_method_id_fkey') THEN
    ALTER TABLE public.q_method_materials
      ADD CONSTRAINT q_method_materials_method_id_fkey
      FOREIGN KEY (method_id) REFERENCES public.q_methods(id) ON DELETE CASCADE;
  END IF;
END $$;

-- q_method_materials.material_id → q_materials
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_method_materials_material_id_fkey') THEN
    ALTER TABLE public.q_method_materials
      ADD CONSTRAINT q_method_materials_material_id_fkey
      FOREIGN KEY (material_id) REFERENCES public.q_materials(id) ON DELETE CASCADE;
  END IF;
END $$;

-- q_breakdown_items.project_breakdown_id → q_project_breakdowns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_breakdown_items_project_breakdown_id_fkey') THEN
    ALTER TABLE public.q_breakdown_items
      ADD CONSTRAINT q_breakdown_items_project_breakdown_id_fkey
      FOREIGN KEY (project_breakdown_id) REFERENCES public.q_project_breakdowns(id) ON DELETE CASCADE;
  END IF;
END $$;

-- q_breakdown_items.method_id → q_methods
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_breakdown_items_method_id_fkey') THEN
    ALTER TABLE public.q_breakdown_items
      ADD CONSTRAINT q_breakdown_items_method_id_fkey
      FOREIGN KEY (method_id) REFERENCES public.q_methods(id) ON DELETE SET NULL;
  END IF;
END $$;

-- q_breakdown_items.material_id → q_materials
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_breakdown_items_material_id_fkey') THEN
    ALTER TABLE public.q_breakdown_items
      ADD CONSTRAINT q_breakdown_items_material_id_fkey
      FOREIGN KEY (material_id) REFERENCES public.q_materials(id) ON DELETE SET NULL;
  END IF;
END $$;

-- q_breakdown_versions.project_breakdown_id → q_project_breakdowns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_breakdown_versions_project_breakdown_id_fkey') THEN
    ALTER TABLE public.q_breakdown_versions
      ADD CONSTRAINT q_breakdown_versions_project_breakdown_id_fkey
      FOREIGN KEY (project_breakdown_id) REFERENCES public.q_project_breakdowns(id) ON DELETE CASCADE;
  END IF;
END $$;

-- q_po_audit_logs.purchase_order_id → q_purchase_orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_po_audit_logs_purchase_order_id_fkey') THEN
    ALTER TABLE public.q_po_audit_logs
      ADD CONSTRAINT q_po_audit_logs_purchase_order_id_fkey
      FOREIGN KEY (purchase_order_id) REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- q_po_attachments.purchase_order_id → q_purchase_orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_po_attachments_purchase_order_id_fkey') THEN
    ALTER TABLE public.q_po_attachments
      ADD CONSTRAINT q_po_attachments_purchase_order_id_fkey
      FOREIGN KEY (purchase_order_id) REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- q_purchase_payments.purchase_order_id → q_purchase_orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'q_purchase_payments_purchase_order_id_fkey') THEN
    ALTER TABLE public.q_purchase_payments
      ADD CONSTRAINT q_purchase_payments_purchase_order_id_fkey
      FOREIGN KEY (purchase_order_id) REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 2. Add Performance Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON public.transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON public.exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON public.exchange_rates(rate_date DESC);

CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON public.project_expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_project_payments_project_id ON public.project_payments(project_id);

CREATE INDEX IF NOT EXISTS idx_payables_status ON public.payables(status);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON public.payables(due_date);
CREATE INDEX IF NOT EXISTS idx_payables_project_id ON public.payables(project_id);

CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_id ON public.salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_month ON public.salary_payments(payment_month);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

CREATE INDEX IF NOT EXISTS idx_q_breakdown_items_breakdown ON public.q_breakdown_items(project_breakdown_id);
CREATE INDEX IF NOT EXISTS idx_q_method_materials_method ON public.q_method_materials(method_id);

CREATE INDEX IF NOT EXISTS idx_bank_statements_batch ON public.bank_statements(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_date ON public.bank_statements(statement_date);

-- ============================================
-- 3. Remove Duplicate Overly-Permissive RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can manage q_po_audit_logs" ON public.q_po_audit_logs;
DROP POLICY IF EXISTS "Authenticated users can manage q_purchase_receiving_items" ON public.q_purchase_receiving_items;
DROP POLICY IF EXISTS "Authenticated users can manage q_purchase_payments" ON public.q_purchase_payments;
DROP POLICY IF EXISTS "Authenticated users can manage q_po_attachments" ON public.q_po_attachments;
