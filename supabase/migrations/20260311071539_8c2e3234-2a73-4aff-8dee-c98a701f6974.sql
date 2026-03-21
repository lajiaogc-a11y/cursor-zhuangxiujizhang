
-- Contract Templates
CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content text NOT NULL DEFAULT '',
  merge_fields jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  tenant_id uuid DEFAULT get_user_tenant_id() REFERENCES tenants(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL,
  title text NOT NULL,
  template_id uuid REFERENCES public.contract_templates(id),
  contact_id uuid REFERENCES public.contacts(id),
  project_id uuid REFERENCES public.projects(id),
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  currency text DEFAULT 'MYR',
  signed_at timestamptz,
  effective_date date,
  expiry_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  tenant_id uuid DEFAULT get_user_tenant_id() REFERENCES tenants(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contract Signatures
CREATE TABLE public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_role text DEFAULT 'customer',
  signature_data text,
  signature_url text,
  ip_address text,
  user_agent text,
  signed_at timestamptz DEFAULT now(),
  tenant_id uuid DEFAULT get_user_tenant_id() REFERENCES tenants(id)
);

-- RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- contract_templates policies
CREATE POLICY "tenant_select_contract_templates" ON public.contract_templates
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_insert_contract_templates" ON public.contract_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_update_contract_templates" ON public.contract_templates
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_delete_contract_templates" ON public.contract_templates
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

-- contracts policies
CREATE POLICY "tenant_select_contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_insert_contracts" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_update_contracts" ON public.contracts
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_delete_contracts" ON public.contracts
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

-- contract_signatures policies
CREATE POLICY "tenant_select_contract_signatures" ON public.contract_signatures
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_insert_contract_signatures" ON public.contract_signatures
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

-- Audit triggers
CREATE TRIGGER audit_contract_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_contract_signatures
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_signatures
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- Updated_at triggers
CREATE TRIGGER set_updated_at_contract_templates
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_contracts
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for contracts
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
