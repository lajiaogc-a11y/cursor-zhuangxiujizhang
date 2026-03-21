
-- ============================================
-- Phase 2 Batch 2: Add tenant_id to Q_ tables
-- ============================================

-- 1. q_quotations
ALTER TABLE public.q_quotations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_quotations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_quotations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_quotations ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_quotations_tenant ON public.q_quotations(tenant_id);

-- 2. q_products
ALTER TABLE public.q_products ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_products SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_products ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_products_tenant ON public.q_products(tenant_id);

-- 3. q_customers
ALTER TABLE public.q_customers ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_customers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_customers ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_customers_tenant ON public.q_customers(tenant_id);

-- 4. q_materials
ALTER TABLE public.q_materials ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_materials SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_materials ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_materials ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_materials_tenant ON public.q_materials(tenant_id);

-- 5. q_suppliers
ALTER TABLE public.q_suppliers ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_suppliers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_suppliers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_suppliers ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_suppliers_tenant ON public.q_suppliers(tenant_id);

-- 6. q_purchase_orders
ALTER TABLE public.q_purchase_orders ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_purchase_orders SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_purchase_orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_purchase_orders ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_purchase_orders_tenant ON public.q_purchase_orders(tenant_id);

-- 7. q_purchase_order_items
ALTER TABLE public.q_purchase_order_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_purchase_order_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_purchase_order_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_purchase_order_items ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_purchase_order_items_tenant ON public.q_purchase_order_items(tenant_id);

-- 8. q_inventory
ALTER TABLE public.q_inventory ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_inventory SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_inventory ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_inventory ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_inventory_tenant ON public.q_inventory(tenant_id);

-- 9. q_inventory_transactions
ALTER TABLE public.q_inventory_transactions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_inventory_transactions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_inventory_transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_inventory_transactions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_inventory_transactions_tenant ON public.q_inventory_transactions(tenant_id);

-- 10. q_material_supplier_prices
ALTER TABLE public.q_material_supplier_prices ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_material_supplier_prices SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_material_supplier_prices ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_material_supplier_prices ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_material_supplier_prices_tenant ON public.q_material_supplier_prices(tenant_id);

-- 11. q_project_breakdowns
ALTER TABLE public.q_project_breakdowns ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_project_breakdowns SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_project_breakdowns ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_project_breakdowns ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_project_breakdowns_tenant ON public.q_project_breakdowns(tenant_id);

-- 12. q_breakdown_items
ALTER TABLE public.q_breakdown_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_breakdown_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_breakdown_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_breakdown_items ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_breakdown_items_tenant ON public.q_breakdown_items(tenant_id);

-- 13. q_breakdown_versions
ALTER TABLE public.q_breakdown_versions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_breakdown_versions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_breakdown_versions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_breakdown_versions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_breakdown_versions_tenant ON public.q_breakdown_versions(tenant_id);

-- 14. q_breakdown_attachments
ALTER TABLE public.q_breakdown_attachments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_breakdown_attachments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_breakdown_attachments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_breakdown_attachments ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_breakdown_attachments_tenant ON public.q_breakdown_attachments(tenant_id);

-- 15. q_product_categories
ALTER TABLE public.q_product_categories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_product_categories SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_product_categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_product_categories ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_product_categories_tenant ON public.q_product_categories(tenant_id);

-- 16. q_product_templates
ALTER TABLE public.q_product_templates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_product_templates SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_product_templates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_product_templates ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_product_templates_tenant ON public.q_product_templates(tenant_id);

-- 17. q_product_favorites
ALTER TABLE public.q_product_favorites ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_product_favorites SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_product_favorites ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_product_favorites ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_product_favorites_tenant ON public.q_product_favorites(tenant_id);

-- 18. q_measurement_units
ALTER TABLE public.q_measurement_units ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_measurement_units SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_measurement_units ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_measurement_units ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_measurement_units_tenant ON public.q_measurement_units(tenant_id);

-- 19. q_methods
ALTER TABLE public.q_methods ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_methods SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_methods ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_methods ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_methods_tenant ON public.q_methods(tenant_id);

-- 20. q_method_materials
ALTER TABLE public.q_method_materials ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_method_materials SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_method_materials ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_method_materials ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_method_materials_tenant ON public.q_method_materials(tenant_id);

-- 21. q_labor_rates
ALTER TABLE public.q_labor_rates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_labor_rates SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_labor_rates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_labor_rates ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_labor_rates_tenant ON public.q_labor_rates(tenant_id);

-- 22. q_worker_types
ALTER TABLE public.q_worker_types ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_worker_types SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_worker_types ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_worker_types ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_worker_types_tenant ON public.q_worker_types(tenant_id);

-- 23. q_category_method_mapping
ALTER TABLE public.q_category_method_mapping ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_category_method_mapping SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_category_method_mapping ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_category_method_mapping ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_category_method_mapping_tenant ON public.q_category_method_mapping(tenant_id);

-- 24. q_company_settings
ALTER TABLE public.q_company_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_company_settings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_company_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_company_settings ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_company_settings_tenant ON public.q_company_settings(tenant_id);

-- 25. q_quotation_versions
ALTER TABLE public.q_quotation_versions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_quotation_versions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_quotation_versions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_quotation_versions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_quotation_versions_tenant ON public.q_quotation_versions(tenant_id);

-- 26. q_quotation_drafts
ALTER TABLE public.q_quotation_drafts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_quotation_drafts SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_quotation_drafts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_quotation_drafts ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_quotation_drafts_tenant ON public.q_quotation_drafts(tenant_id);

-- 27. q_quotation_notes_templates
ALTER TABLE public.q_quotation_notes_templates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_quotation_notes_templates SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_quotation_notes_templates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_quotation_notes_templates ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_quotation_notes_templates_tenant ON public.q_quotation_notes_templates(tenant_id);

-- 28. q_user_product_categories
ALTER TABLE public.q_user_product_categories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_user_product_categories SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_user_product_categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_user_product_categories ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_user_product_categories_tenant ON public.q_user_product_categories(tenant_id);

-- 29. q_procurement_materials
ALTER TABLE public.q_procurement_materials ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_procurement_materials SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_procurement_materials ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_procurement_materials ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_procurement_materials_tenant ON public.q_procurement_materials(tenant_id);

-- 30. q_purchase_payments
ALTER TABLE public.q_purchase_payments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_purchase_payments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_purchase_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_purchase_payments ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_purchase_payments_tenant ON public.q_purchase_payments(tenant_id);

-- 31. q_purchase_receivings
ALTER TABLE public.q_purchase_receivings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_purchase_receivings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_purchase_receivings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_purchase_receivings ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_purchase_receivings_tenant ON public.q_purchase_receivings(tenant_id);

-- 32. q_purchase_receiving_items
ALTER TABLE public.q_purchase_receiving_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_purchase_receiving_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_purchase_receiving_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_purchase_receiving_items ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_purchase_receiving_items_tenant ON public.q_purchase_receiving_items(tenant_id);

-- 33. q_po_attachments
ALTER TABLE public.q_po_attachments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_po_attachments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_po_attachments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_po_attachments ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_po_attachments_tenant ON public.q_po_attachments(tenant_id);

-- 34. q_po_audit_logs
ALTER TABLE public.q_po_audit_logs ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.q_po_audit_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.q_po_audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.q_po_audit_logs ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX idx_q_po_audit_logs_tenant ON public.q_po_audit_logs(tenant_id);
