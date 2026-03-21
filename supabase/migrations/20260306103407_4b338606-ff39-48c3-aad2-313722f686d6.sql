
-- ============================================
-- Phase 2.5 Batch 2: Rewrite RLS for Q_ tables with tenant_id
-- ============================================

-- q_quotations
DROP POLICY IF EXISTS "Authenticated users can manage quotations" ON public.q_quotations;
DROP POLICY IF EXISTS "Users can manage own quotations" ON public.q_quotations;
CREATE POLICY "Tenant members can manage quotations"
  ON public.q_quotations FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_products
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.q_products;
CREATE POLICY "Tenant members can manage products"
  ON public.q_products FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_customers
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.q_customers;
CREATE POLICY "Tenant members can manage customers"
  ON public.q_customers FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_materials
DROP POLICY IF EXISTS "Authenticated users can manage materials" ON public.q_materials;
DROP POLICY IF EXISTS "Admin or accountant can manage materials" ON public.q_materials;
CREATE POLICY "Tenant members can manage materials"
  ON public.q_materials FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_suppliers
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.q_suppliers;
DROP POLICY IF EXISTS "Admin or accountant can manage suppliers" ON public.q_suppliers;
CREATE POLICY "Tenant members can manage suppliers"
  ON public.q_suppliers FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_purchase_orders
DROP POLICY IF EXISTS "Authenticated users can manage purchase orders" ON public.q_purchase_orders;
DROP POLICY IF EXISTS "Admin or accountant can manage purchase orders" ON public.q_purchase_orders;
CREATE POLICY "Tenant members can manage purchase orders"
  ON public.q_purchase_orders FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_purchase_order_items
DROP POLICY IF EXISTS "Authenticated users can manage purchase order items" ON public.q_purchase_order_items;
CREATE POLICY "Tenant members can manage purchase order items"
  ON public.q_purchase_order_items FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_inventory
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.q_inventory;
CREATE POLICY "Tenant members can manage inventory"
  ON public.q_inventory FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_inventory_transactions
DROP POLICY IF EXISTS "Authenticated users can manage inventory transactions" ON public.q_inventory_transactions;
CREATE POLICY "Tenant members can manage inventory transactions"
  ON public.q_inventory_transactions FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_material_supplier_prices
DROP POLICY IF EXISTS "Authenticated users can manage material supplier prices" ON public.q_material_supplier_prices;
DROP POLICY IF EXISTS "Admin or accountant can manage material prices" ON public.q_material_supplier_prices;
CREATE POLICY "Tenant members can manage material prices"
  ON public.q_material_supplier_prices FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_project_breakdowns
DROP POLICY IF EXISTS "Authenticated users can manage project breakdowns" ON public.q_project_breakdowns;
CREATE POLICY "Tenant members can manage project breakdowns"
  ON public.q_project_breakdowns FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_breakdown_items
DROP POLICY IF EXISTS "Authenticated users can manage breakdown items" ON public.q_breakdown_items;
CREATE POLICY "Tenant members can manage breakdown items"
  ON public.q_breakdown_items FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_breakdown_versions
DROP POLICY IF EXISTS "Authenticated users can manage breakdown versions" ON public.q_breakdown_versions;
CREATE POLICY "Tenant members can manage breakdown versions"
  ON public.q_breakdown_versions FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_breakdown_attachments
DROP POLICY IF EXISTS "Authenticated users can manage breakdown attachments" ON public.q_breakdown_attachments;
CREATE POLICY "Tenant members can manage breakdown attachments"
  ON public.q_breakdown_attachments FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_product_categories
DROP POLICY IF EXISTS "Authenticated users can manage product categories" ON public.q_product_categories;
CREATE POLICY "Tenant members can manage product categories"
  ON public.q_product_categories FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_product_templates
DROP POLICY IF EXISTS "Authenticated users can manage product templates" ON public.q_product_templates;
CREATE POLICY "Tenant members can manage product templates"
  ON public.q_product_templates FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_product_favorites
DROP POLICY IF EXISTS "Authenticated users can manage product favorites" ON public.q_product_favorites;
CREATE POLICY "Tenant members can manage product favorites"
  ON public.q_product_favorites FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_measurement_units
DROP POLICY IF EXISTS "Authenticated users can manage measurement units" ON public.q_measurement_units;
CREATE POLICY "Tenant members can manage measurement units"
  ON public.q_measurement_units FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_methods
DROP POLICY IF EXISTS "Authenticated users can manage methods" ON public.q_methods;
CREATE POLICY "Tenant members can manage methods"
  ON public.q_methods FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_method_materials
DROP POLICY IF EXISTS "Authenticated users can manage method materials" ON public.q_method_materials;
CREATE POLICY "Tenant members can manage method materials"
  ON public.q_method_materials FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_labor_rates
DROP POLICY IF EXISTS "Authenticated users can manage labor rates" ON public.q_labor_rates;
CREATE POLICY "Tenant members can manage labor rates"
  ON public.q_labor_rates FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_worker_types
DROP POLICY IF EXISTS "Authenticated users can manage worker types" ON public.q_worker_types;
CREATE POLICY "Tenant members can manage worker types"
  ON public.q_worker_types FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_category_method_mapping
DROP POLICY IF EXISTS "Authenticated users can manage category method mapping" ON public.q_category_method_mapping;
CREATE POLICY "Tenant members can manage category method mapping"
  ON public.q_category_method_mapping FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_company_settings
DROP POLICY IF EXISTS "Authenticated users can manage company settings" ON public.q_company_settings;
CREATE POLICY "Tenant members can manage company settings"
  ON public.q_company_settings FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_quotation_versions
DROP POLICY IF EXISTS "Authenticated users can manage quotation versions" ON public.q_quotation_versions;
CREATE POLICY "Tenant members can manage quotation versions"
  ON public.q_quotation_versions FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_quotation_drafts
DROP POLICY IF EXISTS "Authenticated users can manage quotation drafts" ON public.q_quotation_drafts;
CREATE POLICY "Tenant members can manage quotation drafts"
  ON public.q_quotation_drafts FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_quotation_notes_templates
DROP POLICY IF EXISTS "Authenticated users can manage quotation notes templates" ON public.q_quotation_notes_templates;
CREATE POLICY "Tenant members can manage quotation notes templates"
  ON public.q_quotation_notes_templates FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_user_product_categories
DROP POLICY IF EXISTS "Authenticated users can manage user product categories" ON public.q_user_product_categories;
CREATE POLICY "Tenant members can manage user product categories"
  ON public.q_user_product_categories FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_procurement_materials
DROP POLICY IF EXISTS "Authenticated users can manage procurement materials" ON public.q_procurement_materials;
CREATE POLICY "Tenant members can manage procurement materials"
  ON public.q_procurement_materials FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_purchase_payments
DROP POLICY IF EXISTS "Authenticated users can manage purchase payments" ON public.q_purchase_payments;
CREATE POLICY "Tenant members can manage purchase payments"
  ON public.q_purchase_payments FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_purchase_receivings
DROP POLICY IF EXISTS "Authenticated users can manage purchase receivings" ON public.q_purchase_receivings;
CREATE POLICY "Tenant members can manage purchase receivings"
  ON public.q_purchase_receivings FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_purchase_receiving_items
DROP POLICY IF EXISTS "Authenticated users can manage purchase receiving items" ON public.q_purchase_receiving_items;
CREATE POLICY "Tenant members can manage purchase receiving items"
  ON public.q_purchase_receiving_items FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_po_attachments
DROP POLICY IF EXISTS "Authenticated users can manage po attachments" ON public.q_po_attachments;
CREATE POLICY "Tenant members can manage po attachments"
  ON public.q_po_attachments FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- q_po_audit_logs
DROP POLICY IF EXISTS "Authenticated users can manage po audit logs" ON public.q_po_audit_logs;
CREATE POLICY "Tenant members can manage po audit logs"
  ON public.q_po_audit_logs FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
