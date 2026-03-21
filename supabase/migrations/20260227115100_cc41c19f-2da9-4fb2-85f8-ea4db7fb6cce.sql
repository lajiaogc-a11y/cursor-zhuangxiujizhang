
-- =============================================
-- PHASE 1: Core tables for quotation system merge
-- Skip q_materials, q_suppliers, q_material_supplier_prices (already exist)
-- =============================================

-- Company Settings (for quotation PDF generation)
CREATE TABLE IF NOT EXISTS public.q_company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT '公司名称',
  company_address text,
  ssm_no text,
  bank_info text,
  logo_url text,
  currency text NOT NULL DEFAULT 'MYR',
  validity_period integer NOT NULL DEFAULT 30,
  payment_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_settings jsonb NOT NULL DEFAULT '{"sst_rate": 0, "sst_enabled": false}'::jsonb,
  exchange_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Customers
CREATE TABLE IF NOT EXISTS public.q_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_zh text NOT NULL,
  name_en text,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Product Categories
CREATE TABLE IF NOT EXISTS public.q_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name_zh text NOT NULL,
  name_en text NOT NULL,
  parent_id uuid REFERENCES public.q_product_categories(id),
  default_description text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Product Categories (user-specific category preferences)
CREATE TABLE IF NOT EXISTS public.q_user_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.q_product_categories(id) ON DELETE CASCADE,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Products
CREATE TABLE IF NOT EXISTS public.q_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_zh text NOT NULL,
  name_en text,
  description text,
  description_en text,
  category text,
  unit text NOT NULL DEFAULT '套',
  unit_price numeric NOT NULL DEFAULT 0,
  price_normal numeric,
  price_medium numeric,
  price_advanced numeric,
  is_active boolean NOT NULL DEFAULT true,
  is_company_product boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Product Favorites
CREATE TABLE IF NOT EXISTS public.q_product_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.q_products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Product Templates
CREATE TABLE IF NOT EXISTS public.q_product_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Measurement Units
CREATE TABLE IF NOT EXISTS public.q_measurement_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name_zh text NOT NULL,
  name_en text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quotations
CREATE TABLE IF NOT EXISTS public.q_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_no text NOT NULL,
  customer_id uuid REFERENCES public.q_customers(id),
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  quotation_type text NOT NULL DEFAULT 'quotation',
  status text NOT NULL DEFAULT 'draft',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  sst_amount numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  notes text,
  quotation_notes text,
  settings jsonb,
  cost_analysis jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quotation Versions
CREATE TABLE IF NOT EXISTS public.q_quotation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.q_quotations(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  sst_amount numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  quotation_notes text,
  settings jsonb,
  cost_analysis jsonb,
  change_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Quotation Drafts (auto-save)
CREATE TABLE IF NOT EXISTS public.q_quotation_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  draft_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quotation Notes Templates
CREATE TABLE IF NOT EXISTS public.q_quotation_notes_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  content_en text,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- COST CONTROL TABLES
-- =============================================

-- Methods (工法)
CREATE TABLE IF NOT EXISTS public.q_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_code text NOT NULL,
  name_zh text NOT NULL,
  name_en text,
  description text,
  category_id uuid REFERENCES public.q_product_categories(id),
  default_waste_pct numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Method Materials (工法材料BOM)
CREATE TABLE IF NOT EXISTS public.q_method_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_id uuid REFERENCES public.q_methods(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.q_materials(id) ON DELETE CASCADE,
  quantity_per_unit numeric NOT NULL DEFAULT 1,
  pricing_unit text,
  is_adjustable boolean DEFAULT false,
  adjustable_description text,
  rounding_rule text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Labor Rates (人工费率)
CREATE TABLE IF NOT EXISTS public.q_labor_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_id uuid REFERENCES public.q_methods(id) ON DELETE CASCADE,
  worker_type text NOT NULL,
  hourly_rate numeric NOT NULL DEFAULT 0,
  hours_per_unit numeric NOT NULL DEFAULT 0,
  labor_unit text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Worker Types (工种)
CREATE TABLE IF NOT EXISTS public.q_worker_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_zh text NOT NULL,
  name_en text,
  default_hourly_rate numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Category Method Mapping
CREATE TABLE IF NOT EXISTS public.q_category_method_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.q_product_categories(id) ON DELETE CASCADE,
  method_id uuid NOT NULL REFERENCES public.q_methods(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, method_id)
);

-- Project Breakdowns (成本拆单)
CREATE TABLE IF NOT EXISTS public.q_project_breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES public.q_quotations(id),
  name text NOT NULL,
  status text DEFAULT 'draft',
  quoted_amount numeric DEFAULT 0,
  total_material_cost numeric DEFAULT 0,
  total_labor_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  estimated_profit numeric DEFAULT 0,
  management_fee_pct numeric DEFAULT 0,
  tax_pct numeric DEFAULT 0,
  submitted_to_procurement_at timestamptz,
  submitted_to_procurement_by uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Breakdown Items
CREATE TABLE IF NOT EXISTS public.q_breakdown_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_breakdown_id uuid REFERENCES public.q_project_breakdowns(id) ON DELETE CASCADE,
  quotation_item_id text,
  method_id uuid REFERENCES public.q_methods(id),
  material_id uuid REFERENCES public.q_materials(id),
  quantity numeric NOT NULL DEFAULT 0,
  net_quantity numeric,
  quantity_with_waste numeric,
  waste_pct numeric,
  purchase_quantity numeric,
  unit_price numeric,
  estimated_cost numeric,
  created_at timestamptz DEFAULT now()
);

-- Breakdown Versions
CREATE TABLE IF NOT EXISTS public.q_breakdown_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_breakdown_id uuid NOT NULL REFERENCES public.q_project_breakdowns(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_material_cost numeric DEFAULT 0,
  total_labor_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  change_description text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Breakdown Attachments
CREATE TABLE IF NOT EXISTS public.q_breakdown_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_breakdown_id uuid NOT NULL REFERENCES public.q_project_breakdowns(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size integer,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- PURCHASING TABLES
-- =============================================

-- Procurement Materials (采购材料库, separate from cost control materials)
CREATE TABLE IF NOT EXISTS public.q_procurement_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_code text NOT NULL,
  name_zh text NOT NULL,
  name_en text,
  spec text,
  unit text NOT NULL DEFAULT '个',
  category text,
  reference_price numeric,
  price_cny numeric,
  volume_cbm numeric,
  default_waste_pct numeric,
  default_supplier_id uuid REFERENCES public.q_suppliers(id),
  source_material_id uuid,
  is_active boolean DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS public.q_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL,
  supplier_id uuid REFERENCES public.q_suppliers(id),
  project_breakdown_id uuid REFERENCES public.q_project_breakdowns(id),
  status text DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'unpaid',
  received_status text DEFAULT 'pending',
  delivery_date date,
  notes text,
  submitted_to_finance_at timestamptz,
  submitted_to_finance_by uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS public.q_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE,
  material_id uuid,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  unit_price_cny numeric,
  total_price numeric,
  procurement_country text,
  received_quantity numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Purchase Payments
CREATE TABLE IF NOT EXISTS public.q_purchase_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date date DEFAULT CURRENT_DATE,
  payment_method text,
  reference_no text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Purchase Receivings
CREATE TABLE IF NOT EXISTS public.q_purchase_receivings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE,
  receiving_no text NOT NULL,
  receiving_date date DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Purchase Receiving Items
CREATE TABLE IF NOT EXISTS public.q_purchase_receiving_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_id uuid NOT NULL REFERENCES public.q_purchase_receivings(id) ON DELETE CASCADE,
  purchase_order_item_id uuid REFERENCES public.q_purchase_order_items(id),
  material_id uuid,
  received_quantity numeric NOT NULL DEFAULT 0,
  photos text[],
  notes text,
  exception_notes text,
  created_at timestamptz DEFAULT now()
);

-- PO Attachments
CREATE TABLE IF NOT EXISTS public.q_po_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size integer,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- PO Audit Logs
CREATE TABLE IF NOT EXISTS public.q_po_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text,
  performed_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Inventory
CREATE TABLE IF NOT EXISTS public.q_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL,
  material_source text,
  current_quantity numeric DEFAULT 0,
  min_quantity numeric,
  max_quantity numeric,
  location text,
  updated_at timestamptz DEFAULT now()
);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS public.q_inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL,
  transaction_type text NOT NULL,
  quantity numeric NOT NULL,
  reference_type text,
  reference_id uuid,
  project_no text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.q_company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_user_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_product_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_quotation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_quotation_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_quotation_notes_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_method_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_worker_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_category_method_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_project_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_breakdown_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_breakdown_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_breakdown_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_procurement_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_purchase_receivings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_purchase_receiving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_po_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_po_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: Admin/accountant can manage, authenticated can view
-- Quotation system tables
CREATE POLICY "Admin or accountant can manage q_company_settings" ON public.q_company_settings FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_company_settings" ON public.q_company_settings FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_customers" ON public.q_customers FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_customers" ON public.q_customers FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_product_categories" ON public.q_product_categories FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_product_categories" ON public.q_product_categories FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users manage own q_user_product_categories" ON public.q_user_product_categories FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin or accountant can manage q_products" ON public.q_products FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_products" ON public.q_products FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users manage own q_product_favorites" ON public.q_product_favorites FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own q_product_templates" ON public.q_product_templates FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin or accountant can manage q_measurement_units" ON public.q_measurement_units FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_measurement_units" ON public.q_measurement_units FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_quotations" ON public.q_quotations FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_quotations" ON public.q_quotations FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_quotation_versions" ON public.q_quotation_versions FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_quotation_versions" ON public.q_quotation_versions FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users manage own q_quotation_drafts" ON public.q_quotation_drafts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own q_quotation_notes_templates" ON public.q_quotation_notes_templates FOR ALL USING (auth.uid() = user_id);

-- Cost control tables
CREATE POLICY "Admin or accountant can manage q_methods" ON public.q_methods FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_methods" ON public.q_methods FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_method_materials" ON public.q_method_materials FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_method_materials" ON public.q_method_materials FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_labor_rates" ON public.q_labor_rates FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_labor_rates" ON public.q_labor_rates FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_worker_types" ON public.q_worker_types FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_worker_types" ON public.q_worker_types FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_category_method_mapping" ON public.q_category_method_mapping FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_category_method_mapping" ON public.q_category_method_mapping FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_project_breakdowns" ON public.q_project_breakdowns FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_project_breakdowns" ON public.q_project_breakdowns FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_breakdown_items" ON public.q_breakdown_items FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_breakdown_items" ON public.q_breakdown_items FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_breakdown_versions" ON public.q_breakdown_versions FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_breakdown_versions" ON public.q_breakdown_versions FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_breakdown_attachments" ON public.q_breakdown_attachments FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_breakdown_attachments" ON public.q_breakdown_attachments FOR SELECT USING (auth.uid() IS NOT NULL);

-- Purchasing tables
CREATE POLICY "Admin or accountant can manage q_procurement_materials" ON public.q_procurement_materials FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_procurement_materials" ON public.q_procurement_materials FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_purchase_orders" ON public.q_purchase_orders FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_purchase_orders" ON public.q_purchase_orders FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_purchase_order_items" ON public.q_purchase_order_items FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_purchase_order_items" ON public.q_purchase_order_items FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_purchase_payments" ON public.q_purchase_payments FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_purchase_payments" ON public.q_purchase_payments FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_purchase_receivings" ON public.q_purchase_receivings FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_purchase_receivings" ON public.q_purchase_receivings FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_purchase_receiving_items" ON public.q_purchase_receiving_items FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_purchase_receiving_items" ON public.q_purchase_receiving_items FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_po_attachments" ON public.q_po_attachments FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_po_attachments" ON public.q_po_attachments FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_po_audit_logs" ON public.q_po_audit_logs FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_po_audit_logs" ON public.q_po_audit_logs FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_inventory" ON public.q_inventory FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_inventory" ON public.q_inventory FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or accountant can manage q_inventory_transactions" ON public.q_inventory_transactions FOR ALL USING (is_admin_or_accountant(auth.uid()));
CREATE POLICY "Authenticated can view q_inventory_transactions" ON public.q_inventory_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
