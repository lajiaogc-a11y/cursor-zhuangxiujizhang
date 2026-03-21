/**
 * Cost Control Service
 * 
 * 成本管控模块的数据访问层。
 * 覆盖：材料库、工法、工种、人工定额、分类映射、预算拆解、税务设置等。
 */

import { supabase, handleSupabaseError } from './base';

// ==================== Stats ====================

export async function fetchCostControlStats() {
  const [matRes, methodRes, breakdownRes] = await Promise.all([
    (supabase as any).from('q_materials').select('id', { count: 'exact', head: true }),
    (supabase as any).from('q_methods').select('id', { count: 'exact', head: true }),
    (supabase as any).from('q_project_breakdowns').select('id, total_material_cost, status'),
  ]);
  const active = (breakdownRes.data || []).filter((b: any) => b.status === 'draft' || b.status === 'submitted');
  const totalCost = active.reduce((s: number, b: any) => s + (Number(b.total_material_cost) || 0), 0);
  return { materials: matRes.count || 0, methods: methodRes.count || 0, activeProjects: active.length, monthlyCost: totalCost };
}

// ==================== Suppliers (for dropdowns) ====================

export async function fetchActiveSuppliers() {
  const { data, error } = await (supabase as any).from('q_suppliers').select('id, name').eq('is_active', true).order('name');
  if (error) handleSupabaseError(error);
  return data || [];
}

// ==================== Materials ====================

export async function saveMaterial(m: any, userId?: string) {
  const payload = {
    name: m.nameZh, code: m.materialCode, specification: m.spec, unit: m.unit,
    default_price: m.defaultPrice, notes: m.notes, waste_pct: m.defaultWastePct,
    price_cny: m.priceCny, volume_cbm: m.volumeCbm,
    default_supplier_id: m.defaultSupplierId || null,
    material_type: 'cost',
  };
  if (m.id) {
    const { error } = await (supabase as any).from('q_materials').update(payload).eq('id', m.id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await (supabase as any).from('q_materials').insert({ ...payload, created_by: userId });
    if (error) handleSupabaseError(error);
  }
}

export async function deactivateMaterial(id: string) {
  const { error } = await (supabase as any).from('q_materials').update({ is_active: false }).eq('id', id);
  if (error) handleSupabaseError(error);
}

// ==================== Methods ====================

export async function fetchMethods(tenantId: string) {
  const { data, error } = await (supabase as any).from('q_methods').select('*').eq('is_active', true).eq('tenant_id', tenantId).order('method_code', { ascending: true });
  if (error) handleSupabaseError(error);
  return (data || []).map((m: any) => ({
    id: m.id, methodCode: m.method_code || '', nameZh: m.name_zh || '', nameEn: m.name_en || '',
    categoryId: m.category_id || '', defaultWastePct: Number(m.default_waste_pct) || 0,
    description: m.description || '',
  }));
}

export async function saveMethod(m: any, userId?: string, tenantId?: string) {
  const payload = { method_code: m.methodCode, name_zh: m.nameZh, name_en: m.nameEn, category_id: m.categoryId || null, default_waste_pct: m.defaultWastePct, description: m.description };
  if (m.id) {
    const { error } = await (supabase as any).from('q_methods').update(payload).eq('id', m.id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await (supabase as any).from('q_methods').insert({ ...payload, created_by: userId, tenant_id: tenantId });
    if (error) handleSupabaseError(error);
  }
}

export async function deactivateMethod(id: string) {
  const { error } = await (supabase as any).from('q_methods').update({ is_active: false }).eq('id', id);
  if (error) handleSupabaseError(error);
}

// ==================== Worker Types ====================

export async function fetchWorkerTypes(tenantId: string) {
  const { data, error } = await (supabase as any).from('q_worker_types').select('*').eq('is_active', true).eq('tenant_id', tenantId).order('sort_order', { ascending: true });
  if (error) handleSupabaseError(error);
  return (data || []).map((t: any) => ({
    id: t.id, nameZh: t.name_zh || '', nameEn: t.name_en || '',
    hourlyRate: Number(t.default_hourly_rate) || 0, sortOrder: Number(t.sort_order) || 0,
    isActive: t.is_active !== false,
  }));
}

export async function saveWorkerType(wt: any, userId?: string) {
  const payload = { name_zh: wt.nameZh, name_en: wt.nameEn, default_hourly_rate: wt.hourlyRate, sort_order: wt.sortOrder };
  if (wt.id) {
    const { error } = await (supabase as any).from('q_worker_types').update(payload).eq('id', wt.id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await (supabase as any).from('q_worker_types').insert({ ...payload, created_by: userId });
    if (error) handleSupabaseError(error);
  }
}

export async function deactivateWorkerType(id: string) {
  const { error } = await (supabase as any).from('q_worker_types').update({ is_active: false }).eq('id', id);
  if (error) handleSupabaseError(error);
}

// ==================== Labor Rates ====================

export async function fetchLaborRates(tenantId: string) {
  const { data, error } = await (supabase as any).from('q_labor_rates').select('*, q_methods(method_code, name_zh)').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []).map((r: any) => ({
    id: r.id, methodId: r.method_id || '', methodCode: r.q_methods?.method_code || '',
    methodName: r.q_methods?.name_zh || '', workerType: r.worker_type || '',
    hourlyRate: Number(r.hourly_rate) || 0, hoursPerUnit: Number(r.hours_per_unit) || 0,
    laborUnit: r.labor_unit || '', notes: r.notes || '',
  }));
}

export async function saveLaborRate(r: any, userId?: string) {
  const payload = { method_id: r.methodId, worker_type: r.workerType, hourly_rate: r.hourlyRate, hours_per_unit: r.hoursPerUnit, labor_unit: r.laborUnit, notes: r.notes };
  if (r.id) {
    const { error } = await (supabase as any).from('q_labor_rates').update(payload).eq('id', r.id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await (supabase as any).from('q_labor_rates').insert({ ...payload, created_by: userId });
    if (error) handleSupabaseError(error);
  }
}

export async function deleteLaborRate(id: string) {
  const { error } = await (supabase as any).from('q_labor_rates').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ==================== Methods Select (lightweight) ====================

export async function fetchMethodsSelect() {
  const { data } = await (supabase as any).from('q_methods').select('id, method_code, name_zh').eq('is_active', true).order('method_code');
  return data || [];
}

export async function fetchWorkerTypesSelect() {
  const { data } = await (supabase as any).from('q_worker_types').select('name_zh, default_hourly_rate').eq('is_active', true).order('sort_order');
  return data || [];
}

// ==================== Category Mapping ====================

export async function fetchCategoryMethodMappings(tenantId: string) {
  const { data, error } = await (supabase as any)
    .from('q_category_method_mapping')
    .select('id, category_id, method_id, q_product_categories(code, name_zh, parent_name), q_methods(method_code, name_zh)')
    .eq('tenant_id', tenantId)
    .order('created_at');
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchProductCategories() {
  const { data } = await (supabase as any).from('q_product_categories').select('id, code, name_zh, parent_id').order('sort_order');
  return data || [];
}

export async function saveCategoryMethods(categoryId: string, methodIds: string[], userId?: string) {
  const { error: delErr } = await (supabase as any).from('q_category_method_mapping').delete().eq('category_id', categoryId);
  if (delErr) handleSupabaseError(delErr);
  if (methodIds.length > 0) {
    const rows = methodIds.map(mid => ({ category_id: categoryId, method_id: mid, created_by: userId }));
    const { error: insErr } = await (supabase as any).from('q_category_method_mapping').insert(rows);
    if (insErr) handleSupabaseError(insErr);
  }
}

export async function deleteCategoryMappings(categoryId: string) {
  const { error } = await (supabase as any).from('q_category_method_mapping').delete().eq('category_id', categoryId);
  if (error) handleSupabaseError(error);
}

// ==================== Method Materials ====================

export async function fetchMethodsWithMaterialCounts() {
  const { data: methodsData } = await (supabase as any).from('q_methods').select('id, name_zh, is_active').order('name_zh');
  const { data: mmData } = await (supabase as any).from('q_method_materials').select('method_id');
  const countMap = new Map<string, number>();
  (mmData || []).forEach((mm: any) => { countMap.set(mm.method_id, (countMap.get(mm.method_id) || 0) + 1); });
  return (methodsData || []).map((m: any) => ({ id: m.id, name: m.name_zh, isActive: m.is_active, materialCount: countMap.get(m.id) || 0 }));
}

export async function fetchMethodInfo(methodId: string) {
  const { data } = await (supabase as any).from('q_methods').select('id, name_zh, method_code').eq('id', methodId).single();
  return data ? { id: data.id, name: data.name_zh, code: data.method_code } : null;
}

export async function fetchMethodMaterials(methodId: string) {
  const { data } = await (supabase as any).from('q_method_materials').select('*, q_materials(name, unit, code)').eq('method_id', methodId).order('created_at');
  return (data || []).map((mm: any) => ({
    id: mm.id, materialId: mm.material_id,
    materialName: mm.q_materials?.name || '', materialUnit: mm.q_materials?.unit || '', materialCode: mm.q_materials?.code || '',
    quantityPerUnit: Number(mm.quantity_per_unit) || 1, pricingUnit: mm.pricing_unit || '',
    notes: mm.notes || '', isAdjustable: mm.is_adjustable || false,
    adjustableDescription: mm.adjustable_description || '', roundingRule: mm.rounding_rule || '',
  }));
}

export async function addMethodMaterial(methodId: string, data: any) {
  const { error } = await (supabase as any).from('q_method_materials').insert({
    method_id: methodId, material_id: data.materialId,
    quantity_per_unit: data.quantityPerUnit, pricing_unit: data.pricingUnit || null,
    notes: data.notes || null, is_adjustable: data.isAdjustable,
    adjustable_description: data.adjustableDesc || null, rounding_rule: data.roundingRule || null,
  });
  if (error) handleSupabaseError(error);
}

export async function deleteMethodMaterial(id: string) {
  const { error } = await (supabase as any).from('q_method_materials').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function fetchMaterialsSelect() {
  const { data } = await (supabase as any).from('q_materials').select('id, name, unit, default_price, code').eq('is_active', true).order('name');
  return data || [];
}

// ==================== Budget / Breakdowns ====================

export async function fetchBreakdowns() {
  const { data, error } = await (supabase as any)
    .from('q_project_breakdowns')
    .select('*, q_quotations(project_no, q_customers(name_zh))')
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchQuotationsForBudget() {
  const { data } = await (supabase as any).from('q_quotations').select('id, project_no, grand_total, q_customers(name_zh)').in('status', ['confirmed', 'sent', 'draft']).order('created_at', { ascending: false });
  return (data || []).map((q: any) => ({ ...q, quotation_no: q.project_no, customer_name: q.q_customers?.name_zh || '', total_amount: q.grand_total }));
}

export async function createBreakdown(insertData: any) {
  const { data, error } = await (supabase as any).from('q_project_breakdowns').insert(insertData).select('id').single();
  if (error) handleSupabaseError(error);
  return data.id;
}

export async function deleteBreakdown(id: string) {
  await (supabase as any).from('q_breakdown_items').delete().eq('project_breakdown_id', id);
  await (supabase as any).from('q_breakdown_versions').delete().eq('project_breakdown_id', id);
  await (supabase as any).from('q_breakdown_attachments').delete().eq('project_breakdown_id', id);
  const { error } = await (supabase as any).from('q_project_breakdowns').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ==================== Labor Summary ====================

export async function fetchBreakdownsForLabor() {
  const { data } = await (supabase as any).from('q_project_breakdowns').select('id, name, status').order('created_at', { ascending: false });
  return data || [];
}

export async function fetchAllBreakdownItemsForLabor() {
  const { data } = await (supabase as any).from('q_breakdown_items').select('project_breakdown_id, method_id, quantity, q_methods(name_zh)');
  return (data || []).filter((i: any) => i.method_id);
}

export async function fetchAllLaborRates() {
  const { data } = await (supabase as any).from('q_labor_rates').select('*');
  return data || [];
}

// ==================== Tax Settings ====================

export async function fetchTaxSettings() {
  const { data, error } = await (supabase as any).from('q_company_settings').select('*').limit(1).maybeSingle();
  if (error) handleSupabaseError(error);
  const taxSettings = typeof data?.tax_settings === 'object' ? data.tax_settings : {};
  return data ? {
    id: data.id,
    sstEnabled: taxSettings.sstEnabled !== false,
    sstPct: Number(taxSettings.sstPct) || 8,
    shippingRatePerCbm: Number(taxSettings.shippingRatePerCbm) || 0,
    validityPeriod: data.validity_period || 30,
  } : { id: null, sstEnabled: true, sstPct: 8, shippingRatePerCbm: 0, validityPeriod: 30 };
}

export async function saveTaxSettings(form: any, userId?: string) {
  const payload = {
    tax_settings: { sstEnabled: form.sstEnabled, sstPct: form.sstPct, shippingRatePerCbm: form.shippingRatePerCbm },
    validity_period: form.validityPeriod,
    updated_at: new Date().toISOString(),
  };
  if (form.id) {
    const { error } = await (supabase as any).from('q_company_settings').update(payload).eq('id', form.id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await (supabase as any).from('q_company_settings').insert({ ...payload, created_by: userId });
    if (error) handleSupabaseError(error);
  }
}

// ==================== Breakdown Detail ====================

export async function fetchBreakdownDetail(id: string) {
  const { data, error } = await (supabase as any).from('q_project_breakdowns').select('*').eq('id', id).maybeSingle();
  if (error) handleSupabaseError(error);
  return data;
}

export async function fetchBreakdownItems(breakdownId: string) {
  const { data, error } = await (supabase as any).from('q_breakdown_items').select('*, q_materials(name, unit, code), q_methods(method_code, name_zh)').eq('project_breakdown_id', breakdownId).order('created_at');
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchQuotationItemNames(quotationId: string) {
  const { data } = await (supabase as any).from('q_quotations').select('items').eq('id', quotationId).maybeSingle();
  if (!data?.items) return {};
  const map: Record<string, string> = {};
  (data.items as any[]).forEach((item: any) => { if (item.id) map[item.id] = item.nameZh || item.nameEn || item.id; });
  return map;
}

export async function fetchLaborRatesByMethods(methodIds: string[]) {
  if (methodIds.length === 0) return [];
  const { data } = await (supabase as any).from('q_labor_rates').select('*, q_methods(method_code, name_zh)').in('method_id', methodIds);
  return (data || []).map((lr: any) => ({
    id: lr.id, methodId: lr.method_id, methodCode: lr.q_methods?.method_code || '',
    methodName: lr.q_methods?.name_zh || '', workerType: lr.worker_type,
    hourlyRate: Number(lr.hourly_rate) || 0, hoursPerUnit: Number(lr.hours_per_unit) || 0,
  }));
}

export async function fetchBreakdownVersions(breakdownId: string) {
  const { data } = await (supabase as any).from('q_breakdown_versions').select('*').eq('project_breakdown_id', breakdownId).order('version_number', { ascending: false });
  return data || [];
}

export async function fetchBreakdownAttachments(breakdownId: string) {
  const { data } = await (supabase as any).from('q_breakdown_attachments').select('*').eq('project_breakdown_id', breakdownId).order('created_at', { ascending: false });
  return data || [];
}

export async function addBreakdownItem(item: any) {
  const { error } = await (supabase as any).from('q_breakdown_items').insert(item);
  if (error) handleSupabaseError(error);
}

export async function deleteBreakdownItem(itemId: string) {
  const { error } = await (supabase as any).from('q_breakdown_items').delete().eq('id', itemId);
  if (error) handleSupabaseError(error);
}

export async function updateBreakdownStatus(breakdownId: string, update: any) {
  const { error } = await (supabase as any).from('q_project_breakdowns').update(update).eq('id', breakdownId);
  if (error) handleSupabaseError(error);
}

export async function saveBreakdownVersion(version: any) {
  const { error } = await (supabase as any).from('q_breakdown_versions').insert(version);
  if (error) handleSupabaseError(error);
}

export async function recalcBreakdownTotals(breakdownId: string, laborTotal: number, quotedAmount: number) {
  const { data } = await (supabase as any).from('q_breakdown_items').select('estimated_cost').eq('project_breakdown_id', breakdownId);
  const matTotal = (data || []).reduce((s: number, i: any) => s + (Number(i.estimated_cost) || 0), 0);
  const cost = matTotal + laborTotal;
  const pr = quotedAmount - cost;
  await (supabase as any).from('q_project_breakdowns').update({ total_material_cost: matTotal, total_labor_cost: laborTotal, total_cost: cost, estimated_profit: pr }).eq('id', breakdownId);
}

export async function submitBreakdownToProcurement(breakdownId: string, items: any[], itemsTotal: number, breakdownName: string, userId?: string, tenantId?: string) {
  const orderNo = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { data: po, error: poErr } = await (supabase as any).from('q_purchase_orders').insert({
    order_no: orderNo, status: 'draft', total_amount: itemsTotal,
    project_breakdown_id: breakdownId,
    notes: `Auto-generated from ${breakdownName}`, created_by: userId, tenant_id: tenantId,
  }).select('id').single();
  if (poErr) handleSupabaseError(poErr);
  const poItems = items.map(item => ({ purchase_order_id: po.id, material_id: item.materialId, quantity: item.purchaseQuantity, unit_price: item.unitPrice, total_price: item.estimatedCost }));
  if (poItems.length > 0) {
    const { error: itemErr } = await (supabase as any).from('q_purchase_order_items').insert(poItems);
    if (itemErr) handleSupabaseError(itemErr);
  }
  await (supabase as any).from('q_project_breakdowns').update({ status: 'submitted', submitted_to_procurement_at: new Date().toISOString(), submitted_to_procurement_by: userId }).eq('id', breakdownId);
}

export async function uploadBreakdownAttachment(breakdownId: string, file: File, userId?: string) {
  const filePath = `breakdown-attachments/${breakdownId}/${Date.now()}_${file.name}`;
  const { error: uploadErr } = await supabase.storage.from('receipts').upload(filePath, file);
  if (uploadErr) handleSupabaseError(uploadErr);
  const { error } = await (supabase as any).from('q_breakdown_attachments').insert({
    project_breakdown_id: breakdownId, file_name: file.name, file_type: file.type,
    file_size: file.size, file_url: filePath, uploaded_by: userId,
  });
  if (error) handleSupabaseError(error);
}
