/**
 * Payroll Service
 * 工资/预支/保险 数据服务
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';

export interface Employee {
  id: string;
  name: string;
  phone: string | null;
  position: string | null;
  monthly_salary: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export async function fetchEmployees(tenantId: string): Promise<Employee[]> {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []) as Employee[];
}

export async function saveEmployee(
  form: { name: string; phone?: string; position?: string; monthly_salary: number; status: 'active' | 'inactive'; id?: string },
  userId: string | undefined,
  tenantId: string | undefined
) {
  requireTenantId(tenantId);
  const payload = {
    name: form.name,
    phone: form.phone || null,
    position: form.position || null,
    monthly_salary: form.monthly_salary,
    status: form.status,
    created_by: userId,
  };
  if (form.id) {
    const { error } = await supabase.from('employees').update(payload).eq('id', form.id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('employees').insert({ ...payload, tenant_id: tenantId });
    if (error) handleSupabaseError(error);
  }
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function fetchSalaryPayments(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('salary_payments')
    .select('*, employees(name)')
    .eq('tenant_id', tenantId)
    .order('payment_date', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function deleteSalaryPayment(id: string) {
  const { error } = await supabase.from('salary_payments').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function saveSalaryPayment(data: Record<string, any>, paymentId?: string): Promise<string | undefined> {
  if (paymentId) {
    const { error } = await supabase.from('salary_payments').update(data as any).eq('id', paymentId);
    if (error) handleSupabaseError(error);
    return paymentId;
  } else {
    const { data: result, error } = await supabase.from('salary_payments').insert(data as any).select('id').single();
    if (error) handleSupabaseError(error);
    return result?.id;
  }
}

export async function markAdvancesAsDeducted(advanceIds: string[], paymentId?: string) {
  if (advanceIds.length === 0) return;
  const updateData: Record<string, any> = { is_deducted: true };
  if (paymentId) updateData.deducted_in_payment_id = paymentId;
  const { error } = await supabase.from('salary_advances').update(updateData).in('id', advanceIds);
  if (error) handleSupabaseError(error);
}

export async function fetchSalaryAdvances(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('salary_advances')
    .select('*, employees(name)')
    .eq('tenant_id', tenantId)
    .order('advance_date', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function deleteSalaryAdvance(id: string) {
  const { error } = await supabase.from('salary_advances').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function saveSalaryAdvance(data: Record<string, any>, advanceId?: string) {
  if (advanceId) {
    const { error } = await supabase.from('salary_advances').update(data as any).eq('id', advanceId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('salary_advances').insert(data as any);
    if (error) handleSupabaseError(error);
  }
}

export async function fetchInsurancePayments(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('insurance_payments')
    .select('*, employees(name)')
    .eq('tenant_id', tenantId)
    .order('payment_date', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function deleteInsurancePayment(id: string) {
  const { error } = await supabase.from('insurance_payments').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function saveInsurancePayment(data: Record<string, any>, insuranceId?: string) {
  if (insuranceId) {
    const { error } = await supabase.from('insurance_payments').update(data as any).eq('id', insuranceId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('insurance_payments').insert(data as any);
    if (error) handleSupabaseError(error);
  }
}

export async function fetchPositions(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('employee_positions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchActivePositions() {
  const { data, error } = await supabase
    .from('employee_positions')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  if (error) handleSupabaseError(error);
  return data || [];
}

/** Fetch salary calculation data for a given month */
export async function fetchSalaryCalcData(paymentMonth: string) {
  const [projectsRes, advancesRes, insurancesRes, paymentsRes, settingsRes] = await Promise.all([
    supabase.from('projects').select('id, project_code, referrer_name, referrer_commission_rate, total_income_myr, status').eq('status', 'completed'),
    supabase.from('salary_advances').select('id, employee_id, amount_myr, is_deducted').eq('is_deducted', false),
    supabase.from('insurance_payments').select('employee_id, company_contribution, employee_contribution, payment_month').eq('payment_month', paymentMonth),
    supabase.from('salary_payments').select('employee_id, payment_month').eq('payment_month', paymentMonth),
    supabase.from('payroll_settings').select('setting_type, setting_key, setting_value'),
  ]);

  return {
    projects: projectsRes.data || [],
    advances: advancesRes.data || [],
    insurances: insurancesRes.data || [],
    issuedEmployeeIds: (paymentsRes.data || []).map((p: any) => p.employee_id),
    payrollSettings: settingsRes.data || [],
  };
}

/** Issue salary for one employee */
export async function issueSalary(data: Record<string, any>, advanceIds: string[]) {
  const { error: paymentError } = await supabase.from('salary_payments').insert(data as any);
  if (paymentError) handleSupabaseError(paymentError);

  if (advanceIds.length > 0) {
    const { error: advanceError } = await supabase
      .from('salary_advances')
      .update({ is_deducted: true })
      .in('id', advanceIds);
    if (advanceError) handleSupabaseError(advanceError);
  }
}

// ══════════════════════════════════════
// Payroll Settings
// ══════════════════════════════════════

export async function fetchPayrollSettings() {
  const { data, error } = await supabase
    .from('payroll_settings')
    .select('*');
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function upsertPayrollSetting(
  settingType: string,
  settingKey: string,
  settingValue: Record<string, any>
) {
  const { error } = await supabase
    .from('payroll_settings')
    .upsert(
      { setting_type: settingType, setting_key: settingKey, setting_value: settingValue },
      { onConflict: 'setting_type,setting_key' }
    );
  if (error) handleSupabaseError(error);
}

export async function deletePayrollSetting(id: string) {
  const { error } = await supabase
    .from('payroll_settings')
    .delete()
    .eq('id', id);
  if (error) handleSupabaseError(error);
}
