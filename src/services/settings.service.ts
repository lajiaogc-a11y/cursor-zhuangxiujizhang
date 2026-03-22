/**
 * Settings Service
 * 系统设置、分类管理、职位管理等
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

// ── Admin Check ──

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  return !!data;
}

// ══════════════════════════════════════
// Transaction Categories (公司收支分类)
// ══════════════════════════════════════

export interface TransactionCategory {
  id: string;
  name: string;
  type: TransactionType;
  description: string | null;
  is_active: boolean | null;
  created_at: string;
  tenant_id: string | null;
}

export async function fetchTransactionCategories(tenantId?: string): Promise<TransactionCategory[]> {
  let query = supabase
    .from('transaction_categories')
    .select('*')
    .order('type')
    .order('name');
  if (tenantId) query = query.eq('tenant_id', tenantId);
  const { data, error } = await query;
  if (error) handleSupabaseError(error);
  return (data || []) as TransactionCategory[];
}

export async function saveTransactionCategory(
  payload: { name: string; type: TransactionType; description: string | null; is_active: boolean; tenant_id?: string },
  editId?: string
) {
  if (editId) {
    const { error } = await supabase.from('transaction_categories').update(payload).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('transaction_categories').insert(payload);
    if (error) handleSupabaseError(error);
  }
}

export async function toggleTransactionCategory(id: string, currentActive: boolean) {
  const { error } = await supabase.from('transaction_categories').update({ is_active: !currentActive }).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function deleteTransactionCategory(id: string) {
  const { error } = await supabase.from('transaction_categories').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Project Categories (项目分类)
// ══════════════════════════════════════

export interface ProjectCategory {
  id: string;
  name: string;
  type: TransactionType;
  description: string | null;
  is_active: boolean | null;
  created_at: string;
  tenant_id: string | null;
}

export async function fetchProjectCategories(): Promise<ProjectCategory[]> {
  const { data, error } = await supabase
    .from('project_categories')
    .select('*')
    .order('type')
    .order('name');
  if (error) handleSupabaseError(error);
  return (data || []) as ProjectCategory[];
}

export async function saveProjectCategory(
  payload: { name: string; type: TransactionType; description: string | null; is_active: boolean; tenant_id?: string },
  editId?: string
) {
  if (editId) {
    const { error } = await supabase.from('project_categories').update(payload).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('project_categories').insert(payload);
    if (error) handleSupabaseError(error);
  }
}

export async function toggleProjectCategory(id: string, currentActive: boolean) {
  const { error } = await supabase.from('project_categories').update({ is_active: !currentActive }).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function deleteProjectCategory(id: string) {
  const { error } = await supabase.from('project_categories').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Employee Positions (职位管理)
// ══════════════════════════════════════

export interface Position {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export async function fetchPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from('employee_positions')
    .select('*')
    .order('name');
  if (error) handleSupabaseError(error);
  return (data || []) as Position[];
}

export async function addPosition(name: string) {
  const { error } = await supabase.from('employee_positions').insert({ name });
  if (error) throw error; // preserve error code for duplicate check
}

export async function updatePosition(id: string, name: string) {
  const { error } = await supabase.from('employee_positions').update({ name }).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function togglePositionActive(id: string, currentStatus: boolean) {
  const { error } = await supabase.from('employee_positions').update({ is_active: !currentStatus }).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function deletePosition(id: string) {
  const { error } = await supabase.from('employee_positions').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Export / Stats helpers (existing)
// ══════════════════════════════════════

export async function fetchTransactionStatsForExport(
  tenantId: string,
  filters: {
    typeFilter?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  let query = supabase
    .from('transactions_with_details')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('ledger_type', ['company_daily', 'exchange'] as any)
    .order('transaction_date', { ascending: false })
    .order('sequence_no', { ascending: false });

  if (filters.typeFilter && filters.typeFilter !== 'all') {
    query = query.eq('type', filters.typeFilter as any);
  }
  if (filters.search?.trim()) {
    query = query.or(`summary.ilike.%${filters.search}%,category_name.ilike.%${filters.search}%`);
  }
  if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);

  const { data, error } = await query;
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchCompanyAccountBalances(tenantId: string) {
  const { data, error } = await supabase
    .from('company_accounts')
    .select('currency, account_type, balance')
    .eq('tenant_id', tenantId);
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchCategoryTransactionStats(
  tenantId: string,
  filters: { dateFrom?: string; dateTo?: string }
): Promise<{
  income: Array<{ category_name: string; total: number; percentage: number }>;
  expense: Array<{ category_name: string; total: number; percentage: number }>;
}> {
  let query = supabase
    .from('transactions')
    .select('type, category_name, amount_myr')
    .eq('tenant_id', tenantId)
    .in('ledger_type', ['company_daily', 'exchange'] as any);

  if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);

  const { data, error } = await query;
  if (error) handleSupabaseError(error);

  const incomeMap: Record<string, number> = {};
  const expenseMap: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpense = 0;

  (data || []).forEach(tx => {
    const cat = tx.category_name || '未分类';
    const amt = Number(tx.amount_myr || 0);
    if (tx.type === 'income') {
      incomeMap[cat] = (incomeMap[cat] || 0) + amt;
      totalIncome += amt;
    } else {
      expenseMap[cat] = (expenseMap[cat] || 0) + amt;
      totalExpense += amt;
    }
  });

  const toSorted = (map: Record<string, number>, total: number) =>
    Object.entries(map)
      .map(([category_name, total_val]) => ({
        category_name,
        total: total_val,
        percentage: total > 0 ? (total_val / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

  return {
    income: toSorted(incomeMap, totalIncome),
    expense: toSorted(expenseMap, totalExpense),
  };
}

export async function fetchTransactionStatsRaw(
  tenantId: string,
  filters: {
    accountType?: string;
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  // Fetch all records (bypass Supabase default 1000 row limit)
  const allData: any[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('transactions')
      .select('type, amount, amount_myr, currency, account_type, ledger_type')
      .eq('tenant_id', tenantId)
      .in('ledger_type', ['company_daily', 'exchange'] as any)
      .range(from, from + pageSize - 1);

    if (filters.accountType && filters.accountType !== 'all') {
      query = query.eq('account_type', filters.accountType as any);
    }
    if (filters.currency && filters.currency !== 'all') {
      query = query.eq('currency', filters.currency as any);
    }
    if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);

    const { data, error } = await query;
    if (error) handleSupabaseError(error);
    
    if (data && data.length > 0) {
      allData.push(...data);
      if (data.length < pageSize) hasMore = false;
      else from += pageSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

export async function batchImportTransactions(
  rows: any[],
  batchSize: number,
  onProgress: (progress: number, inserted: number) => boolean
): Promise<{ insertedCount: number; errors: string[] }> {
  let insertedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const cancelled = onProgress(
      Math.round(((i) / rows.length) * 100),
      insertedCount
    );
    if (cancelled) break;

    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) errors.push(error.message);
    else insertedCount += batch.length;
  }

  // After import, update company_accounts balances for all affected currency+account_type combos
  if (insertedCount > 0 && rows.length > 0) {
    const tenantId = rows[0].tenant_id;
    if (tenantId) {
      try {
        await recalculateAccountBalances(tenantId);
      } catch (e) {
        console.error('Failed to recalculate account balances after import:', e);
      }
    }
  }

  return { insertedCount, errors };
}

// ══════════════════════════════════════
// Tax Rates (税率管理)
// ══════════════════════════════════════

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  tax_type: string;
  is_inclusive: boolean | null;
  is_active: boolean | null;
  description: string | null;
}

export async function fetchTaxRates(tenantId: string): Promise<TaxRate[]> {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('tax_rates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []) as TaxRate[];
}

export async function saveTaxRate(
  tenantId: string,
  payload: { name: string; rate: number; tax_type: string; is_inclusive: boolean; is_active: boolean; description: string | null },
  id?: string
): Promise<void> {
  requireTenantId(tenantId);
  if (id) {
    const { error } = await supabase.from('tax_rates').update(payload).eq('id', id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('tax_rates').insert({ ...payload, tenant_id: tenantId });
    if (error) handleSupabaseError(error);
  }
}

export async function deleteTaxRate(id: string): Promise<void> {
  const { error } = await supabase.from('tax_rates').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Materials (q_materials)
// ══════════════════════════════════════

export interface Material {
  id: string;
  name: string;
  code: string | null;
  category: string;
  unit: string;
  specification: string | null;
  brand: string | null;
  default_price: number;
  currency: string;
  min_stock: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export async function fetchMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from('q_materials')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []) as Material[];
}

export async function upsertMaterial(
  values: Omit<Material, 'id' | 'is_active' | 'created_at'>,
  id?: string
): Promise<void> {
  if (id) {
    const { error } = await supabase.from('q_materials').update(values).eq('id', id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('q_materials').insert(values);
    if (error) handleSupabaseError(error);
  }
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('q_materials').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Profile helpers (for GlobalSettings)
// ══════════════════════════════════════

export async function fetchDisplayName(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.display_name || '';
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('user_id', userId);
  if (error) handleSupabaseError(error);
}

export async function logAuditEntry(entry: {
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  action_display: string;
  table_display_name: string;
}): Promise<void> {
  const { error } = await (supabase as any).from('audit_logs').insert(entry);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Audit Logs
// ══════════════════════════════════════

export interface AuditLogFilters {
  table?: string;
  action?: string;
  dateRange?: 'all' | 'today' | 'week' | 'month';
}

export async function fetchAuditLogs(filters?: AuditLogFilters): Promise<any[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.table && filters.table !== 'all') {
    query = query.eq('table_name', filters.table);
  }
  if (filters?.action && filters.action !== 'all') {
    query = query.eq('action', filters.action);
  }

  const now = new Date();
  if (filters?.dateRange === 'today') {
    const today = now.toISOString().slice(0, 10);
    query = query.gte('created_at', today);
  } else if (filters?.dateRange === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    query = query.gte('created_at', weekAgo.toISOString());
  } else if (filters?.dateRange === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    query = query.gte('created_at', monthAgo.toISOString());
  }

  const { data, error } = await query;
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchProfilesByUserIds(userIds: string[]): Promise<Map<string, { username: string; display_name: string | null }>> {
  if (userIds.length === 0) return new Map();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username, display_name')
    .in('user_id', userIds);
  return new Map(
    (profiles || []).map(p => [p.user_id, { username: p.username, display_name: p.display_name }])
  );
}

export async function restoreAuditLog(
  tableName: string,
  recordId: string,
  restoreData: Record<string, any>,
  auditLogId: string
): Promise<void> {
  const { error } = await supabase
    .from(tableName as any)
    .update(restoreData)
    .eq('id', recordId);
  if (error) handleSupabaseError(error);

  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from('audit_logs')
    .update({
      restored_at: new Date().toISOString(),
      restored_by: user?.id,
    })
    .eq('id', auditLogId);
}

// ══════════════════════════════════════
// Data Export / Import
// ══════════════════════════════════════

export async function fetchTableDataPaginated(tableName: string): Promise<any[]> {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allData;
}

export async function saveImportHistory(record: {
  file_name: string;
  file_size: number | null;
  imported_by: string | null;
  status: string;
  total_tables: number;
  total_records: number;
  success_tables: number;
  success_records: number;
  failed_tables: number;
  error_message: string | null;
  details: any;
}): Promise<void> {
  const { error } = await supabase.from('import_history').insert(record);
  if (error) console.error('Failed to save import history:', error);
}

// ══════════════════════════════════════
// Account Management
// ══════════════════════════════════════

export async function fetchAccountsWithTransactionTotals(tenantId: string): Promise<{
  accounts: any[];
  transactionTotals: Record<string, number>;
}> {
  requireTenantId(tenantId);
  
  const [accountsRes, transactionsRes] = await Promise.all([
    supabase.from('company_accounts').select('*').eq('tenant_id', tenantId).order('currency').order('account_type'),
    supabase.from('transactions').select('currency, account_type, type, amount').eq('tenant_id', tenantId),
  ]);

  const totals: Record<string, number> = {};
  transactionsRes.data?.forEach((tx: any) => {
    const key = `${tx.currency}-${tx.account_type}`;
    const delta = tx.type === 'income' ? tx.amount : -tx.amount;
    totals[key] = (totals[key] || 0) + delta;
  });

  return {
    accounts: accountsRes.data || [],
    transactionTotals: totals,
  };
}

export async function toggleAccountIncludeInStats(accountId: string, include: boolean): Promise<void> {
  const { error } = await supabase
    .from('company_accounts')
    .update({ include_in_stats: include })
    .eq('id', accountId);
  if (error) handleSupabaseError(error);
}

export async function adjustAccountInitialBalance(accountId: string, balance: number): Promise<void> {
  const { error } = await supabase
    .from('company_accounts')
    .update({ balance, updated_at: new Date().toISOString() })
    .eq('id', accountId);
  if (error) handleSupabaseError(error);
}

export async function recalculateAccountBalances(tenantId: string): Promise<void> {
  requireTenantId(tenantId);

  const PAGE_SIZE = 1000;

  // 分页取全部 transactions，避免 Supabase 默认 1000 行截断
  let allTx: { currency: string; account_type: string; type: string; amount: number }[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select('currency, account_type, type, amount')
      .eq('tenant_id', tenantId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allTx = allTx.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // 分页取全部 exchange_transactions
  let allEx: { out_currency: string; out_account_type: string; out_amount: number; in_currency: string; in_account_type: string; in_amount: number }[] = [];
  page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('exchange_transactions')
      .select('out_currency, out_account_type, out_amount, in_currency, in_account_type, in_amount')
      .eq('tenant_id', tenantId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allEx = allEx.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const balanceMap: Record<string, number> = {};
  const currencies = ['MYR', 'CNY', 'USD'];
  const accountTypes = ['cash', 'bank'];
  currencies.forEach(c => accountTypes.forEach(a => { balanceMap[`${c}-${a}`] = 0; }));

  allTx.forEach((tx: any) => {
    const key = `${tx.currency}-${tx.account_type}`;
    balanceMap[key] = (balanceMap[key] || 0) + (tx.type === 'income' ? tx.amount : -tx.amount);
  });

  allEx.forEach((ex: any) => {
    balanceMap[`${ex.out_currency}-${ex.out_account_type}`] = (balanceMap[`${ex.out_currency}-${ex.out_account_type}`] || 0) - ex.out_amount;
    balanceMap[`${ex.in_currency}-${ex.in_account_type}`] = (balanceMap[`${ex.in_currency}-${ex.in_account_type}`] || 0) + ex.in_amount;
  });

  for (const [key, balance] of Object.entries(balanceMap)) {
    const [currency, accountType] = key.split('-');
    const { data: existing } = await supabase
      .from('company_accounts')
      .select('id')
      .eq('currency', currency as any)
      .eq('account_type', accountType as any)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existing) {
      await supabase.from('company_accounts').update({ balance, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else if (balance !== 0) {
      await supabase.from('company_accounts').insert({ currency: currency as any, account_type: accountType as any, balance, tenant_id: tenantId });
    }
  }
}

// ══════════════════════════════════════
// Generic Table Operations (for import/export)
// ══════════════════════════════════════

export async function fetchImportHistory(limit = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .order('imported_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getTableRowCount(tableName: string): Promise<number> {
  const { count, error } = await supabase
    .from(tableName as any)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

export async function deleteByIds(tableName: string, ids: string[]): Promise<void> {
  const { error } = await supabase
    .from(tableName as any)
    .delete()
    .in('id', ids);
  if (error) throw error;
}

export async function insertAndReturnIds(tableName: string, data: any[]): Promise<string[]> {
  const { error, data: insertedData } = await supabase
    .from(tableName as any)
    .insert(data as any)
    .select('id') as { error: any; data: { id: string }[] | null };
  if (error) throw error;
  return (insertedData || []).map(r => r.id);
}

// ══════════════════════════════════════
// User Management
// ══════════════════════════════════════

export async function fetchTenantUsers(tenantId: string) {
  const { data: tenantMembers, error: tmError } = await supabase
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);
  if (tmError) handleSupabaseError(tmError);

  const memberUserIds = (tenantMembers || []).map(m => m.user_id);
  if (memberUserIds.length === 0) return { profiles: [], roles: [] };

  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from('profiles').select('*').in('user_id', memberUserIds).order('created_at', { ascending: false }),
    supabase.from('user_roles').select('*').in('user_id', memberUserIds),
  ]);
  if (profilesRes.error) handleSupabaseError(profilesRes.error);

  return { profiles: profilesRes.data || [], roles: rolesRes.data || [] };
}

export async function updateUserRole(userId: string, newRole: string) {
  await supabase.from('user_roles').delete().eq('user_id', userId);
  const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole } as any);
  if (error) handleSupabaseError(error);
}

export async function fetchUserPermissions(userId: string) {
  const { data } = await supabase
    .from('user_permissions')
    .select('permission_key, granted')
    .eq('user_id', userId);
  return data || [];
}

export async function saveUserPermissions(userId: string, permissions: { permission_key: string; granted: boolean }[]) {
  await supabase.from('user_permissions').delete().eq('user_id', userId);
  const rows = permissions.map(p => ({ user_id: userId, ...p }));
  const { error } = await supabase.from('user_permissions').insert(rows);
  if (error) handleSupabaseError(error);
}

export async function deleteUserData(userId: string) {
  await supabase.from('user_permissions').delete().eq('user_id', userId);
  const { error: roleError } = await supabase.from('user_roles').delete().eq('user_id', userId);
  if (roleError) handleSupabaseError(roleError);
  const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', userId);
  if (profileError) handleSupabaseError(profileError);
}

export async function invokeAdminUserManagement(action: string, body: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  const response = await supabase.functions.invoke('admin-user-management', {
    body: { action, ...body },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (response.error) throw new Error(response.error.message);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}

export async function invokeDeleteUser(userId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.functions.invoke('delete-user', {
    body: { userId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}

export async function invokeSyncProfileEmails() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  const response = await supabase.functions.invoke('sync-profile-emails', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

// ══════════════════════════════════════
// Tenant Config
// ══════════════════════════════════════

export async function fetchTenantsConfig() {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, plan, status, max_members, expires_at, created_at')
    .order('created_at', { ascending: true });
  if (error) handleSupabaseError(error);
  return data || [];
}

// Removed: fetchTenantMemberCounts and updateTenantConfig moved to admin.service.ts

// ══════════════════════════════════════
// Material Supplier Prices
// ══════════════════════════════════════

export async function fetchMaterialSupplierPrices(materialId: string) {
  const { data, error } = await supabase
    .from('q_material_supplier_prices')
    .select('*, q_suppliers(name, company_name, phone)')
    .eq('material_id', materialId)
    .order('unit_price', { ascending: true });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchActiveSuppliers() {
  const { data, error } = await supabase
    .from('q_suppliers')
    .select('id, name, company_name')
    .eq('is_active', true)
    .order('name');
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function addMaterialSupplierPrice(input: Record<string, any>) {
  const { error } = await supabase.from('q_material_supplier_prices').insert(input as any);
  if (error) handleSupabaseError(error);
}

export async function setPreferredSupplierPrice(materialId: string, priceId: string) {
  await supabase.from('q_material_supplier_prices').update({ is_preferred: false }).eq('material_id', materialId);
  const { error } = await supabase.from('q_material_supplier_prices').update({ is_preferred: true }).eq('id', priceId);
  if (error) handleSupabaseError(error);
}

export async function deleteMaterialSupplierPrice(id: string) {
  const { error } = await supabase.from('q_material_supplier_prices').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Analytics Events (batched insert)
// ══════════════════════════════════════

export async function insertAnalyticsEvents(events: Array<Record<string, any>>) {
  await (supabase.from('analytics_events' as any) as any).insert(events);
}

// ══════════════════════════════════════
// File Upload (Storage)
// ══════════════════════════════════════

export async function uploadFileToStorage(bucket: string, path: string, file: File) {
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return path;
}

// ══════════════════════════════════════
// AI Chat / Report (Edge Functions)
// ══════════════════════════════════════

export async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function fetchFinancialContext(tenantId: string) {
  const [accountsRes, transactionsRes, projectsRes] = await Promise.all([
    supabase.from('company_accounts').select('*').eq('tenant_id', tenantId),
    supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('transaction_date', { ascending: false }).limit(10),
    supabase.from('projects').select('status, contract_amount_myr, net_profit_myr').eq('tenant_id', tenantId),
  ]);

  const projectsSummary = projectsRes.data?.reduce((acc: any, p: any) => {
    acc.total = (acc.total || 0) + 1;
    acc.totalContract = (acc.totalContract || 0) + Number(p.contract_amount_myr || 0);
    acc.totalProfit = (acc.totalProfit || 0) + Number(p.net_profit_myr || 0);
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as any);

  return {
    accounts: accountsRes.data || [],
    recentTransactions: transactionsRes.data || [],
    projectsSummary,
  };
}

// ══════════════════════════════════════
// Tenant Data Cleanup (module-based)
// ══════════════════════════════════════

export async function fetchTenantModuleDataCounts(tenantId: string) {
  const countTable = async (table: string) => {
    const { count } = await supabase.from(table as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId);
    return count || 0;
  };

  const [
    // Quotation
    quotations, quotationVersions, quotationDrafts, qProducts, qCustomers, qProductCategories,
    // Cost
    methods, methodMaterials, breakdownItems, projectBreakdowns, laborRates, workerTypes, categoryMapping,
    // Purchasing
    purchaseOrders, poItems, receivings, receivingItems, poPayments, suppliers, materials, materialPrices, inventory, inventoryTx,
    // Finance
    transactions, exchangeTx, projects, payments, expenses, additions, alerts, payables, payablePayments,
    // CRM
    contracts, amendments, paymentPlans, signatures, contacts, contactActivities, contactReminders,
    // Workforce
    attendance, leaves, wPayroll, workOrders, shiftAssignments,
  ] = await Promise.all([
    countTable('q_quotations'), countTable('q_quotation_versions'), countTable('q_quotation_drafts'),
    countTable('q_products'), countTable('q_customers'), countTable('q_product_categories'),
    countTable('q_methods'), countTable('q_method_materials'), countTable('q_breakdown_items'),
    countTable('q_project_breakdowns'), countTable('q_labor_rates'), countTable('q_worker_types'),
    countTable('q_category_method_mapping'),
    countTable('q_purchase_orders'), countTable('q_purchase_order_items'),
    countTable('q_purchase_receivings'), countTable('q_purchase_receiving_items'),
    countTable('q_purchase_payments'), countTable('q_suppliers'), countTable('q_materials'),
    countTable('q_material_supplier_prices'), countTable('q_inventory'), countTable('q_inventory_transactions'),
    countTable('transactions'), countTable('exchange_transactions'), countTable('projects'),
    countTable('project_payments'), countTable('project_expenses'), countTable('project_additions'),
    countTable('project_alerts'), countTable('payables'), countTable('payable_payments'),
    countTable('contracts'), countTable('contract_amendments'), countTable('contract_payment_plans'),
    countTable('contract_signatures'), countTable('contacts'), countTable('contact_activities'),
    countTable('contact_reminders'),
    countTable('attendance_records'), countTable('leave_requests'), countTable('workforce_payroll'),
    countTable('work_orders'), countTable('shift_assignments'),
  ]);

  return {
    quotation: quotations + quotationVersions + quotationDrafts + qProducts + qCustomers + qProductCategories,
    cost: methods + methodMaterials + breakdownItems + projectBreakdowns + laborRates + workerTypes + categoryMapping,
    purchasing: purchaseOrders + poItems + receivings + receivingItems + poPayments + suppliers + materials + materialPrices + inventory + inventoryTx,
    finance: transactions + exchangeTx + projects + payments + expenses + additions + alerts + payables + payablePayments,
    crm: contracts + amendments + paymentPlans + signatures + contacts + contactActivities + contactReminders,
    workforce: attendance + leaves + wPayroll + workOrders + shiftAssignments,
  };
}

export async function batchDeleteTenantTable(
  table: string, tenantId: string, cancelCheck: () => boolean
): Promise<{ deleted: number; error?: string; cancelled?: boolean }> {
  const BATCH = 500;
  let totalDeleted = 0;
  try {
    const { count } = await supabase.from(table as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId);
    if (!count || count === 0) return { deleted: 0 };

    let hasMore = true;
    while (hasMore) {
      if (cancelCheck()) return { deleted: totalDeleted, cancelled: true };
      const { data: records, error: selErr } = await supabase.from(table as any)
        .select('id').eq('tenant_id', tenantId).limit(BATCH) as { data: { id: string }[] | null; error: any };
      if (selErr) return { deleted: totalDeleted, error: selErr.message };
      if (!records || records.length === 0) { hasMore = false; break; }
      const ids = records.map(r => r.id);
      const { error: delErr } = await supabase.from(table as any).delete().in('id', ids);
      if (delErr) return { deleted: totalDeleted, error: delErr.message };
      totalDeleted += records.length;
      if (records.length < BATCH) hasMore = false;
    }
    return { deleted: totalDeleted };
  } catch (e: any) {
    return { deleted: totalDeleted, error: e.message };
  }
}

export async function resetTenantAccountBalances(tenantId: string) {
  await supabase.from('company_accounts').update({ balance: 0 }).eq('tenant_id', tenantId);
}

export async function verifyPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}
