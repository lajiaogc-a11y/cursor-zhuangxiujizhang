
-- Contract Amendments (Change Orders)
CREATE TABLE public.contract_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  amendment_number text NOT NULL,
  title text NOT NULL,
  description text,
  amount_change numeric DEFAULT 0,
  new_total_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  review_note text,
  tenant_id uuid DEFAULT get_user_tenant_id() REFERENCES tenants(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_amendments" ON public.contract_amendments
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_insert_amendments" ON public.contract_amendments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_update_amendments" ON public.contract_amendments
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_delete_amendments" ON public.contract_amendments
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE TRIGGER audit_contract_amendments
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_amendments
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER set_updated_at_contract_amendments
  BEFORE UPDATE ON public.contract_amendments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
