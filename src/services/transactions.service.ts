/**
 * Transactions Service
 * 
 * 统一的交易数据访问层。
 * 替代分散在 Transactions.tsx、Dashboard.tsx 等页面中的直接 Supabase 查询。
 */

import { 
  supabase, 
  PaginationParams, 
  PaginatedResult, 
  DateRangeFilter, 
  handleSupabaseError, 
  requireTenantId 
} from './base';

// ===== Types =====

export interface Transaction {
  id: string;
  sequence_no: number;
  transaction_date: string;
  type: 'income' | 'expense';
  ledger_type: string;
  category_name: string;
  summary: string;
  amount: number;
  currency: string;
  account_type: string;
  amount_myr: number;
  remark_1: string | null;
  remark_2: string | null;
  created_by: string | null;
  creator_name?: string | null;
  project_id: string | null;
  project_code?: string | null;
  project_name?: string | null;
  exchange_rate?: number;
  tenant_id?: string;
}

export interface TransactionFilters {
  type?: 'income' | 'expense';
  accountType?: string;
  currency?: string;
  search?: string;
  category?: string;
  dateRange?: DateRangeFilter;
  ledgerTypes?: string[];
}

export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
}

export interface CurrencyBreakdown {
  [currency: string]: {
    income: number;
    expense: number;
  };
}

export interface TransactionCreateInput {
  transaction_date: string;
  type: 'income' | 'expense';
  ledger_type: string;
  category_name: string;
  summary: string;
  amount: number;
  currency: string;
  account_type: string;
  exchange_rate: number;
  amount_myr: number;
  project_id?: string | null;
  remark_1?: string | null;
  remark_2?: string | null;
  created_by?: string | null;
  tenant_id: string;
}

// ===== Query Functions =====

/**
 * 获取交易列表（分页 + 筛选）
 */
export async function fetchTransactions(
  tenantId: string,
  filters: TransactionFilters,
  pagination: PaginationParams
): Promise<PaginatedResult<Transaction>> {
  requireTenantId(tenantId);
  
  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = (supabase
    .from('transactions_with_details')
    .select('*', { count: 'exact' }) as any)
    .eq('tenant_id', tenantId)
    .order('transaction_date', { ascending: false })
    .order('sequence_no', { ascending: false })
    .range(from, to);
  
  if (filters.ledgerTypes?.length) {
    query = query.in('ledger_type', filters.ledgerTypes as any);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.accountType && filters.accountType !== 'all') {
    query = query.eq('account_type', filters.accountType);
  }
  if (filters.currency && filters.currency !== 'all') {
    query = query.eq('currency', filters.currency);
  }
  if (filters.search?.trim()) {
    const trimmed = filters.search.trim();
    const isNumeric = !isNaN(Number(trimmed));
    if (isNumeric) {
      query = query.or(`summary.ilike.%${trimmed}%,category_name.ilike.%${trimmed}%,amount.eq.${trimmed}`);
    } else {
      query = query.or(`summary.ilike.%${trimmed}%,category_name.ilike.%${trimmed}%`);
    }
  }
  if (filters.dateRange?.from) {
    query = query.gte('transaction_date', filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte('transaction_date', filters.dateRange.to);
  }
  if (filters.category) {
    query = query.eq('category_name', filters.category);
  }
  
  const { data, error, count } = await query;
  if (error) handleSupabaseError(error);
  
  return {
    data: (data || []) as Transaction[],
    totalCount: count || 0,
  };
}

/**
 * 获取交易统计（按币种汇总）
 */
export async function fetchTransactionStats(
  tenantId: string,
  filters: TransactionFilters
): Promise<{ stats: TransactionStats; perCurrency: CurrencyBreakdown; rawData: any[] }> {
  requireTenantId(tenantId);
  
  let query = supabase
    .from('transactions')
    .select('type, amount, amount_myr, currency, account_type, ledger_type')
    .eq('tenant_id', tenantId);
  
  if (filters.ledgerTypes?.length) {
    query = query.in('ledger_type', filters.ledgerTypes as any);
  }
  if (filters.accountType && filters.accountType !== 'all') {
    query = query.eq('account_type', filters.accountType as any);
  }
  if (filters.currency && filters.currency !== 'all') {
    query = query.eq('currency', filters.currency as any);
  }
  if (filters.dateRange?.from) {
    query = query.gte('transaction_date', filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte('transaction_date', filters.dateRange.to);
  }
  
  const { data, error } = await query;
  if (error) handleSupabaseError(error);
  
  const records = data || [];
  const perCurrency: CurrencyBreakdown = {
    MYR: { income: 0, expense: 0 },
    CNY: { income: 0, expense: 0 },
    USD: { income: 0, expense: 0 },
  };
  
  records.forEach(t => {
    const cur = t.currency || 'MYR';
    if (!perCurrency[cur]) perCurrency[cur] = { income: 0, expense: 0 };
    if (t.type === 'income') perCurrency[cur].income += Number(t.amount || 0);
    else perCurrency[cur].expense += Number(t.amount || 0);
  });
  
  const totalIncome = records
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount_myr || 0), 0);
  const totalExpense = records
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount_myr || 0), 0);
  
  return {
    stats: { totalIncome, totalExpense },
    perCurrency,
    rawData: records,
  };
}

/**
 * 创建交易记录
 */
export async function createTransaction(input: TransactionCreateInput): Promise<Transaction> {
  requireTenantId(input.tenant_id);
  
  const { data, error } = await supabase
    .from('transactions')
    .insert(input as any)
    .select()
    .single();
  
  if (error) handleSupabaseError(error);
  return data as unknown as Transaction;
}

/**
 * 更新交易记录
 */
export async function updateTransaction(
  id: string, 
  updates: Partial<TransactionCreateInput>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();
  
  if (error) handleSupabaseError(error);
  return data as unknown as Transaction;
}

/**
 * 删除交易记录（简单删除）
 */
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) handleSupabaseError(error);
}

/**
 * 删除交易记录并原子性更新账户余额和项目汇总（使用数据库 RPC）
 */
export async function deleteTransactionWithBalanceUpdate(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_transaction_with_balance', { _transaction_id: id });
  if (error) handleSupabaseError(error);
}

/**
 * 获取交易表单所需的参考数据（分类、项目、账户余额）
 */
export async function fetchTransactionFormData(tenantId: string, excludeTransactionId?: string) {
  requireTenantId(tenantId);
  
  const [categoriesRes, projectCategoriesRes, projectsRes, accountsRes] = await Promise.all([
    supabase.from('transaction_categories').select('*').eq('is_active', true).or(`tenant_id.eq.${tenantId},tenant_id.is.null`),
    supabase.from('project_categories').select('*').eq('is_active', true).or(`tenant_id.eq.${tenantId},tenant_id.is.null`),
    supabase.from('projects').select('id, project_code, project_name, status').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('company_accounts').select('currency, account_type, balance').eq('tenant_id', tenantId),
  ]);

  // Calculate real balances
  let txQuery = supabase.from('transactions').select('currency, account_type, type, amount').eq('tenant_id', tenantId);
  if (excludeTransactionId) txQuery = txQuery.neq('id', excludeTransactionId);
  const { data: txData } = await txQuery;

  const txTotals: Record<string, number> = {};
  (txData || []).forEach(tx => {
    const key = `${tx.currency}_${tx.account_type}`;
    if (!txTotals[key]) txTotals[key] = 0;
    txTotals[key] += tx.type === 'income' ? tx.amount : -tx.amount;
  });

  const balances: Record<string, number> = {};
  (accountsRes.data || []).forEach(acc => {
    const key = `${acc.currency}_${acc.account_type}`;
    balances[key] = acc.balance + (txTotals[key] || 0);
  });

  // If no categories exist for this tenant, seed default ones
  let categories = categoriesRes.data || [];
  if (categories.length === 0) {
    const defaultCategories = [
      { name: '日常', type: 'income' as const, is_active: true, tenant_id: tenantId, description: null },
      { name: '工资', type: 'income' as const, is_active: true, tenant_id: tenantId, description: null },
      { name: '投资收益', type: 'income' as const, is_active: true, tenant_id: tenantId, description: null },
      { name: '其他收入', type: 'income' as const, is_active: true, tenant_id: tenantId, description: null },
      { name: '日常', type: 'expense' as const, is_active: true, tenant_id: tenantId, description: null },
      { name: '材料', type: 'expense' as const, is_active: true, tenant_id: tenantId, description: null },
      { name: '人工', type: 'expense' as const, is_active: true, tenant_id: tenantId, description: null },
      { name: '运输', type: 'expense' as const, is_active: true, tenant_id: tenantId, description: null },
      { name: '办公', type: 'expense' as const, is_active: true, tenant_id: tenantId, description: null },
      { name: '其他支出', type: 'expense' as const, is_active: true, tenant_id: tenantId, description: null },
    ];
    const { data: seeded } = await supabase.from('transaction_categories').insert(defaultCategories as any).select('*');
    categories = seeded || [];
  }

  return {
    categories,
    projectCategories: projectCategoriesRes.data || [],
    projects: projectsRes.data || [],
    accountBalances: balances,
  };
}

/**
 * 获取最新汇率
 */
export async function fetchLatestExchangeRate(fromCurrency: string, toCurrency: string = 'MYR'): Promise<number | null> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency as any)
    .eq('to_currency', toCurrency as any)
    .order('rate_date', { ascending: false })
    .limit(1)
    .single();
  return data ? Number(data.rate.toFixed(4)) : null;
}

// ══════════════════════════════════════
// Transaction Form Submit (create with balance update)
// ══════════════════════════════════════

export async function createTransactionWithBalance(input: TransactionCreateInput): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(input as any)
    .select('id')
    .single();
  if (error) handleSupabaseError(error);

  // Update account balance
  const multiplier = input.type === 'income' ? 1 : -1;
  const { data: account } = await supabase
    .from('company_accounts')
    .select('balance')
    .eq('currency', input.currency as any)
    .eq('account_type', input.account_type as any)
    .single();
  if (account) {
    await supabase
      .from('company_accounts')
      .update({ balance: account.balance + (input.amount * multiplier) })
      .eq('currency', input.currency as any)
      .eq('account_type', input.account_type as any);
  }

  // Recalculate project summary if applicable
  if (input.project_id) {
    await supabase.rpc('recalculate_project_summary', { _project_id: input.project_id });
  }

  return data as { id: string };
}

export async function updateTransactionFull(
  id: string,
  updates: Record<string, any>,
  oldTransaction?: { project_id?: string; amount_myr?: number; type?: string }
): Promise<void> {
  const { error } = await supabase.from('transactions').update(updates as any).eq('id', id);
  if (error) handleSupabaseError(error);

  // Recalculate affected project summaries
  const newProjectId = updates.project_id || null;
  const oldProjectId = oldTransaction?.project_id || null;
  if (oldProjectId !== newProjectId) {
    if (oldProjectId) await supabase.rpc('recalculate_project_summary', { _project_id: oldProjectId });
    if (newProjectId) await supabase.rpc('recalculate_project_summary', { _project_id: newProjectId });
  } else if (newProjectId && (oldTransaction?.amount_myr !== updates.amount_myr || oldTransaction?.type !== updates.type)) {
    await supabase.rpc('recalculate_project_summary', { _project_id: newProjectId });
  }
}

export async function updateTransactionReceiptUrl(id: string, receiptUrl: string): Promise<void> {
  const { error } = await supabase.from('transactions').update({ receipt_url_1: receiptUrl }).eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Approval Check (moved from lib/approvalCheck.ts)
// ══════════════════════════════════════

export async function checkApprovalThreshold({
  amount,
  currency,
  requestType,
  recordTable,
  recordId,
  requestedBy,
}: {
  amount: number;
  currency: string;
  requestType: string;
  recordTable: string;
  recordId: string;
  requestedBy: string;
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
      rule_id: matchingRule.id,
      request_type: requestType,
      record_table: recordTable,
      record_id: recordId,
      amount,
      currency,
      requested_by: requestedBy,
      status: 'pending',
    });

    return true;
  } catch {
    return false;
  }
}
