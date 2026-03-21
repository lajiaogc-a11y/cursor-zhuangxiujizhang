/**
 * Contacts Service
 * 联系人 CRUD 服务
 */

import { supabase, requireTenantId, handleSupabaseError } from './base';

export async function fetchContacts(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase.from('contacts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function saveContact(
  contactData: Record<string, any>,
  editingId?: string
) {
  if (editingId) {
    const { error } = await supabase.from('contacts').update({
      contact_type: contactData.contact_type,
      name: contactData.name,
      company_name: contactData.company_name || null,
      email: contactData.email || null,
      phone: contactData.phone || null,
      address: contactData.address || null,
      tax_id: contactData.tax_id || null,
      default_currency: contactData.default_currency,
      notes: contactData.notes || null,
      is_active: contactData.is_active,
    }).eq('id', editingId);
    if (error) handleSupabaseError(error);
  } else {
    const payload = {
      contact_type: contactData.contact_type,
      name: contactData.name,
      company_name: contactData.company_name || null,
      email: contactData.email || null,
      phone: contactData.phone || null,
      address: contactData.address || null,
      tax_id: contactData.tax_id || null,
      default_currency: contactData.default_currency,
      notes: contactData.notes || null,
      is_active: contactData.is_active,
      created_by: contactData.created_by,
      tenant_id: contactData.tenant_id,
    };
    const { error } = await supabase.from('contacts').insert(payload);
    if (error) handleSupabaseError(error);
  }
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function fetchContactInvoices(contactId: string) {
  const { data } = await supabase.from('invoices')
    .select('id, invoice_number, invoice_type, status, total_amount, currency, issue_date')
    .eq('contact_id', contactId)
    .order('issue_date', { ascending: false })
    .limit(20);
  return data || [];
}

export async function fetchContactPayables(contactName: string) {
  const { data } = await supabase.from('payables')
    .select('id, description, total_amount, unpaid_amount, currency, status, payable_date')
    .eq('supplier_name', contactName)
    .order('payable_date', { ascending: false })
    .limit(20);
  return data || [];
}
