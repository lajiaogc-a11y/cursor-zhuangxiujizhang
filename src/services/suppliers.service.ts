/**
 * Suppliers Service (Quotation module suppliers)
 * 报价系统供应商 CRUD
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';

export interface QSupplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_name: string | null;
  payment_terms: string | null;
  default_currency: string;
  rating: number;
  notes: string | null;
  is_active: boolean;
  contact_id: string | null;
  created_at: string;
}

export async function fetchQSuppliers(tenantId: string): Promise<QSupplier[]> {
  requireTenantId(tenantId);
  const { data, error } = await (supabase as any)
    .from('q_suppliers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data as QSupplier[];
}

export async function fetchSupplierPriceCounts(tenantId: string): Promise<Record<string, number>> {
  requireTenantId(tenantId);
  const { data, error } = await (supabase as any)
    .from('q_material_supplier_prices')
    .select('supplier_id')
    .eq('tenant_id', tenantId);
  if (error) handleSupabaseError(error);
  const counts: Record<string, number> = {};
  data?.forEach((r: any) => { counts[r.supplier_id] = (counts[r.supplier_id] || 0) + 1; });
  return counts;
}

export async function saveQSupplier(
  form: Omit<QSupplier, 'id' | 'is_active' | 'contact_id' | 'created_at'> & { id?: string },
  tenantId: string | undefined
) {
  requireTenantId(tenantId);
  const { id, ...rest } = form;
  if (id) {
    const { error } = await (supabase as any).from('q_suppliers').update(rest).eq('id', id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await (supabase as any).from('q_suppliers').insert({ ...rest, tenant_id: tenantId });
    if (error) handleSupabaseError(error);
  }
}

export async function deleteQSupplier(id: string) {
  const { error } = await (supabase as any).from('q_suppliers').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}
