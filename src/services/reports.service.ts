/**
 * Reports Service
 * 
 * 报表数据访问与聚合计算层。
 * 包含收支分类分析、月度趋势、项目利润排行、同期对比等。
 */

import { supabase, requireTenantId } from './base';
import { format, subMonths, startOfYear, endOfYear } from 'date-fns';

// ─── Types ────────────────────────────────────────────

export interface ReportData {
  incomeByCategory: { name: string; value: number }[];
  expenseByCategory: { name: string; value: number }[];
  monthlyTrend: { month: string; income: number; expense: number; profit: number }[];
  projectStats: { status: string; count: number; amount: number }[];
  exchangeStats: { profit: number; loss: number; volume: number };
}

export interface ComparisonData {
  period: string;
  current: { income: number; expense: number; profit: number };
  previous: { income: number; expense: number; profit: number };
  changePercent: { income: number; expense: number; profit: number };
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

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
}

interface ReportLabels {
  other: string;
  statusLabels: Record<string, string>;
  monthNames: string[];
  monthSuffix: string;
  language: string;
  expenseCategoryLabels: Record<string, string>;
}

// ─── Main Report Query ────────────────────────────────

export async function fetchReportData(
  tenantId: string,
  filters: ReportFilters,
  labels: ReportLabels
) {
  requireTenantId(tenantId);
  const { dateFrom, dateTo } = filters;
  const hasDateRange = dateFrom && dateTo;

  // Parallel fetch: transactions, categories, projects, exchanges
  let txQuery = supabase.from('transactions').select('*').eq('tenant_id', tenantId);
  if (hasDateRange) txQuery = txQuery.gte('transaction_date', dateFrom!).lte('transaction_date', dateTo!);

  const [txRes, sysCatRes, projCatRes, projectsRes] = await Promise.all([
    txQuery,
    supabase.from('transaction_categories').select('name, type').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('project_categories').select('name, type').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('projects').select('*').eq('tenant_id', tenantId),
  ]);

  const transactions = txRes.data || [];
  const companyCategoryNames = new Set(sysCatRes.data?.map(c => c.name) || []);
  const projectCategoryNames = new Set(projCatRes.data?.map(c => c.name) || []);

  // Category aggregation
  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  transactions.forEach(tx => {
    const amount = Number(tx.amount_myr) || 0;
    let catName = tx.category_name;
    if (tx.ledger_type === 'project') {
      if (!projectCategoryNames.has(catName)) catName = labels.other;
    } else {
      if (!companyCategoryNames.has(catName)) catName = labels.other;
    }
    if (tx.type === 'income') incomeByCategory[catName] = (incomeByCategory[catName] || 0) + amount;
    else expenseByCategory[catName] = (expenseByCategory[catName] || 0) + amount;
  });

  // Monthly trend
  const monthlyMap: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(tx => {
    const month = tx.transaction_date.substring(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
    if (tx.type === 'income') monthlyMap[month].income += Number(tx.amount_myr) || 0;
    else monthlyMap[month].expense += Number(tx.amount_myr) || 0;
  });
  const monthlyTrend = Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month: labels.language === 'zh'
        ? month.substring(5) + labels.monthSuffix
        : labels.monthNames[parseInt(month.substring(5)) - 1],
      income: data.income,
      expense: data.expense,
      profit: data.income - data.expense,
    }));

  // Project stats
  const projects = projectsRes.data || [];
  const projectStatsMap: Record<string, { count: number; amount: number }> = {};
  projects.forEach(p => {
    if (!projectStatsMap[p.status]) projectStatsMap[p.status] = { count: 0, amount: 0 };
    projectStatsMap[p.status].count++;
    projectStatsMap[p.status].amount += Number(p.contract_amount_myr) || 0;
  });
  const projectStats = Object.entries(projectStatsMap).map(([status, data]) => ({
    status: labels.statusLabels[status] || status,
    count: data.count,
    amount: data.amount,
  }));

  // Project profit analysis
  let projectProfitData: ProjectProfitData[] = [];
  if (projects.length > 0) {
    let ptQuery = supabase.from('transactions')
      .select('project_id, type, amount_myr')
      .eq('ledger_type', 'project')
      .not('project_id', 'is', null);
    if (hasDateRange) ptQuery = ptQuery.gte('transaction_date', dateFrom!).lte('transaction_date', dateTo!);
    const { data: projTx } = await ptQuery;

    const incMap: Record<string, number> = {};
    const expMap: Record<string, number> = {};
    projTx?.forEach(tx => {
      if (tx.project_id) {
        if (tx.type === 'income') incMap[tx.project_id] = (incMap[tx.project_id] || 0) + Number(tx.amount_myr || 0);
        else expMap[tx.project_id] = (expMap[tx.project_id] || 0) + Number(tx.amount_myr || 0);
      }
    });

    projectProfitData = projects
      .map(p => {
        const inc = incMap[p.id] || 0;
        const exp = expMap[p.id] || 0;
        const profit = inc - exp;
        return {
          projectId: p.id,
          projectCode: p.project_code,
          projectName: p.project_name,
          contractAmount: Number(p.contract_amount_myr || 0),
          totalIncome: inc,
          totalExpense: exp,
          netProfit: profit,
          profitRate: p.contract_amount_myr > 0 ? (profit / Number(p.contract_amount_myr)) * 100 : 0,
        };
      })
      .filter(p => p.totalIncome > 0 || p.totalExpense > 0)
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 10);
  }

  // Project expense categories
  let peQuery = supabase.from('project_expenses').select('category_v2, amount_myr').eq('tenant_id', tenantId);
  if (hasDateRange) peQuery = peQuery.gte('expense_date', dateFrom!).lte('expense_date', dateTo!);
  const { data: projExpenses } = await peQuery;
  const catMap: Record<string, number> = {};
  projExpenses?.forEach(e => {
    const cat = e.category_v2 || 'other';
    const label = labels.expenseCategoryLabels[cat] || cat;
    catMap[label] = (catMap[label] || 0) + Number(e.amount_myr || 0);
  });
  const projectExpenseData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Exchange stats
  let exQuery = supabase.from('exchange_transactions').select('profit_loss, out_amount_myr').eq('tenant_id', tenantId);
  if (hasDateRange) exQuery = exQuery.gte('transaction_date', dateFrom!).lte('transaction_date', dateTo!);
  const { data: exchanges } = await exQuery;
  let profit = 0, loss = 0, volume = 0;
  exchanges?.forEach(e => {
    const pl = Number(e.profit_loss) || 0;
    if (pl > 0) profit += pl; else loss += Math.abs(pl);
    volume += Number(e.out_amount_myr) || 0;
  });

  // Comparison data
  let comparisonData: ComparisonData | null = null;
  if (hasDateRange) {
    const prevStart = subMonths(new Date(dateFrom!), 1);
    const prevEnd = subMonths(new Date(dateTo!), 1);
    const { data: prevTx } = await supabase.from('transactions')
      .select('type, amount_myr')
      .eq('tenant_id', tenantId)
      .gte('transaction_date', format(prevStart, 'yyyy-MM-dd'))
      .lte('transaction_date', format(prevEnd, 'yyyy-MM-dd'));

    const currentIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount_myr || 0), 0);
    const currentExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount_myr || 0), 0);
    const prevIncome = (prevTx || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount_myr || 0), 0);
    const prevExpense = (prevTx || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount_myr || 0), 0);

    comparisonData = {
      period: '',
      current: { income: currentIncome, expense: currentExpense, profit: currentIncome - currentExpense },
      previous: { income: prevIncome, expense: prevExpense, profit: prevIncome - prevExpense },
      changePercent: {
        income: prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0,
        expense: prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense) * 100 : 0,
        profit: (prevIncome - prevExpense) !== 0
          ? (((currentIncome - currentExpense) - (prevIncome - prevExpense)) / Math.abs(prevIncome - prevExpense)) * 100 : 0,
      },
    };
  }

  const reportData: ReportData = {
    incomeByCategory: Object.entries(incomeByCategory).map(([name, value]) => ({ name, value })),
    expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })),
    monthlyTrend,
    projectStats,
    exchangeStats: { profit, loss, volume },
  };

  return { reportData, transactions, projectProfitData, projectExpenseData, comparisonData };
}

// ─── Yearly Data ──────────────────────────────────────

export async function fetchYearlyData(
  tenantId: string,
  year: number,
  labels: { language: string; monthNames: string[]; monthSuffix: string; incomeLabel: string; expenseLabel: string; profitLabel: string }
) {
  requireTenantId(tenantId);
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  const { data: yearTx } = await supabase.from('transactions')
    .select('transaction_date, type, amount_myr')
    .eq('tenant_id', tenantId)
    .gte('transaction_date', format(yearStart, 'yyyy-MM-dd'))
    .lte('transaction_date', format(yearEnd, 'yyyy-MM-dd'));

  if (!yearTx) return [];

  const map: Record<string, { income: number; expense: number }> = {};
  for (let i = 1; i <= 12; i++) {
    map[`${year}-${i.toString().padStart(2, '0')}`] = { income: 0, expense: 0 };
  }
  yearTx.forEach(tx => {
    const month = tx.transaction_date.substring(0, 7);
    if (map[month]) {
      if (tx.type === 'income') map[month].income += Number(tx.amount_myr) || 0;
      else map[month].expense += Number(tx.amount_myr) || 0;
    }
  });

  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month: labels.language === 'zh'
        ? month.substring(5) + labels.monthSuffix
        : labels.monthNames[parseInt(month.substring(5)) - 1],
      [labels.incomeLabel]: data.income,
      [labels.expenseLabel]: data.expense,
      [labels.profitLabel]: data.income - data.expense,
    }));
}
