
-- Contract Payment Plans (Milestone Payments)
CREATE TABLE public.contract_payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  milestone_name text NOT NULL,
  percentage numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'MYR',
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  paid_amount numeric DEFAULT 0,
  paid_at timestamptz,
  payment_method text,
  receipt_url text,
  sort_order int DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  tenant_id uuid DEFAULT get_user_tenant_id() REFERENCES tenants(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contract_payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_payment_plans" ON public.contract_payment_plans
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_insert_payment_plans" ON public.contract_payment_plans
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_update_payment_plans" ON public.contract_payment_plans
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_delete_payment_plans" ON public.contract_payment_plans
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE TRIGGER audit_contract_payment_plans
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_payment_plans
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER set_updated_at_payment_plans
  BEFORE UPDATE ON public.contract_payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
