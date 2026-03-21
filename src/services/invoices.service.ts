/**
 * Invoices Service
 * 发票/报价单/收据 CRUD 服务
 */

import { supabase, requireTenantId, handleSupabaseError } from './base';

export interface InvoicePayload {
  invoice_number: string;
  invoice_type: string;
  contact_id: string | null;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  total_amount_myr: number;
  notes: string | null;
  terms: string | null;
  project_id: string | null;
  created_by: string | undefined;
  tenant_id: string | undefined;
}

export interface InvoiceItemPayload {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate_id: string | null;
  tax_amount: number;
  amount: number;
  sort_order: number;
}

export async function fetchInvoices(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase.from('invoices').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchContacts(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase.from('contacts').select('id, name, company_name, address, phone, email').eq('tenant_id', tenantId).eq('is_active', true);
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchTaxRates(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase.from('tax_rates').select('*').eq('tenant_id', tenantId).eq('is_active', true);
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchProjects(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase.from('projects').select('id, project_code, project_name').eq('tenant_id', tenantId);
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function saveInvoice(
  invoice: InvoicePayload,
  items: InvoiceItemPayload[],
  editingId?: string
) {
  if (editingId) {
    const { error } = await supabase.from('invoices').update(invoice).eq('id', editingId);
    if (error) handleSupabaseError(error);
    await supabase.from('invoice_items').delete().eq('invoice_id', editingId);
    const { error: itemErr } = await supabase.from('invoice_items').insert(
      items.map((item, idx) => ({ ...item, invoice_id: editingId, sort_order: idx }))
    );
    if (itemErr) handleSupabaseError(itemErr);
  } else {
    const { data: inv, error } = await supabase.from('invoices').insert(invoice).select().single();
    if (error) handleSupabaseError(error);
    const { error: itemErr } = await supabase.from('invoice_items').insert(
      items.map((item, idx) => ({ ...item, invoice_id: inv.id, sort_order: idx }))
    );
    if (itemErr) handleSupabaseError(itemErr);
  }
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function fetchInvoiceItems(invoiceId: string) {
  const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('sort_order');
  return data || [];
}

export async function convertQuotationToInvoice(
  inv: any,
  userId: string | undefined,
  tenantId: string | undefined
) {
  const newNumber = `INV-${Date.now().toString().slice(-8)}`;
  const { data: itemsData } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('sort_order');
  
  const { data: newInv, error } = await supabase.from('invoices').insert({
    invoice_number: newNumber,
    invoice_type: 'invoice',
    contact_id: inv.contact_id,
    status: 'draft',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: inv.due_date,
    currency: inv.currency,
    exchange_rate: inv.exchange_rate,
    subtotal: inv.subtotal,
    tax_amount: inv.tax_amount,
    total_amount: inv.total_amount,
    total_amount_myr: inv.total_amount_myr,
    notes: inv.notes,
    terms: inv.terms,
    project_id: inv.project_id,
    created_by: userId,
    tenant_id: tenantId,
  }).select().single();
  
  if (error) handleSupabaseError(error);
  
  if (itemsData && itemsData.length > 0 && newInv) {
    await supabase.from('invoice_items').insert(
      itemsData.map((item: any, idx: number) => ({
        invoice_id: newInv.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate_id: item.tax_rate_id,
        tax_amount: item.tax_amount,
        amount: item.amount,
        sort_order: idx,
      }))
    );
  }
}
