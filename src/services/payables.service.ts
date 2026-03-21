/**
 * Payables Service
 * 应付/待收 数据服务
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';

export async function fetchPayables(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await (supabase as any)
    .from('payables')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('payable_date', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data as any[]) || [];
}

export async function fetchProjectsList(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_code, project_name')
    .eq('tenant_id', tenantId);
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function createPayable(record: any): Promise<string | null> {
  const { data, error } = await (supabase as any).from('payables').insert(record).select('id').single();
  if (error) handleSupabaseError(error);
  return data?.id || null;
}

export async function updatePayable(id: string, record: any) {
  const { error } = await (supabase as any).from('payables').update(record).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function deletePayable(id: string) {
  const { error } = await (supabase as any).from('payables').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function fetchPayablePayments(payableId: string) {
  const { data, error } = await (supabase as any)
    .from('payable_payments')
    .select('*')
    .eq('payable_id', payableId)
    .order('payment_date', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data as any[]) || [];
}

export async function createPayablePayment(record: any): Promise<string | null> {
  const { data, error } = await (supabase as any).from('payable_payments').insert(record).select('id').single();
  if (error) handleSupabaseError(error);
  return data?.id || null;
}

export async function deletePayablePayment(id: string) {
  const { error } = await (supabase as any).from('payable_payments').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}
