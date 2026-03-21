/**
 * Approvals Service
 * 审批规则和审批请求 CRUD
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';

export type ApprovalRule = {
  id: string;
  rule_name: string;
  rule_type: string;
  threshold_amount: number;
  threshold_currency: string;
  approver_role: string;
  is_active: boolean | null;
};

export type ApprovalRequest = {
  id: string;
  rule_id: string | null;
  request_type: string;
  record_id: string;
  record_table: string;
  amount: number;
  currency: string;
  status: string;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export async function fetchApprovalRules(tenantId: string): Promise<ApprovalRule[]> {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('approval_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data as ApprovalRule[];
}

export async function fetchApprovalRequests(tenantId: string): Promise<ApprovalRequest[]> {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data as ApprovalRequest[];
}

export async function fetchProfiles() {
  const { data } = await supabase.from('profiles').select('user_id, username, display_name');
  return data || [];
}

export async function saveApprovalRule(
  form: { rule_name: string; rule_type: string; threshold_amount: number; threshold_currency: string; approver_role: string; is_active: boolean; id?: string },
  tenantId: string | undefined
) {
  requireTenantId(tenantId);
  if (form.id) {
    const { error } = await supabase.from('approval_rules').update(form).eq('id', form.id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('approval_rules').insert({ ...form, tenant_id: tenantId });
    if (error) handleSupabaseError(error);
  }
}

export async function deleteApprovalRule(id: string) {
  const { error } = await supabase.from('approval_rules').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function reviewApprovalRequest(id: string, status: string, userId: string | undefined, reviewNote: string | null) {
  const { error } = await supabase
    .from('approval_requests')
    .update({
      status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq('id', id);
  if (error) handleSupabaseError(error);
}

/**
 * Check if a transaction amount exceeds any active approval rule threshold.
 * If so, create an approval_request and return true (needs approval).
 */
export async function checkApprovalThreshold({
  amount, currency, requestType, recordTable, recordId, requestedBy,
}: {
  amount: number; currency: string; requestType: string;
  recordTable: string; recordId: string; requestedBy: string;
}): Promise<boolean> {
  try {
    const { data: rules } = await supabase
      .from('approval_rules')
      .select('*')
      .eq('is_active', true)
      .eq('rule_type', requestType);
    if (!rules || rules.length === 0) return false;

    const matchingRule = rules.find(
      (r) => r.threshold_currency === currency && amount >= r.threshold_amount
    );
    if (!matchingRule) return false;

    await supabase.from('approval_requests').insert({
      rule_id: matchingRule.id, request_type: requestType,
      record_table: recordTable, record_id: recordId,
      amount, currency, requested_by: requestedBy, status: 'pending',
    });
    return true;
  } catch {
    return false;
  }
}
