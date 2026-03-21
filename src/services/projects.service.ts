/**
 * Projects Service
 * 
 * 项目数据访问层。
 */

import { supabase, handleSupabaseError, requireTenantId, PaginatedResult, DateRangeFilter } from './base';

// ===== Types =====

export interface Project {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
  contract_amount: number;
  contract_amount_myr: number;
  currency: string;
  contract_currency: string;
  customer_name: string;
  total_income_myr: number;
  total_expense_myr: number;
  total_material_myr: number;
  total_labor_myr: number;
  total_other_expense_myr: number;
  total_addition_myr: number;
  net_profit_myr: number;
  delivery_date: string | null;
  warranty_end_date: string | null;
  final_payment_date: string | null;
  category_id: string | null;
  category_name: string | null;
  client_name: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string | null;
}

export interface ProjectStats {
  total: number;
  inProgress: number;
  completed: number;
  paused: number;
  totalContractMYR: number;
  totalReceivedMYR: number;
  totalAdditionMYR: number;
  totalPendingMYR: number;
  totalExpenseMYR: number;
  totalProfitMYR: number;
}

export interface ProjectFilters {
  status?: string;
  search?: string;
  categoryId?: string;
}

// ===== Query Functions =====

/**
 * 获取项目列表
 */
export async function fetchProjects(
  tenantId: string,
  filters?: ProjectFilters
): Promise<Project[]> {
  requireTenantId(tenantId);
  
  let query = (supabase
    .from('projects')
    .select('*') as any)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.search?.trim()) {
    const s = filters.search.trim();
    query = query.or(`project_code.ilike.%${s}%,project_name.ilike.%${s}%,client_name.ilike.%${s}%`);
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  
  const { data, error } = await query;
  if (error) handleSupabaseError(error);
  return (data || []) as Project[];
}

/**
 * 获取单个项目
 */
export async function fetchProject(projectId: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  
  if (error) handleSupabaseError(error);
  return data as unknown as Project;
}

/**
 * 计算项目统计数据
 */
export function calculateProjectStats(projects: Project[]): ProjectStats {
  return {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    paused: projects.filter(p => p.status === 'paused').length,
    totalContractMYR: projects.reduce((s, p) => s + Number(p.contract_amount_myr || 0), 0),
    totalReceivedMYR: projects.reduce((s, p) => s + Number(p.total_income_myr || 0), 0),
    totalAdditionMYR: projects.reduce((s, p) => s + Number(p.total_addition_myr || 0), 0),
    totalPendingMYR: projects.reduce((s, p) => {
      const pending = Number(p.contract_amount_myr || 0) - Number(p.total_income_myr || 0);
      return s + Math.max(0, pending);
    }, 0),
    totalExpenseMYR: projects.reduce((s, p) => s + Number(p.total_expense_myr || 0), 0),
    totalProfitMYR: projects.reduce((s, p) => s + Number(p.net_profit_myr || 0), 0),
  };
}

// ===== Project Financials =====

export interface ProjectTransaction {
  id: string;
  sequence_no: number;
  transaction_date: string;
  type: string;
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
}

export interface ProjectAddition {
  id: string;
  addition_date: string;
  description: string;
  amount: number;
  currency: string;
  amount_myr: number;
  is_paid: boolean;
  remark: string | null;
}

/**
 * 获取项目财务详情（项目、交易、增项）
 */
export async function fetchProjectFinancials(projectId: string) {
  const [projectRes, transactionsRes, additionsRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('project_id', projectId)
      .eq('ledger_type', 'project')
      .order('transaction_date', { ascending: false })
      .order('sequence_no', { ascending: false })
      .limit(5000),
    supabase
      .from('project_additions')
      .select('*')
      .eq('project_id', projectId)
      .order('addition_date', { ascending: false }),
  ]);

  let transactions: ProjectTransaction[] = transactionsRes.data || [];

  if (transactionsRes.data) {
    const userIds = [...new Set(transactionsRes.data.map(tx => tx.created_by).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.username]) || []);
      transactions = transactionsRes.data.map(tx => ({
        ...tx,
        creator_name: tx.created_by ? profileMap.get(tx.created_by) || null : null,
      })) as ProjectTransaction[];
    }
  }

  return {
    project: projectRes.data as unknown as Project | null,
    transactions,
    additions: (additionsRes.data || []) as ProjectAddition[],
  };
}

/**
 * 删除项目增项
 */
export async function deleteProjectAddition(id: string): Promise<void> {
  const { error } = await supabase.from('project_additions').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

/**
 * 标记增项为已付款
 */
export async function markAdditionPaid(id: string): Promise<void> {
  const { error } = await supabase
    .from('project_additions')
    .update({ is_paid: true })
    .eq('id', id);
  if (error) handleSupabaseError(error);
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

/**
 * 获取项目列表的创建者信息和交易汇总
 */
export async function fetchProjectListHelpers(projects: { id: string; created_by?: string | null }[]) {
  const userIds = [...new Set(projects.map(p => p.created_by).filter(Boolean))] as string[];
  const projectIds = projects.map(p => p.id);

  const [profilesRes, transactionsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('user_id, display_name, username').in('user_id', userIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('transactions').select('project_id, type, amount_myr').eq('ledger_type', 'project').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map<string, string>(
    (profilesRes.data || []).map(p => [p.user_id, p.display_name || p.username])
  );

  const totalsMap = new Map<string, { income: number; expense: number }>();
  (transactionsRes.data || []).forEach(tx => {
    if (!tx.project_id) return;
    const existing = totalsMap.get(tx.project_id) || { income: 0, expense: 0 };
    if (tx.type === 'income') existing.income += tx.amount_myr;
    else existing.expense += tx.amount_myr;
    totalsMap.set(tx.project_id, existing);
  });

  return { profileMap, totalsMap };
}

// ══════════════════════════════════════
// Project Payments
// ══════════════════════════════════════

export async function fetchProjectPayments(projectId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('project_payments')
    .select('*')
    .eq('project_id', projectId)
    .order('payment_date', { ascending: true });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function deleteProjectPayment(id: string): Promise<void> {
  const { error } = await supabase.from('project_payments').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Project Financials Detail
// ══════════════════════════════════════

export async function fetchProjectFinancialsDetail(projectId: string): Promise<{
  transactions: any[];
  additions: any[];
  projectData: any;
}> {
  const [transactionsRes, additionsRes, projectRes] = await Promise.all([
    supabase.from('transactions').select('*').eq('project_id', projectId).eq('ledger_type', 'project')
      .order('transaction_date', { ascending: false }).order('sequence_no', { ascending: false }),
    supabase.from('project_additions').select('*').eq('project_id', projectId)
      .order('addition_date', { ascending: false }),
    supabase.from('projects').select('*').eq('id', projectId).single(),
  ]);

  let transactions = transactionsRes.data || [];
  const userIds = [...new Set(transactions.map((tx: any) => tx.created_by).filter(Boolean))];
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, username').in('user_id', userIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.username]) || []);
    transactions = transactions.map((tx: any) => ({
      ...tx,
      creator_name: tx.created_by ? profileMap.get(tx.created_by) || null : null,
    }));
  }

  return {
    transactions,
    additions: additionsRes.data || [],
    projectData: projectRes.data,
  };
}

export async function markAdditionAsPaid(additionId: string): Promise<void> {
  const { error } = await supabase.from('project_additions').update({ is_paid: true }).eq('id', additionId);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Project CRUD
// ══════════════════════════════════════

export async function fetchActiveEmployees(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase.from('employees').select('id, name').eq('status', 'active').order('name');
  return data || [];
}

export async function fetchLatestExchangeRateForCurrency(currency: string): Promise<number | null> {
  if (currency === 'MYR') return 1;
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', currency as any)
    .eq('to_currency', 'MYR')
    .order('rate_date', { ascending: false })
    .limit(1)
    .single();
  return data?.rate ?? null;
}

export async function createProject(payload: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('projects').insert(payload as any);
  if (error) handleSupabaseError(error);
}

export async function updateProject(id: string, payload: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('projects').update(payload as any).eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Project Transaction Delete (with balance)
// ══════════════════════════════════════

export async function deleteProjectTransactionWithBalance(transactionId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_transaction_with_balance', { _transaction_id: transactionId });
  if (error) handleSupabaseError(error);
}

export async function recalculateProjectSummary(projectId: string): Promise<void> {
  const { error } = await supabase.rpc('recalculate_project_summary', { _project_id: projectId });
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Project Expenses
// ══════════════════════════════════════

export async function createProjectExpense(payload: Record<string, any>) {
  const { error } = await supabase.from('project_expenses').insert(payload as any);
  if (error) handleSupabaseError(error);
}

export async function updateProjectExpense(id: string, payload: Record<string, any>) {
  const { error } = await supabase.from('project_expenses').update(payload as any).eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Project Transaction (with balance updates)
// ══════════════════════════════════════

export async function createProjectTransaction(payload: Record<string, any>): Promise<string> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(payload as any)
    .select('id')
    .single();
  if (error) handleSupabaseError(error);
  return data!.id;
}

export async function updateProjectTransaction(id: string, payload: Record<string, any>) {
  const { error } = await supabase.from('transactions').update(payload as any).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function updateTransactionReceiptUrl(id: string, receiptUrl: string) {
  const { error } = await supabase.from('transactions').update({ receipt_url_1: receiptUrl }).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function adjustAccountBalance(currency: string, accountType: string, delta: number) {
  const { data: account } = await supabase
    .from('company_accounts')
    .select('balance')
    .eq('currency', currency as any)
    .eq('account_type', accountType as any)
    .single();
  if (account) {
    await supabase
      .from('company_accounts')
      .update({ balance: account.balance + delta })
      .eq('currency', currency as any)
      .eq('account_type', accountType as any);
  }
}

export async function updateProjectStats(
  projectId: string,
  amountMyr: number,
  type: 'income' | 'expense',
  operation: 'add' | 'subtract' | 'update',
  oldAmountMyr?: number,
  oldType?: 'income' | 'expense'
) {
  const { data: project } = await supabase
    .from('projects')
    .select('total_income_myr, total_expense_myr, net_profit_myr')
    .eq('id', projectId)
    .single();
  if (!project) return;

  let newIncome = project.total_income_myr || 0;
  let newExpense = project.total_expense_myr || 0;

  if (operation === 'add') {
    if (type === 'income') newIncome += amountMyr;
    else newExpense += amountMyr;
  } else if (operation === 'subtract') {
    if (type === 'income') newIncome -= amountMyr;
    else newExpense -= amountMyr;
  } else if (operation === 'update' && oldAmountMyr !== undefined && oldType) {
    if (oldType === 'income') newIncome -= oldAmountMyr;
    else newExpense -= oldAmountMyr;
    if (type === 'income') newIncome += amountMyr;
    else newExpense += amountMyr;
  }

  await supabase
    .from('projects')
    .update({
      total_income_myr: newIncome,
      total_expense_myr: newExpense,
      net_profit_myr: newIncome - newExpense,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
}

// ══════════════════════════════════════
// Project Categories
// ══════════════════════════════════════

export async function fetchProjectCategories(tenantId: string) {
  const { data } = await supabase
    .from('project_categories')
    .select('*')
    .eq('is_active', true)
    .eq('tenant_id', tenantId);
  return data || [];
}

// ══════════════════════════════════════
// Payable Payment Receipt Update
// ══════════════════════════════════════

export async function updatePayablePaymentReceipt(paymentId: string, receiptUrl: string) {
  await (supabase as any)
    .from('payable_payments')
    .update({ receipt_url: receiptUrl })
    .eq('id', paymentId);
}

// ══════════════════════════════════════
// Payable Form - Fetch Projects
// ══════════════════════════════════════

export async function fetchProjectsForSelect() {
  const { data } = await supabase
    .from('projects')
    .select('id, project_code, project_name');
  return data || [];
}

// ══════════════════════════════════════
// Projects With Transactions (for hook)
// ══════════════════════════════════════

export async function fetchProjectsWithTransactions(tenantId: string, statusFilter: string) {
  let query = supabase.from('projects').select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter as 'in_progress' | 'completed' | 'paused');
  }
  const { data } = await query;
  if (!data) return { projects: [] as any[], totalsMap: new Map<string, { income: number; expense: number }>(), allTx: [] as any[] };

  const projectIds = data.map(p => p.id);
  let txData: any[] = [];
  if (projectIds.length > 0) {
    const { data: rawTx } = await supabase.from('transactions')
      .select('project_id, type, amount_myr, amount, currency, account_type')
      .eq('ledger_type', 'project')
      .in('project_id', projectIds);
    txData = rawTx || [];
  }

  const totalsMap = new Map<string, { income: number; expense: number }>();
  txData.forEach(tx => {
    if (!tx.project_id) return;
    const existing = totalsMap.get(tx.project_id) || { income: 0, expense: 0 };
    if (tx.type === 'income') existing.income += tx.amount_myr;
    else existing.expense += tx.amount_myr;
    totalsMap.set(tx.project_id, existing);
  });

  return {
    projects: data,
    totalsMap,
    allTx: txData.map(tx => ({
      type: tx.type, currency: tx.currency,
      account_type: tx.account_type, amount: Number(tx.amount || 0),
    })),
  };
}

// ══════════════════════════════════════
// Project Additions
// ══════════════════════════════════════

export async function saveProjectAddition(
  payload: Record<string, any>,
  additionId?: string
) {
  if (additionId) {
    const { error } = await supabase
      .from('project_additions')
      .update(payload)
      .eq('id', additionId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase
      .from('project_additions')
      .insert(payload as any);
    if (error) handleSupabaseError(error);
  }
}
