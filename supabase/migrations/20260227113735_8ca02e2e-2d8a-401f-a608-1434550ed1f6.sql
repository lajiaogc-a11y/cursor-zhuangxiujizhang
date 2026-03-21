
-- Phase 1: Materials + Suppliers tables

-- 1. Materials catalog
CREATE TABLE public.q_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  category text DEFAULT '其他',
  unit text DEFAULT '个',
  specification text,
  brand text,
  default_price numeric DEFAULT 0,
  currency text DEFAULT 'MYR',
  min_stock numeric DEFAULT 0,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Suppliers (separate from contacts for quotation-specific fields)
CREATE TABLE public.q_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  company_name text,
  payment_terms text,
  default_currency text DEFAULT 'MYR',
  rating integer DEFAULT 0,
  notes text,
  is_active boolean DEFAULT true,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Material-supplier price mapping
CREATE TABLE public.q_material_supplier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.q_materials(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.q_suppliers(id) ON DELETE CASCADE,
  unit_price numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'MYR',
  min_order_qty numeric DEFAULT 1,
  lead_days integer DEFAULT 0,
  is_preferred boolean DEFAULT false,
  last_quoted_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(material_id, supplier_id)
);

-- Enable RLS
ALTER TABLE public.q_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_material_supplier_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies for q_materials
CREATE POLICY "Admin or accountant can manage materials"
  ON public.q_materials FOR ALL
  USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view materials"
  ON public.q_materials FOR SELECT
  USING (has_nav_permission(auth.uid(), 'nav.materials'));

-- RLS policies for q_suppliers
CREATE POLICY "Admin or accountant can manage suppliers"
  ON public.q_suppliers FOR ALL
  USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view suppliers"
  ON public.q_suppliers FOR SELECT
  USING (has_nav_permission(auth.uid(), 'nav.suppliers'));

-- RLS policies for q_material_supplier_prices
CREATE POLICY "Admin or accountant can manage material prices"
  ON public.q_material_supplier_prices FOR ALL
  USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view material prices"
  ON public.q_material_supplier_prices FOR SELECT
  USING (has_nav_permission(auth.uid(), 'nav.materials') OR has_nav_permission(auth.uid(), 'nav.suppliers'));

-- Audit triggers
CREATE TRIGGER audit_q_materials
  AFTER INSERT OR UPDATE OR DELETE ON public.q_materials
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER audit_q_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON public.q_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER audit_q_material_supplier_prices
  AFTER INSERT OR UPDATE OR DELETE ON public.q_material_supplier_prices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- Updated_at triggers
CREATE TRIGGER update_q_materials_updated_at
  BEFORE UPDATE ON public.q_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_q_suppliers_updated_at
  BEFORE UPDATE ON public.q_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_q_material_supplier_prices_updated_at
  BEFORE UPDATE ON public.q_material_supplier_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
