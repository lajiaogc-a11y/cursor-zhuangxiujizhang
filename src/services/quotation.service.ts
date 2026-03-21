/**
 * Quotation Service Layer
 * Centralizes all quotation-module database operations
 */
import { supabase } from '@/integrations/supabase/client';
import type { QuotationItem, CompanySettings, CostAnalysis, QuotationSummary, Product, Customer } from '@/types/quotation';

// ─── Stats ───────────────────────────────────────────────────────
export async function fetchQuotationStats() {
  const [quotRes, custRes, prodRes] = await Promise.all([
    (supabase as any).from('q_quotations').select('id, status', { count: 'exact' }),
    (supabase as any).from('q_customers').select('id', { count: 'exact', head: true }),
    (supabase as any).from('q_products').select('id', { count: 'exact', head: true }),
  ]);
  const quotations = quotRes.data || [];
  return {
    total: quotations.length,
    drafts: quotations.filter((q: any) => q.status === 'draft').length,
    customers: custRes.count || 0,
    products: prodRes.count || 0,
  };
}

// ─── Quotations ──────────────────────────────────────────────────
export async function fetchQuotations() {
  const { data, error } = await (supabase as any)
    .from('q_quotations')
    .select('*, q_customers(name_zh)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((q: any) => ({
    id: q.id,
    projectNo: q.project_no || '',
    quotationNo: q.quotation_no || '',
    customerId: q.customer_id,
    customerName: q.q_customers?.name_zh || '',
    quotationDate: q.quotation_date || '',
    quotationType: q.quotation_type || 'quotation',
    status: q.status || 'draft',
    items: (q.items || []) as QuotationItem[],
    subtotal: Number(q.subtotal) || 0,
    discountAmount: Number(q.discount_amount) || 0,
    sstAmount: Number(q.sst_amount) || 0,
    grandTotal: Number(q.grand_total) || 0,
    notes: q.notes,
    quotationNotes: q.quotation_notes,
    settings: q.settings as CompanySettings | undefined,
    costAnalysis: q.cost_analysis as CostAnalysis | undefined,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  }));
}

async function generateQuotationNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `FG${yy}${mm}${dd}`;

  const { data: existing } = await (supabase as any)
    .from('q_quotations')
    .select('quotation_no')
    .like('quotation_no', `${datePrefix}%`)
    .order('quotation_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  let seq = 1;
  if (existing?.quotation_no) {
    const lastSeq = parseInt(existing.quotation_no.slice(-2), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${datePrefix}${String(seq).padStart(2, '0')}`;
}

export interface SaveQuotationData {
  id?: string;
  projectNo: string;
  customerId?: string;
  quotationDate: string;
  items: QuotationItem[];
  summary: QuotationSummary;
  settings: CompanySettings;
  costAnalysis: CostAnalysis;
  quotationNotes?: string;
  quotationNotesEn?: string;
  status?: string;
}

export async function saveQuotation(data: SaveQuotationData, userId?: string, tenantId?: string) {
  const payload: any = {
    project_no: data.projectNo,
    customer_id: data.customerId || null,
    quotation_date: data.quotationDate,
    items: JSON.parse(JSON.stringify(data.items)),
    subtotal: data.summary.subtotal,
    discount_amount: data.summary.discount,
    sst_amount: 0,
    grand_total: data.summary.grandTotal,
    settings: JSON.parse(JSON.stringify(data.settings)),
    cost_analysis: JSON.parse(JSON.stringify(data.costAnalysis)),
    quotation_notes: data.quotationNotes || null,
    notes: data.quotationNotesEn || null,
    status: data.status || 'draft',
    created_by: userId,
    tenant_id: tenantId,
  };

  let quotationId = data.id;

  if (quotationId) {
    const { data: existingQ } = await (supabase as any)
      .from('q_quotations').select('quotation_no').eq('id', quotationId).maybeSingle();
    if (!existingQ?.quotation_no) {
      payload.quotation_no = await generateQuotationNo();
    }
    const { error } = await (supabase as any)
      .from('q_quotations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', quotationId);
    if (error) throw error;
  } else {
    payload.quotation_no = await generateQuotationNo();
    const { data: inserted, error } = await (supabase as any)
      .from('q_quotations').insert(payload).select('id, quotation_no').single();
    if (error) throw error;
    quotationId = inserted.id;
  }

  // Save version
  const { data: latestVersion } = await (supabase as any)
    .from('q_quotation_versions').select('version_number')
    .eq('quotation_id', quotationId).order('version_number', { ascending: false }).limit(1).maybeSingle();

  const newVersionNumber = (latestVersion?.version_number || 0) + 1;
  await (supabase as any).from('q_quotation_versions').insert({
    quotation_id: quotationId,
    version_number: newVersionNumber,
    tenant_id: tenantId,
    items: JSON.parse(JSON.stringify(data.items)),
    subtotal: data.summary.subtotal,
    discount_amount: data.summary.discount,
    sst_amount: 0,
    grand_total: data.summary.grandTotal,
    settings: JSON.parse(JSON.stringify(data.settings)),
    cost_analysis: JSON.parse(JSON.stringify(data.costAnalysis)),
    quotation_notes: data.quotationNotes || null,
  });

  // If formal (sent), auto-sync to cost breakdown
  if (payload.status === 'sent' && quotationId) {
    const { data: existingBreakdown } = await (supabase as any)
      .from('q_project_breakdowns').select('id').eq('quotation_id', quotationId).maybeSingle();
    if (existingBreakdown) {
      await (supabase as any).from('q_project_breakdowns').update({
        name: data.projectNo, quoted_amount: data.summary.grandTotal, updated_at: new Date().toISOString(),
      }).eq('id', existingBreakdown.id);
    } else {
      await (supabase as any).from('q_project_breakdowns').insert({
        quotation_id: quotationId, name: data.projectNo, quoted_amount: data.summary.grandTotal,
        status: 'draft', created_by: userId, tenant_id: tenantId,
      });
    }
  }

  return { id: quotationId, versionNumber: newVersionNumber, status: payload.status };
}

export async function deleteQuotation(id: string) {
  await (supabase as any).from('q_quotation_versions').delete().eq('quotation_id', id);
  const { error } = await (supabase as any).from('q_quotations').delete().eq('id', id);
  if (error) throw error;
}

// ─── Quotation Versions ─────────────────────────────────────────
export async function fetchQuotationVersions(quotationId: string) {
  const { data, error } = await (supabase as any)
    .from('q_quotation_versions').select('*')
    .eq('quotation_id', quotationId).order('version_number', { ascending: false });
  if (error) throw error;
  return (data || []).map((v: any) => ({
    id: v.id,
    quotationId: v.quotation_id,
    versionNumber: v.version_number,
    items: (v.items || []) as QuotationItem[],
    subtotal: Number(v.subtotal) || 0,
    sstAmount: Number(v.sst_amount) || 0,
    discountAmount: Number(v.discount_amount) || 0,
    grandTotal: Number(v.grand_total) || 0,
    settings: v.settings as CompanySettings | undefined,
    costAnalysis: v.cost_analysis as CostAnalysis | undefined,
    quotationNotes: v.quotation_notes,
    changeDescription: v.change_description,
    createdAt: v.created_at,
  }));
}

// ─── Quotation Items (Legacy) ────────────────────────────────────
export async function fetchQuotationItems(quotationId: string) {
  const { data, error } = await (supabase as any)
    .from('q_quotation_items').select('*')
    .eq('quotation_id', quotationId).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((i: any) => ({
    id: i.id, quotationId: i.quotation_id, productId: i.product_id,
    nameZh: i.name_zh || '', nameEn: i.name_en || '', unit: i.unit || '',
    quantity: Number(i.quantity) || 0, unitPrice: Number(i.unit_price) || 0,
    lineTotal: Number(i.line_total) || 0, category: i.category || '',
    priceTier: i.price_tier || 'normal', note: i.note || '', sortOrder: i.sort_order || 0,
  }));
}

export async function addQuotationItem(quotationId: string, item: any) {
  const { error } = await (supabase as any).from('q_quotation_items').insert({
    quotation_id: quotationId, product_id: item.productId, name_zh: item.nameZh, name_en: item.nameEn,
    unit: item.unit, quantity: item.quantity, unit_price: item.unitPrice,
    line_total: (item.quantity || 0) * (item.unitPrice || 0), category: item.category,
    price_tier: item.priceTier || 'normal', note: item.note, sort_order: item.sortOrder || 0,
  });
  if (error) throw error;
}

export async function updateQuotationItem(id: string, item: any) {
  const update: any = {};
  if (item.nameZh !== undefined) update.name_zh = item.nameZh;
  if (item.nameEn !== undefined) update.name_en = item.nameEn;
  if (item.unit !== undefined) update.unit = item.unit;
  if (item.quantity !== undefined) update.quantity = item.quantity;
  if (item.unitPrice !== undefined) update.unit_price = item.unitPrice;
  if (item.quantity !== undefined || item.unitPrice !== undefined) update.line_total = (item.quantity || 0) * (item.unitPrice || 0);
  if (item.category !== undefined) update.category = item.category;
  if (item.priceTier !== undefined) update.price_tier = item.priceTier;
  if (item.note !== undefined) update.note = item.note;
  const { error } = await (supabase as any).from('q_quotation_items').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteQuotationItem(id: string) {
  const { error } = await (supabase as any).from('q_quotation_items').delete().eq('id', id);
  if (error) throw error;
}

// ─── Products ────────────────────────────────────────────────────
export async function fetchProducts() {
  const { data, error } = await (supabase as any)
    .from('q_products').select('*').eq('is_active', true).order('name_zh', { ascending: true });
  if (error) throw error;
  return (data || []).map((p: any) => ({
    id: p.id, nameZh: p.name_zh || '', nameEn: p.name_en || '', unit: p.unit || '个',
    unitPrice: Number(p.unit_price) || 0,
    priceNormal: p.price_normal != null ? Number(p.price_normal) : undefined,
    priceMedium: p.price_medium != null ? Number(p.price_medium) : undefined,
    priceAdvanced: p.price_advanced != null ? Number(p.price_advanced) : undefined,
    category: p.category || '', createdBy: p.created_by,
    isCompanyProduct: p.is_company_product ?? true,
    description: p.description || '', descriptionEn: p.description_en || '',
  })) as Product[];
}

export async function fetchProductFavorites(userId: string) {
  const { data, error } = await (supabase as any)
    .from('q_product_favorites').select('product_id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((f: any) => f.product_id as string);
}

export async function toggleProductFavorite(userId: string, productId: string, isFav: boolean) {
  if (isFav) {
    const { error } = await (supabase as any).from('q_product_favorites').delete().eq('user_id', userId).eq('product_id', productId);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any).from('q_product_favorites').insert({ user_id: userId, product_id: productId });
    if (error) throw error;
  }
}

export async function addProduct(product: Omit<Product, 'id'>, userId?: string, tenantId?: string) {
  const { error } = await (supabase as any).from('q_products').insert({
    name_zh: product.nameZh, name_en: product.nameEn, unit: product.unit,
    unit_price: product.unitPrice, price_normal: product.priceNormal,
    price_medium: product.priceMedium, price_advanced: product.priceAdvanced,
    category: product.category, description: product.description,
    description_en: product.descriptionEn, is_company_product: product.isCompanyProduct ?? true,
    created_by: userId, tenant_id: tenantId,
  });
  if (error) throw error;
}

export async function updateProduct(id: string, product: Partial<Product>) {
  const update: any = {};
  if (product.nameZh !== undefined) update.name_zh = product.nameZh;
  if (product.nameEn !== undefined) update.name_en = product.nameEn;
  if (product.unit !== undefined) update.unit = product.unit;
  if (product.unitPrice !== undefined) update.unit_price = product.unitPrice;
  if (product.priceNormal !== undefined) update.price_normal = product.priceNormal;
  if (product.priceMedium !== undefined) update.price_medium = product.priceMedium;
  if (product.priceAdvanced !== undefined) update.price_advanced = product.priceAdvanced;
  if (product.category !== undefined) update.category = product.category;
  if (product.description !== undefined) update.description = product.description;
  if (product.descriptionEn !== undefined) update.description_en = product.descriptionEn;
  const { error } = await (supabase as any).from('q_products').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await (supabase as any).from('q_products').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

// ─── Customers ───────────────────────────────────────────────────
export async function fetchCustomers() {
  const { data, error } = await (supabase as any)
    .from('q_customers').select('*').order('name_zh', { ascending: true });
  if (error) throw error;
  return (data || []).map((c: any) => ({
    id: c.id, nameZh: c.name_zh || '', nameEn: c.name_en || '',
    contactPerson: c.contact_person || '', phone: c.phone || '',
    email: c.email || '', address: c.address || '', notes: c.notes || '',
    createdAt: c.created_at,
  })) as Customer[];
}

export async function addCustomer(customer: Omit<Customer, 'id'>, userId?: string, tenantId?: string) {
  const { error } = await (supabase as any).from('q_customers').insert({
    name_zh: customer.nameZh, name_en: customer.nameEn,
    contact_person: customer.contactPerson, phone: customer.phone,
    email: customer.email, address: customer.address, notes: customer.notes,
    created_by: userId, tenant_id: tenantId,
  });
  if (error) throw error;
}

export async function updateCustomer(id: string, customer: Partial<Customer>) {
  const update: any = {};
  if (customer.nameZh !== undefined) update.name_zh = customer.nameZh;
  if (customer.nameEn !== undefined) update.name_en = customer.nameEn;
  if (customer.contactPerson !== undefined) update.contact_person = customer.contactPerson;
  if (customer.phone !== undefined) update.phone = customer.phone;
  if (customer.email !== undefined) update.email = customer.email;
  if (customer.address !== undefined) update.address = customer.address;
  if (customer.notes !== undefined) update.notes = customer.notes;
  const { error } = await (supabase as any).from('q_customers').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: string) {
  const { error } = await (supabase as any).from('q_customers').delete().eq('id', id);
  if (error) throw error;
}

// ─── Product Categories ──────────────────────────────────────────
export async function fetchProductCategories() {
  const { data, error } = await (supabase as any)
    .from('q_product_categories').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveProductCategory(cat: any, tenantId?: string) {
  const payload = {
    code: cat.code, name_zh: cat.name_zh, name_en: cat.name_en,
    parent_id: cat.parent_id || null, sort_order: cat.sort_order || 0,
  };
  if (cat.id) {
    const { error } = await (supabase as any).from('q_product_categories').update(payload).eq('id', cat.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any).from('q_product_categories').insert({ ...payload, tenant_id: tenantId });
    if (error) throw error;
  }
}

export async function deleteProductCategory(id: string) {
  const { error } = await (supabase as any).from('q_product_categories').delete().eq('id', id);
  if (error) throw error;
}

// ─── Measurement Units ───────────────────────────────────────────
export async function fetchMeasurementUnits() {
  const { data, error } = await (supabase as any)
    .from('q_measurement_units').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveMeasurementUnit(unit: any, userId?: string, tenantId?: string) {
  if (unit.id) {
    const { error } = await (supabase as any).from('q_measurement_units').update({
      name_zh: unit.name_zh, name_en: unit.name_en, sort_order: unit.sort_order,
    }).eq('id', unit.id);
    if (error) throw error;
  } else {
    const code = unit.name_en.toLowerCase().replace(/[^a-z0-9]/g, '') || `unit_${Date.now()}`;
    const { data: existing } = await (supabase as any)
      .from('q_measurement_units').select('id').eq('code', code).maybeSingle();
    if (existing) throw new Error(`单位代码 "${code}" 已存在`);
    const { error } = await (supabase as any).from('q_measurement_units').insert({
      code, name_zh: unit.name_zh, name_en: unit.name_en,
      sort_order: unit.sort_order, created_by: userId, tenant_id: tenantId,
    });
    if (error) throw error;
  }
}

export async function deleteMeasurementUnit(id: string) {
  const { error } = await (supabase as any).from('q_measurement_units').delete().eq('id', id);
  if (error) throw error;
}

// ─── Notes Templates ─────────────────────────────────────────────
export async function fetchNotesTemplates() {
  const { data, error } = await (supabase as any)
    .from('q_quotation_notes_templates').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((t: any) => ({
    id: t.id, title: t.title || '', content: t.content || '',
    contentEn: t.content_en || '', isDefault: t.is_default || false,
    sortOrder: t.sort_order || 0,
  }));
}

export async function saveNotesTemplate(tpl: any, userId?: string, tenantId?: string) {
  if (tpl.isDefault) {
    await (supabase as any).from('q_quotation_notes_templates')
      .update({ is_default: false }).eq('user_id', userId).neq('id', tpl.id || '');
  }
  if (tpl.id) {
    const { error } = await (supabase as any).from('q_quotation_notes_templates').update({
      title: tpl.title, content: tpl.content, content_en: tpl.contentEn,
      is_default: tpl.isDefault || false, sort_order: tpl.sortOrder || 0,
    }).eq('id', tpl.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any).from('q_quotation_notes_templates').insert({
      title: tpl.title, content: tpl.content, content_en: tpl.contentEn,
      is_default: tpl.isDefault || false, sort_order: tpl.sortOrder || 0,
      user_id: userId, tenant_id: tenantId,
    });
    if (error) throw error;
  }
}

export async function toggleTemplateDefault(id: string, isDefault: boolean, userId?: string) {
  if (isDefault) {
    await (supabase as any).from('q_quotation_notes_templates')
      .update({ is_default: false }).eq('user_id', userId).neq('id', id);
  }
  const { error } = await (supabase as any).from('q_quotation_notes_templates')
    .update({ is_default: isDefault }).eq('id', id);
  if (error) throw error;
}

export async function deleteNotesTemplate(id: string) {
  const { error } = await (supabase as any).from('q_quotation_notes_templates').delete().eq('id', id);
  if (error) throw error;
}

// ─── Suppliers (read-only for quotation) ─────────────────────────
export async function fetchQSuppliers() {
  const { data, error } = await (supabase as any).from('q_suppliers').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map((s: any) => ({
    id: s.id, name: s.name, supplierCode: s.supplier_code || null,
    contactPerson: s.contact_person, phone: s.phone, email: s.email,
    address: s.address, paymentTerms: s.payment_terms, notes: s.notes,
    isActive: s.is_active !== false,
  }));
}

// ─── Drafts ──────────────────────────────────────────────────────
export async function loadServerDraft(userId: string) {
  try {
    const { data } = await supabase
      .from('q_quotation_drafts' as any)
      .select('draft_data')
      .eq('user_id', userId)
      .maybeSingle();
    if ((data as any)?.draft_data) {
      const parsed = (data as any).draft_data as any;
      if (parsed.items?.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

export async function saveServerDraft(userId: string, payload: any) {
  try {
    await (supabase as any).from('q_quotation_drafts').upsert(
      { user_id: userId, draft_data: payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch { /* ignore */ }
}

export async function clearServerDraft(userId: string) {
  try {
    await (supabase as any).from('q_quotation_drafts').delete().eq('user_id', userId);
  } catch { /* ignore */ }
}

// ─── Materials (read-only for quotation context) ─────────────────
export async function fetchQMaterials(typeFilter?: 'cost' | 'all') {
  let query = (supabase as any).from('q_materials').select('*, q_suppliers(name)').eq('is_active', true).order('name', { ascending: true });
  if (typeFilter === 'cost') query = query.eq('material_type', 'cost');
  const { data, error } = await query;
  if (error) {
    const { data: d2, error: e2 } = await (supabase as any).from('q_materials').select('*').eq('is_active', true).order('name', { ascending: true });
    if (e2) throw e2;
    return (d2 || []).map((m: any) => mapMaterial(m, null));
  }
  return (data || []).map((m: any) => mapMaterial(m, m.q_suppliers?.name || null));
}

function mapMaterial(m: any, supplierName: string | null) {
  return {
    id: m.id, materialCode: m.code || '', categoryId: m.category || null,
    nameZh: m.name, nameEn: m.name, spec: m.specification,
    unit: m.unit || '个', defaultWastePct: Number(m.waste_pct) || 5,
    defaultPrice: Number(m.default_price) || 0, volumeCbm: Number(m.volume_cbm) || 0,
    defaultSupplierId: m.default_supplier_id || null, defaultSupplierName: supplierName,
    notes: m.notes, isActive: m.is_active !== false,
    priceCny: Number(m.price_cny) || 0, materialType: m.material_type || 'cost',
    createdAt: m.created_at, updatedAt: m.updated_at,
  };
}

// ─── Company Settings ────────────────────────────────────────────
export async function fetchCompanySettings(defaults: any) {
  const { data, error } = await (supabase as any)
    .from('q_company_settings')
    .select('*')
    .limit(1)
    .single();
  if (error || !data) return defaults;

  const taxSettings = typeof data.tax_settings === 'object' ? data.tax_settings : {};
  const paymentTerms = typeof data.payment_terms === 'object' ? data.payment_terms : {};

  return {
    companyName: data.company_name || defaults.companyName,
    ssmNo: data.ssm_no || '',
    companyAddress: data.company_address || '',
    bankInfo: data.bank_info || '',
    currency: data.currency || 'MYR',
    taxSettings: {
      enableDiscount: taxSettings.enableDiscount ?? defaults.taxSettings.enableDiscount,
      discountAmount: taxSettings.discountAmount ?? defaults.taxSettings.discountAmount,
      shippingRatePerCbm: Number(taxSettings.shippingRatePerCbm) || 0,
      sstPct: Number(taxSettings.sstPct) || 0,
    },
    paymentTerms: {
      deposit: paymentTerms.deposit ?? defaults.paymentTerms.deposit,
      progress: paymentTerms.progress ?? defaults.paymentTerms.progress,
      final: paymentTerms.final ?? defaults.paymentTerms.final,
    },
    validityPeriod: data.validity_period || defaults.validityPeriod,
  };
}

export async function updateCompanySettings(s: any, userId?: string) {
  const { error } = await (supabase as any)
    .from('q_company_settings')
    .upsert({
      id: 'default',
      company_name: s.companyName,
      ssm_no: s.ssmNo,
      company_address: s.companyAddress,
      bank_info: s.bankInfo,
      currency: s.currency,
      tax_settings: s.taxSettings,
      payment_terms: s.paymentTerms,
      validity_period: s.validityPeriod,
      updated_by: userId,
    });
  if (error) throw error;
}
