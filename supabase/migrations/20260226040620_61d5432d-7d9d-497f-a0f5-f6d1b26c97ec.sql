
-- Create error_logs table for frontend error tracking
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message text NOT NULL,
  error_stack text,
  component_stack text,
  url text,
  user_agent text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert errors
CREATE POLICY "Authenticated users can insert error logs"
ON public.error_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Only admins can view error logs
CREATE POLICY "Admins can view error logs"
ON public.error_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete error logs
CREATE POLICY "Admins can delete error logs"
ON public.error_logs FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add composite indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_transactions_date_currency ON public.transactions (transaction_date, currency);
CREATE INDEX IF NOT EXISTS idx_transactions_ledger_project ON public.transactions (ledger_type, project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON public.transactions (type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_category ON public.project_expenses (project_id, category);
CREATE INDEX IF NOT EXISTS idx_project_payments_project ON public.project_payments (project_id);
CREATE INDEX IF NOT EXISTS idx_project_additions_project ON public.project_additions (project_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_date ON public.exchange_rates (from_currency, to_currency, rate_date DESC);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_month ON public.salary_payments (employee_id, payment_month);
CREATE INDEX IF NOT EXISTS idx_payables_status ON public.payables (status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_date ON public.audit_logs (table_name, created_at DESC);

-- Tighten RLS on sensitive tables: employees
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
CREATE POLICY "Users with payroll permission can view employees"
ON public.employees FOR SELECT TO authenticated
USING (has_nav_permission(auth.uid(), 'nav.payroll'::text));

-- Tighten RLS on sensitive tables: salary_payments
DROP POLICY IF EXISTS "Authenticated users can view salary payments" ON public.salary_payments;
CREATE POLICY "Users with payroll permission can view salary payments"
ON public.salary_payments FOR SELECT TO authenticated
USING (has_nav_permission(auth.uid(), 'nav.payroll'::text));

-- Tighten RLS on sensitive tables: salary_advances
DROP POLICY IF EXISTS "Authenticated users can view salary advances" ON public.salary_advances;
CREATE POLICY "Users with payroll permission can view salary advances"
ON public.salary_advances FOR SELECT TO authenticated
USING (has_nav_permission(auth.uid(), 'nav.payroll'::text));

-- Tighten RLS on sensitive tables: insurance_payments
DROP POLICY IF EXISTS "Authenticated users can view insurance payments" ON public.insurance_payments;
CREATE POLICY "Users with payroll permission can view insurance payments"
ON public.insurance_payments FOR SELECT TO authenticated
USING (has_nav_permission(auth.uid(), 'nav.payroll'::text));
