/**
 * Dashboard Service
 * 
 * 仪表盘数据获取与处理逻辑，从 Dashboard.tsx 的 1151 行代码中解耦。
 */

import { supabase, requireTenantId, handleSupabaseError } from './base';
import { format, subDays, endOfMonth, differenceInMonths } from 'date-fns';

// ============ Types ============

export interface FinancialSummary {
  total_myr: number;
  total_cny: number;
  total_usd: number;
  myr_cash: number;
  myr_bank: number;
  cny_cash: number;
  cny_bank: number;
  usd_cash: number;
  usd_bank: number;
  total_income_myr: number;
  total_expense_myr: number;
  equity_income_myr: number;
}

export interface BalanceStats {
  realtimeBalanceMYR: number;
  fixedBalanceMYR: number;
  equityIncomeMYR: number;
  profitLossMYR: number;
  exchangeProfitLossMYR: number;
  unpaidTotalMYR: number;
  unpaidMYR: number;
  unpaidCNY: number;
  unpaidUSD: number;
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

export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  recentTransactions: any[];
}

export interface ProjectProfitData {
  projectId: string;
  projectCode: string;
  projectName: string;
  contractAmount: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitRate: number;
}

export interface ProjectListItem {
  id: string;
  code: string;
  name: string;
  status: string;
  contractAmount: number;
  progress: number;
}

export interface MonthlyChartData {
  month: string;
  income: number;
  expense: number;
}

export interface ExpenseCategoryData {
  name: string;
  value: number;
  color: string;
}

export interface DashboardData {
  financialSummary: FinancialSummary | null;
  rates: any[];
  hasExchangeRates: boolean;
  alerts: any[];
  balanceStats: BalanceStats;
  projectStats: ProjectStats;
  projectProfitData: ProjectProfitData[];
  projectListData: ProjectListItem[];
  transactionStats: TransactionStats;
  monthlyData: MonthlyChartData[];
  pendingApprovals: number;
  overdueInvoices: number;
  fixedAssetsNetValue: number;
}

export interface CategoryAnalysisData {
  companyIncomeCategoryData: ExpenseCategoryData[];
  companyExpenseCategoryData: ExpenseCategoryData[];
  projectIncomeCategoryData: ExpenseCategoryData[];
  projectExpenseCategoryData: ExpenseCategoryData[];
  exchangeIncomeCategoryData: ExpenseCategoryData[];
  exchangeExpenseCategoryData: ExpenseCategoryData[];
}

/**
 * 分页获取租户全部交易摘要数据，避免 Supabase 1000 行默认限制
 */
async function fetchAllTransactionsSummary(tenantId: string) {
  const PAGE_SIZE = 1000;
  let allData: { type: string; amount: number; amount_myr: number; currency: string; account_type: string; category_name: string; ledger_type: string; project_id: string | null }[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, amount_myr, currency, account_type, category_name, ledger_type, project_id')
      .eq('tenant_id', tenantId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return allData;
}

// ============ Service Functions ============

const DEFAULT_BALANCE_STATS: BalanceStats = {
  realtimeBalanceMYR: 0, fixedBalanceMYR: 0, equityIncomeMYR: 0,
  profitLossMYR: 0, exchangeProfitLossMYR: 0,
  unpaidTotalMYR: 0, unpaidMYR: 0, unpaidCNY: 0, unpaidUSD: 0,
};

const DEFAULT_PROJECT_STATS: ProjectStats = {
  total: 0, inProgress: 0, completed: 0, paused: 0,
  totalContractMYR: 0, totalReceivedMYR: 0, totalAdditionMYR: 0,
  totalPendingMYR: 0, totalExpenseMYR: 0, totalProfitMYR: 0,
};

const DEFAULT_TRANSACTION_STATS: TransactionStats = {
  totalIncome: 0, totalExpense: 0, recentTransactions: [],
};

/**
 * 获取仪表盘主数据
 */
export async function fetchDashboardData(tenantId: string): Promise<DashboardData> {
  requireTenantId(tenantId);

  // 并行获取所有主要数据（使用分页获取全部交易以避免1000行截断）
  const [
    ratesRes,
    alertsRes,
    projectsRes,
    transactionsRes,
    additionsRes,
    companyAccountsRes,
    payablesRes,
  ] = await Promise.all([
    supabase.from('exchange_rates').select('*').eq('tenant_id', tenantId).order('rate_date', { ascending: false }).limit(10),
    supabase.from('project_alerts').select('*').eq('tenant_id', tenantId).eq('is_resolved', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('projects').select('id, project_code, project_name, status, contract_amount_myr, total_income_myr, total_expense_myr, net_profit_myr, total_addition_myr').eq('tenant_id', tenantId),
    supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('transaction_date', { ascending: false }).limit(10),
    supabase.from('project_additions').select('project_id, amount_myr').eq('tenant_id', tenantId),
    supabase.from('company_accounts').select('currency, account_type, balance, include_in_stats').eq('tenant_id', tenantId),
    supabase.from('payables' as any).select('unpaid_amount_myr, unpaid_amount, currency, status').eq('tenant_id', tenantId).neq('status', 'paid'),
  ]);

  // Paginated fetch of ALL transactions for accurate financial summary
  const allTenantTransactions = await fetchAllTransactionsSummary(tenantId);
  const allTenantTransactionsRes = { data: allTenantTransactions };
  
  // Project transactions derived from full dataset
  const projectTransactionsData = allTenantTransactions.filter(tx => tx.ledger_type === 'project');
  const projectTransactionsRes = { data: projectTransactionsData.map(tx => ({ project_id: tx.project_id, type: tx.type, amount_myr: tx.amount_myr })) };

  // 计算公司账户调整
  const companyAccountAdjustments = buildAccountAdjustments(companyAccountsRes.data || []);

  // 构建财务摘要
  const financialSummary = buildFinancialSummary(allTenantTransactionsRes.data || [], companyAccountAdjustments);

  // 汇率
  const rates = ratesRes.data || [];
  const hasExchangeRates = rates.length > 0;
  const latestRates = buildLatestRates(rates);

  // 余额统计
  const balanceStats = buildBalanceStats(financialSummary, companyAccountAdjustments, latestRates, (payablesRes.data as any[]) || []);

  // 项目统计
  const { projectStats, projectProfitData, projectListData } = buildProjectData(
    projectsRes.data || [], additionsRes.data || [], projectTransactionsRes.data || []
  );

  // 月度交易统计
  const now = new Date();
  const monthStart = format(now, 'yyyy-MM-01');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const { data: monthlyTransactionsData } = await supabase
    .from('transactions').select('type, amount_myr').eq('tenant_id', tenantId)
    .gte('transaction_date', monthStart).lte('transaction_date', monthEnd);

  const monthlyIncome = (monthlyTransactionsData || []).filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount_myr || 0), 0);
  const monthlyExpense = (monthlyTransactionsData || []).filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount_myr || 0), 0);

  const transactionStats: TransactionStats = {
    totalIncome: monthlyIncome,
    totalExpense: monthlyExpense,
    recentTransactions: (transactionsRes.data || []).slice(0, 5),
  };

  // 月度图表数据
  const monthlyData = await fetchMonthlyChartData(tenantId);

  // 额外模块统计
  const [approvalRes, overdueInvRes, assetsRes] = await Promise.all([
    supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'sent').lt('due_date', format(new Date(), 'yyyy-MM-dd')),
    supabase.from('fixed_assets').select('purchase_amount_myr, salvage_value, useful_life_months, purchase_date, depreciation_method, status').eq('tenant_id', tenantId).eq('status', 'active'),
  ]);

  const fixedAssetsNetValue = calculateFixedAssetsNetValue(assetsRes.data || []);

  return {
    financialSummary, rates, hasExchangeRates,
    alerts: alertsRes.data || [],
    balanceStats, projectStats, projectProfitData, projectListData,
    transactionStats, monthlyData,
    pendingApprovals: approvalRes.count || 0,
    overdueInvoices: overdueInvRes.count || 0,
    fixedAssetsNetValue,
  };
}

/**
 * 获取类目分析数据
 */
export async function fetchCategoryAnalysis(
  tenantId: string,
  dateRange?: { from?: Date; to?: Date },
  otherLabel: string = '其他'
): Promise<CategoryAnalysisData> {
  requireTenantId(tenantId);

  const [txCatRes, projCatRes] = await Promise.all([
    supabase.from('transaction_categories').select('name, type').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('project_categories').select('name, type').eq('tenant_id', tenantId).eq('is_active', true),
  ]);

  const companyIncomeNames = new Set((txCatRes.data || []).filter(c => c.type === 'income').map(c => c.name));
  const companyExpenseNames = new Set((txCatRes.data || []).filter(c => c.type === 'expense').map(c => c.name));
  const projectIncomeNames = new Set((projCatRes.data || []).filter(c => c.type === 'income').map(c => c.name));
  const projectExpenseNames = new Set((projCatRes.data || []).filter(c => c.type === 'expense').map(c => c.name));

  // 分页获取所有交易
  let allData: { category_name: string; amount_myr: number; ledger_type: string; type: string }[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    let query = supabase.from('transactions').select('category_name, amount_myr, ledger_type, type').eq('tenant_id', tenantId);
    if (dateRange?.from) query = query.gte('transaction_date', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) query = query.lte('transaction_date', format(dateRange.to, 'yyyy-MM-dd'));
    const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const maps = {
    companyIncome: {} as Record<string, number>, companyExpense: {} as Record<string, number>,
    projectIncome: {} as Record<string, number>, projectExpense: {} as Record<string, number>,
    exchangeIncome: {} as Record<string, number>, exchangeExpense: {} as Record<string, number>,
  };

  allData.forEach(tx => {
    const rawCategory = tx.category_name || otherLabel;
    const amount = Math.abs(Number(tx.amount_myr || 0));
    if (tx.ledger_type === 'project') {
      const validNames = tx.type === 'income' ? projectIncomeNames : projectExpenseNames;
      const category = validNames.has(rawCategory) ? rawCategory : otherLabel;
      const map = tx.type === 'income' ? maps.projectIncome : maps.projectExpense;
      map[category] = (map[category] || 0) + amount;
    } else if (tx.ledger_type === 'exchange') {
      const map = tx.type === 'income' ? maps.exchangeIncome : maps.exchangeExpense;
      map[rawCategory] = (map[rawCategory] || 0) + amount;
    } else {
      const validNames = tx.type === 'income' ? companyIncomeNames : companyExpenseNames;
      const category = validNames.has(rawCategory) ? rawCategory : otherLabel;
      const map = tx.type === 'income' ? maps.companyIncome : maps.companyExpense;
      map[category] = (map[category] || 0) + amount;
    }
  });

  const COLORS = [
    'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))',
    'hsl(var(--accent))', 'hsl(215, 60%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(30, 70%, 50%)',
    'hsl(160, 60%, 45%)', 'hsl(340, 60%, 50%)',
  ];

  const buildCategoryData = (map: Record<string, number>): ExpenseCategoryData[] =>
    Object.entries(map).filter(([_, v]) => v > 0)
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.value - a.value);

  return {
    companyIncomeCategoryData: buildCategoryData(maps.companyIncome),
    companyExpenseCategoryData: buildCategoryData(maps.companyExpense),
    projectIncomeCategoryData: buildCategoryData(maps.projectIncome),
    projectExpenseCategoryData: buildCategoryData(maps.projectExpense),
    exchangeIncomeCategoryData: buildCategoryData(maps.exchangeIncome),
    exchangeExpenseCategoryData: buildCategoryData(maps.exchangeExpense),
  };
}

// ============ Internal Helpers ============

function buildAccountAdjustments(accounts: any[]) {
  const adj = {
    MYR: { cash: 0, bank: 0, total: 0 },
    CNY: { cash: 0, bank: 0, total: 0 },
    USD: { cash: 0, bank: 0, total: 0 },
  };
  accounts.forEach(account => {
    if (account.include_in_stats === false) return;
    const currency = account.currency as keyof typeof adj;
    const accountType = account.account_type as 'cash' | 'bank';
    if (adj[currency]) {
      adj[currency][accountType] += Number(account.balance || 0);
      adj[currency].total += Number(account.balance || 0);
    }
  });
  return adj;
}

function buildFinancialSummary(
  allTx: any[],
  adj: ReturnType<typeof buildAccountAdjustments>
): FinancialSummary {
  const balanceByCurrencyAccount: Record<string, number> = {};
  let totalIncomeMYR = 0, totalExpenseMYR = 0, equityIncomeMYR = 0;

  allTx.forEach((tx: any) => {
    const cur = tx.currency || 'MYR';
    const acct = tx.account_type || 'cash';
    const key = `${cur}_${acct}`;
    if (!balanceByCurrencyAccount[key]) balanceByCurrencyAccount[key] = 0;
    if (tx.type === 'income') {
      balanceByCurrencyAccount[key] += Number(tx.amount || 0);
      totalIncomeMYR += Number(tx.amount_myr || 0);
      if (tx.category_name?.includes('股金')) equityIncomeMYR += Number(tx.amount_myr || 0);
    } else {
      balanceByCurrencyAccount[key] -= Number(tx.amount || 0);
      totalExpenseMYR += Number(tx.amount_myr || 0);
    }
  });

  const get = (c: string, a: string) => balanceByCurrencyAccount[`${c}_${a}`] || 0;
  return {
    total_myr: get('MYR', 'cash') + get('MYR', 'bank') + adj.MYR.total,
    total_cny: get('CNY', 'cash') + get('CNY', 'bank') + adj.CNY.total,
    total_usd: get('USD', 'cash') + get('USD', 'bank') + adj.USD.total,
    myr_cash: get('MYR', 'cash') + adj.MYR.cash,
    myr_bank: get('MYR', 'bank') + adj.MYR.bank,
    cny_cash: get('CNY', 'cash') + adj.CNY.cash,
    cny_bank: get('CNY', 'bank') + adj.CNY.bank,
    usd_cash: get('USD', 'cash') + adj.USD.cash,
    usd_bank: get('USD', 'bank') + adj.USD.bank,
    total_income_myr: totalIncomeMYR,
    total_expense_myr: totalExpenseMYR,
    equity_income_myr: equityIncomeMYR,
  };
}

function buildLatestRates(rates: any[]): Record<string, number> {
  const latestRates: Record<string, number> = {};
  rates.forEach(r => {
    const key = `${r.from_currency}_${r.to_currency}`;
    if (!latestRates[key]) latestRates[key] = r.rate;
  });
  return latestRates;
}

function buildBalanceStats(
  fs: FinancialSummary | null,
  adj: ReturnType<typeof buildAccountAdjustments>,
  latestRates: Record<string, number>,
  payablesData: any[]
): BalanceStats {
  if (!fs) return DEFAULT_BALANCE_STATS;

  const totalAdjustmentMYR = adj.MYR.total;
  const fixedBalanceMYR = fs.total_income_myr - fs.total_expense_myr + totalAdjustmentMYR;
  const cnyToMYR = latestRates['CNY_MYR'] || 0.65;
  const usdToMYR = latestRates['USD_MYR'] || 4.4;
  const realtimeBalanceMYR = fs.total_myr + (fs.total_cny * cnyToMYR) + (fs.total_usd * usdToMYR);
  const profitLossMYR = realtimeBalanceMYR - fs.equity_income_myr;
  const exchangeProfitLossMYR = realtimeBalanceMYR - fixedBalanceMYR;

  const unpaidTotalMYR = payablesData.reduce((s: number, p: any) => s + Number(p.unpaid_amount_myr || 0), 0);
  const unpaidMYR = payablesData.filter((p: any) => p.currency === 'MYR').reduce((s: number, p: any) => s + Number(p.unpaid_amount || 0), 0);
  const unpaidCNY = payablesData.filter((p: any) => p.currency === 'CNY').reduce((s: number, p: any) => s + Number(p.unpaid_amount || 0), 0);
  const unpaidUSD = payablesData.filter((p: any) => p.currency === 'USD').reduce((s: number, p: any) => s + Number(p.unpaid_amount || 0), 0);

  return { realtimeBalanceMYR, fixedBalanceMYR, equityIncomeMYR: fs.equity_income_myr, profitLossMYR, exchangeProfitLossMYR, unpaidTotalMYR, unpaidMYR, unpaidCNY, unpaidUSD };
}

function buildProjectData(projects: any[], additions: any[], projectTransactions: any[]) {
  const projectIncomeMap: Record<string, number> = {};
  projectTransactions.forEach(tx => {
    if (!tx.project_id) return;
    if (!projectIncomeMap[tx.project_id]) projectIncomeMap[tx.project_id] = 0;
    if (tx.type === 'income') projectIncomeMap[tx.project_id] += tx.amount_myr || 0;
  });

  const totalAdditionMYR = additions.reduce((sum, a) => sum + Number(a.amount_myr || 0), 0);
  const totalContractMYR = projects.reduce((sum, p) => sum + Number(p.contract_amount_myr || 0), 0);
  const totalReceivedMYR = Object.values(projectIncomeMap).reduce((sum, v) => sum + v, 0);
  const totalExpenseMYR = projects.reduce((sum, p) => sum + Number(p.total_expense_myr || 0), 0);
  const totalPendingMYR = projects.reduce((sum, p) => {
    const contractAmount = Number(p.contract_amount_myr || 0);
    const additionAmount = Number(p.total_addition_myr || 0);
    const total = contractAmount + additionAmount;
    const received = projectIncomeMap[p.id] || 0;
    return sum + ((contractAmount === 0 && additionAmount === 0) ? 0 : Math.max(0, total - received));
  }, 0);
  const totalProfitMYR = totalReceivedMYR - totalExpenseMYR;

  const projectStats: ProjectStats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    paused: projects.filter(p => p.status === 'paused').length,
    totalContractMYR, totalReceivedMYR, totalAdditionMYR, totalPendingMYR, totalExpenseMYR, totalProfitMYR,
  };

  const projectProfitData: ProjectProfitData[] = projects
    .map(p => ({
      projectId: p.id,
      projectCode: p.project_code,
      projectName: p.project_name,
      contractAmount: Number(p.contract_amount_myr || 0),
      totalIncome: Number(p.total_income_myr || 0),
      totalExpense: Number(p.total_expense_myr || 0),
      netProfit: Number(p.net_profit_myr || 0),
      profitRate: p.contract_amount_myr > 0 ? (Number(p.net_profit_myr || 0) / Number(p.contract_amount_myr)) * 100 : 0,
    }))
    .sort((a, b) => b.netProfit - a.netProfit);

  const projectListData: ProjectListItem[] = projects.map(p => {
    const contractAmt = Number(p.contract_amount_myr || 0);
    const received = projectIncomeMap[p.id] || 0;
    const progress = contractAmt > 0 ? Math.min(100, Math.round((received / contractAmt) * 100)) : 0;
    return { id: p.id, code: p.project_code, name: p.project_name, status: p.status, contractAmount: contractAmt, progress };
  });

  return { projectStats, projectProfitData, projectListData };
}

async function fetchMonthlyChartData(tenantId: string): Promise<MonthlyChartData[]> {
  const sixMonthsAgo = subDays(new Date(), 180);
  const monthlyRes = await supabase
    .from('transactions').select('transaction_date, type, amount_myr')
    .eq('tenant_id', tenantId).gte('transaction_date', format(sixMonthsAgo, 'yyyy-MM-dd'));

  if (!monthlyRes.data) return [];

  const monthlyMap: Record<string, { income: number; expense: number }> = {};
  monthlyRes.data.forEach(t => {
    const month = t.transaction_date.substring(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
    if (t.type === 'income') monthlyMap[month].income += Number(t.amount_myr || 0);
    else monthlyMap[month].expense += Number(t.amount_myr || 0);
  });

  return Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({ month: month.substring(5) + '月', income: data.income, expense: data.expense }));
}

function calculateFixedAssetsNetValue(assets: any[]): number {
  return assets.reduce((sum, a) => {
    const months = differenceInMonths(new Date(), new Date(a.purchase_date));
    const life = a.useful_life_months || 60;
    const salvage = a.salvage_value || 0;
    const depreciable = a.purchase_amount_myr - salvage;
    const accumulated = Math.min((depreciable / life) * months, depreciable);
    return sum + (a.purchase_amount_myr - accumulated);
  }, 0);
}
