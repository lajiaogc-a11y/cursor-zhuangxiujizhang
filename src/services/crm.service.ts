/**
 * CRM Service
 * 
 * CRM 模块（客户、合同、模板、变更单、报表、合同付款计划）的数据访问层。
 */

import { supabase, requireTenantId, handleSupabaseError } from './base';
import { format } from 'date-fns';

// ── Types ──

export type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  whatsapp_number: string | null;
  lead_source: string | null;
  lead_status: string | null;
  property_address: string | null;
  property_type: string | null;
  estimated_budget: number | null;
  next_follow_up: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
};

export type Contract = {
  id: string;
  contract_number: string;
  title: string;
  template_id: string | null;
  contact_id: string | null;
  project_id: string | null;
  content: string;
  status: string;
  total_amount: number;
  currency: string;
  signed_at: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  contacts: { name: string } | null;
  projects: { project_name: string } | null;
};

export type ContractTemplate = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  merge_fields: string[];
  is_active: boolean;
  created_at: string;
};

export type Amendment = {
  id: string;
  contract_id: string;
  amendment_number: string;
  title: string;
  description: string | null;
  amount_change: number;
  new_total_amount: number;
  status: string;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  review_note: string | null;
  created_at: string;
  contracts: { contract_number: string; title: string; total_amount: number } | null;
};

// ── Dashboard ──

export async function fetchDashboardStats(tenantId: string) {
  requireTenantId(tenantId);
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
  const [totalRes, newRes, activeRes, followUpRes] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('contact_type', 'customer'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('contact_type', 'customer').gte('created_at', monthStart),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('contact_type', 'customer').eq('is_active', true),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('contact_type', 'customer').not('next_follow_up', 'is', null).lte('next_follow_up', format(new Date(), 'yyyy-MM-dd')),
  ]);
  return {
    total: totalRes.count || 0,
    newThisMonth: newRes.count || 0,
    active: activeRes.count || 0,
    withFollowUp: followUpRes.count || 0,
  };
}

export async function fetchContractSummary(tenantId: string) {
  requireTenantId(tenantId);
  const { data: contracts } = await supabase.from('contracts').select('status, total_amount').eq('tenant_id', tenantId);
  const activeContracts = (contracts || []).filter((c: any) => ['active', 'signed'].includes(c.status)).length;
  const totalValue = (contracts || []).reduce((s: number, c: any) => s + (c.total_amount || 0), 0);
  const { data: payments } = await supabase.from('contract_payment_plans').select('paid_amount').eq('tenant_id', tenantId);
  const collected = (payments || []).reduce((s: number, p: any) => s + (p.paid_amount || 0), 0);
  return { activeContracts, totalValue, collected };
}

export async function fetchRecentActivities(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase
    .from('contact_activities')
    .select('*, contacts!inner(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(6);
  return data || [];
}

export async function fetchUpcomingReminders(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase
    .from('contact_reminders')
    .select('*, contacts!inner(name)')
    .eq('tenant_id', tenantId)
    .eq('is_completed', false)
    .gte('remind_at', new Date().toISOString())
    .order('remind_at', { ascending: true })
    .limit(5);
  return data || [];
}

// ── Customers ──

export async function fetchCustomers(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('contact_type', ['customer', 'both'])
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data as Customer[];
}

export async function saveCustomer(
  tenantId: string,
  userId: string,
  data: Record<string, any>,
  id?: string
) {
  requireTenantId(tenantId);
  const payload = {
    contact_type: 'customer',
    name: data.name,
    company_name: data.company_name || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    whatsapp_number: data.whatsapp_number || null,
    lead_source: data.lead_source || null,
    lead_status: data.lead_status || 'new',
    property_address: data.property_address || null,
    property_type: data.property_type || null,
    estimated_budget: data.estimated_budget ? Number(data.estimated_budget) : null,
    notes: data.notes || null,
  };
  if (id) {
    const { error } = await supabase.from('contacts').update(payload).eq('id', id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('contacts').insert({
      ...payload,
      created_by: userId,
      tenant_id: tenantId,
      is_active: true,
    });
    if (error) handleSupabaseError(error);
  }
}

// ── Contracts ──

export async function fetchContracts(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('contracts')
    .select('*, contacts(name), projects(project_name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data as unknown as Contract[];
}

export async function fetchContractTemplatesForSelect(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase.from('contract_templates').select('id, name, content, merge_fields').eq('tenant_id', tenantId);
  return (data || []).map(d => ({ ...d, merge_fields: Array.isArray(d.merge_fields) ? d.merge_fields as string[] : [] }));
}

export async function fetchCustomersForSelect(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase.from('contacts').select('id, name, phone, email, address, company_name').eq('tenant_id', tenantId).eq('contact_type', 'customer');
  return data || [];
}

export async function fetchProjectsForSelect(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase.from('projects').select('id, project_name, project_code').eq('tenant_id', tenantId);
  return data || [];
}

export async function saveContract(
  tenantId: string,
  userId: string,
  payload: Record<string, any>,
  editId?: string
) {
  requireTenantId(tenantId);
  if (editId) {
    const { error } = await supabase.from('contracts').update({
      title: payload.title,
      contract_number: payload.contract_number,
      template_id: payload.template_id || null,
      contact_id: payload.contact_id || null,
      project_id: payload.project_id || null,
      content: payload.content,
      total_amount: payload.total_amount,
      currency: payload.currency,
      effective_date: payload.effective_date || null,
      expiry_date: payload.expiry_date || null,
      notes: payload.notes || null,
      tenant_id: tenantId,
    }).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('contracts').insert({
      title: payload.title,
      contract_number: payload.contract_number,
      template_id: payload.template_id || null,
      contact_id: payload.contact_id || null,
      project_id: payload.project_id || null,
      content: payload.content,
      total_amount: payload.total_amount,
      currency: payload.currency,
      effective_date: payload.effective_date || null,
      expiry_date: payload.expiry_date || null,
      notes: payload.notes || null,
      tenant_id: tenantId,
      status: 'draft',
      created_by: userId,
    });
    if (error) handleSupabaseError(error);
  }
}

export async function updateContractStatus(id: string, status: string) {
  const updates: Record<string, unknown> = { status };
  if (status === 'signed') updates.signed_at = new Date().toISOString();
  const { error } = await supabase.from('contracts').update(updates).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function signContract(
  tenantId: string,
  contractId: string,
  signerName: string,
  signatureData: string
) {
  requireTenantId(tenantId);
  const { error: sigError } = await supabase.from('contract_signatures').insert({
    contract_id: contractId,
    signer_name: signerName,
    signer_role: 'customer',
    signature_data: signatureData,
    ip_address: 'client',
    user_agent: navigator.userAgent,
    tenant_id: tenantId,
  });
  if (sigError) handleSupabaseError(sigError);
  const { error } = await supabase.from('contracts').update({ status: 'signed', signed_at: new Date().toISOString() }).eq('id', contractId);
  if (error) handleSupabaseError(error);
}

export async function fetchContractSignatures(contractId: string) {
  const { data } = await supabase
    .from('contract_signatures')
    .select('signer_name, signer_role, signature_data, signed_at')
    .eq('contract_id', contractId);
  return data || [];
}

// ── Templates ──

export async function fetchTemplates(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []).map(d => ({ ...d, merge_fields: Array.isArray(d.merge_fields) ? d.merge_fields as string[] : [] })) as ContractTemplate[];
}

export async function saveTemplate(tenantId: string, data: Record<string, any>, editId?: string) {
  requireTenantId(tenantId);
  const payload = {
    name: data.name,
    description: data.description || null,
    content: data.content,
    merge_fields: data.merge_fields,
    tenant_id: tenantId,
  };
  if (editId) {
    const { error } = await supabase.from('contract_templates').update(payload).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('contract_templates').insert(payload);
    if (error) handleSupabaseError(error);
  }
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('contract_templates').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ── Amendments ──

export async function fetchAmendments(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('contract_amendments')
    .select('*, contracts(contract_number, title, total_amount)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data as unknown as Amendment[];
}

export async function fetchActiveContracts(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase
    .from('contracts')
    .select('id, contract_number, title, total_amount')
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'signed']);
  return data || [];
}

export async function createAmendment(tenantId: string, userId: string, payload: {
  contract_id: string; amendment_number: string; title: string;
  description?: string | null; amount_change: number; new_total_amount: number;
}) {
  requireTenantId(tenantId);
  const { error } = await supabase.from('contract_amendments').insert({
    contract_id: payload.contract_id,
    amendment_number: payload.amendment_number,
    title: payload.title,
    description: payload.description || null,
    amount_change: payload.amount_change,
    new_total_amount: payload.new_total_amount,
    requested_by: userId,
    tenant_id: tenantId,
  });
  if (error) handleSupabaseError(error);
}

export async function reviewAmendment(
  userId: string,
  amendmentId: string,
  status: string,
  reviewNote: string | null,
  contractId: string,
  newTotal: number
) {
  const { error: aErr } = await supabase.from('contract_amendments').update({
    status,
    approved_by: userId,
    approved_at: new Date().toISOString(),
    review_note: reviewNote,
  }).eq('id', amendmentId);
  if (aErr) handleSupabaseError(aErr);

  if (status === 'approved') {
    const { error: cErr } = await supabase.from('contracts').update({ total_amount: newTotal }).eq('id', contractId);
    if (cErr) handleSupabaseError(cErr);
  }
}

// ── Reports ──

export async function fetchLeadFunnel(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase
    .from('contacts')
    .select('lead_status')
    .eq('tenant_id', tenantId)
    .eq('contact_type', 'customer');
  const counts: Record<string, number> = {};
  (data || []).forEach((c: any) => {
    const s = c.lead_status || 'new';
    counts[s] = (counts[s] || 0) + 1;
  });
  return counts;
}

export async function fetchLeadSourceDistribution(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase
    .from('contacts')
    .select('lead_source')
    .eq('tenant_id', tenantId)
    .eq('contact_type', 'customer');
  const counts: Record<string, number> = {};
  (data || []).forEach((c: any) => {
    const s = c.lead_source || 'other';
    counts[s] = (counts[s] || 0) + 1;
  });
  return counts;
}

export async function fetchContractStats(tenantId: string) {
  requireTenantId(tenantId);
  const { data: contracts } = await supabase.from('contracts').select('status, total_amount, currency').eq('tenant_id', tenantId);
  const statusCounts: Record<string, number> = {};
  let totalValue = 0;
  (contracts || []).forEach((c: any) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    totalValue += c.total_amount || 0;
  });
  const { data: payments } = await supabase.from('contract_payment_plans').select('paid_amount').eq('tenant_id', tenantId);
  const collected = (payments || []).reduce((s: number, p: any) => s + (p.paid_amount || 0), 0);
  return { total: (contracts || []).length, totalValue, statusCounts, collected };
}

export async function fetchMonthlyNewCustomers(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase
    .from('contacts')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .eq('contact_type', 'customer')
    .gte('created_at', new Date(Date.now() - 180 * 86400000).toISOString());
  const months: Record<string, number> = {};
  (data || []).forEach((c: any) => {
    const m = c.created_at.substring(0, 7);
    months[m] = (months[m] || 0) + 1;
  });
  return months;
}

// ══════════════════════════════════════
// Contract Payment Plans (合同付款计划)
// ══════════════════════════════════════

export type PaymentPlan = {
  id: string;
  contract_id: string;
  milestone_name: string;
  percentage: number;
  amount: number;
  currency: string;
  due_date: string | null;
  status: string;
  paid_amount: number;
  paid_at: string | null;
  payment_method: string | null;
  sort_order: number;
  notes: string | null;
};

export async function fetchPaymentPlans(contractId: string): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from('contract_payment_plans')
    .select('*')
    .eq('contract_id', contractId)
    .order('sort_order', { ascending: true });
  if (error) handleSupabaseError(error);
  return (data || []) as PaymentPlan[];
}

export async function addPaymentPlan(plan: {
  contract_id: string;
  milestone_name: string;
  percentage: number;
  amount: number;
  currency: string;
  due_date: string | null;
  sort_order: number;
  created_by?: string;
  tenant_id: string;
}): Promise<void> {
  const { error } = await supabase.from('contract_payment_plans').insert(plan);
  if (error) handleSupabaseError(error);
}

export async function batchInsertPaymentPlans(plans: {
  contract_id: string;
  milestone_name: string;
  percentage: number;
  amount: number;
  currency: string;
  sort_order: number;
  created_by?: string;
  tenant_id: string;
}[]): Promise<void> {
  const { error } = await supabase.from('contract_payment_plans').insert(plans);
  if (error) handleSupabaseError(error);
}

export async function recordPaymentPlanPayment(
  planId: string,
  paidAmount: number,
  totalAmount: number,
  payMethod: string
): Promise<void> {
  const newStatus = paidAmount >= totalAmount ? 'paid' : 'partial';
  const { error } = await supabase.from('contract_payment_plans').update({
    paid_amount: paidAmount,
    status: newStatus,
    paid_at: new Date().toISOString(),
    payment_method: payMethod,
  }).eq('id', planId);
  if (error) handleSupabaseError(error);
}

export async function deletePaymentPlan(id: string): Promise<void> {
  const { error } = await supabase.from('contract_payment_plans').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Customer Detail (Activities & Reminders)
// ══════════════════════════════════════

export async function fetchCustomerById(customerId: string) {
  const { data, error } = await supabase.from('contacts').select('*').eq('id', customerId).single();
  if (error) throw error;
  return data;
}

export async function fetchContactActivities(contactId: string) {
  const { data } = await supabase
    .from('contact_activities')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function fetchContactReminders(contactId: string) {
  const { data } = await supabase
    .from('contact_reminders')
    .select('*')
    .eq('contact_id', contactId)
    .order('remind_at', { ascending: true });
  return data || [];
}

export async function addContactActivity(params: {
  contact_id: string;
  activity_type: string;
  content: string;
  next_follow_up: string | null;
  created_by: string | undefined;
  tenant_id: string | undefined;
}): Promise<void> {
  const { error } = await supabase.from('contact_activities').insert(params);
  if (error) throw error;
  if (params.next_follow_up) {
    await supabase.from('contacts').update({ next_follow_up: params.next_follow_up }).eq('id', params.contact_id);
  }
}

export async function addContactReminder(params: {
  contact_id: string;
  title: string;
  remind_at: string;
  created_by: string | undefined;
  tenant_id: string | undefined;
}): Promise<void> {
  const { error } = await supabase.from('contact_reminders').insert(params);
  if (error) throw error;
}

export async function toggleContactReminder(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase.from('contact_reminders').update({ is_completed: completed }).eq('id', id);
  if (error) throw error;
}
