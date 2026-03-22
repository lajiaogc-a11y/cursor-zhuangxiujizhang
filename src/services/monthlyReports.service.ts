/**
 * Monthly Reports Service
 * 月度报表数据聚合服务
 */

import { supabase, requireTenantId } from './base';
import { format, startOfYear, endOfYear } from 'date-fns';

export interface CategoryData {
  name: string;
  value: number;
}

export interface PeriodSummary {
  income: number;
  expense: number;
  profit: number;
  transactionCount: number;
}

export interface PeriodReportData {
  transactions: any[];
  currentMonthData: PeriodSummary;
  incomeByCategory: CategoryData[];
  expenseByCategory: CategoryData[];
  companyIncomeByCategory: CategoryData[];
  companyExpenseByCategory: CategoryData[];
  projectIncomeByCategory: CategoryData[];
  projectExpenseByCategory: CategoryData[];
  exchangeIncomeByCategory: CategoryData[];
  exchangeExpenseByCategory: CategoryData[];
}

export interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
  profit: number;
  transactionCount: number;
}

export async function fetchPeriodReport(
  tenantId: string,
  startDate: string,
  endDate: string,
  otherLabel: string
): Promise<PeriodReportData> {
  requireTenantId(tenantId);

  const [sysCatRes, projCatRes] = await Promise.all([
    supabase.from('transaction_categories').select('name, type').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('project_categories').select('name, type').eq('tenant_id', tenantId).eq('is_active', true),
  ]);

  // 分页取全量 transactions，避免默认 1000 行截断
  const PAGE_SIZE = 1000;
  let transactions: any[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase.from('transactions').select('*')
      .eq('tenant_id', tenantId)
      .gte('transaction_date', startDate).lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    transactions = transactions.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  const companyCategoryNames = new Set((sysCatRes.data || []).map(c => c.name));
  const projectCategoryNames = new Set((projCatRes.data || []).map(c => c.name));

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount_myr || 0), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount_myr || 0), 0);

  const maps = {
    company_daily: { income: {} as Record<string, number>, expense: {} as Record<string, number> },
    project: { income: {} as Record<string, number>, expense: {} as Record<string, number> },
    exchange: { income: {} as Record<string, number>, expense: {} as Record<string, number> },
  };
  const incomeMap: Record<string, number> = {};
  const expenseMap: Record<string, number> = {};

  transactions.forEach(tx => {
    const ledger = tx.ledger_type as keyof typeof maps;
    const group = maps[ledger] || maps.company_daily;
    let catName = tx.category_name;
    if (ledger === 'project') {
      if (!projectCategoryNames.has(catName)) catName = otherLabel;
    } else {
      if (!companyCategoryNames.has(catName)) catName = otherLabel;
    }
    const typeMap = tx.type === 'income' ? group.income : group.expense;
    typeMap[catName] = (typeMap[catName] || 0) + Number(tx.amount_myr || 0);
    if (tx.type === 'income') {
      incomeMap[catName] = (incomeMap[catName] || 0) + Number(tx.amount_myr || 0);
    } else {
      expenseMap[catName] = (expenseMap[catName] || 0) + Number(tx.amount_myr || 0);
    }
  });

  const toSorted = (m: Record<string, number>): CategoryData[] =>
    Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return {
    transactions,
    currentMonthData: { income, expense, profit: income - expense, transactionCount: transactions.length },
    incomeByCategory: toSorted(incomeMap),
    expenseByCategory: toSorted(expenseMap),
    companyIncomeByCategory: toSorted(maps.company_daily.income),
    companyExpenseByCategory: toSorted(maps.company_daily.expense),
    projectIncomeByCategory: toSorted(maps.project.income),
    projectExpenseByCategory: toSorted(maps.project.expense),
    exchangeIncomeByCategory: toSorted(maps.exchange.income),
    exchangeExpenseByCategory: toSorted(maps.exchange.expense),
  };
}

export async function fetchYearlyTrend(
  tenantId: string,
  year: number,
  language: string,
  monthSuffix: string
): Promise<MonthlyTrendItem[]> {
  requireTenantId(tenantId);

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  const { data: yearData } = await supabase
    .from('transactions')
    .select('transaction_date, type, amount_myr')
    .eq('tenant_id', tenantId)
    .gte('transaction_date', format(yearStart, 'yyyy-MM-dd'))
    .lte('transaction_date', format(yearEnd, 'yyyy-MM-dd'));

  if (!yearData) return [];

  const monthlyMap: Record<string, { income: number; expense: number; count: number }> = {};
  for (let i = 1; i <= 12; i++) {
    const monthKey = `${year}-${i.toString().padStart(2, '0')}`;
    monthlyMap[monthKey] = { income: 0, expense: 0, count: 0 };
  }

  yearData.forEach(t => {
    const monthKey = t.transaction_date.substring(0, 7);
    if (monthlyMap[monthKey]) {
      if (t.type === 'income') monthlyMap[monthKey].income += Number(t.amount_myr) || 0;
      else monthlyMap[monthKey].expense += Number(t.amount_myr) || 0;
      monthlyMap[monthKey].count++;
    }
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month: language === 'zh' ? month.substring(5) + monthSuffix : monthNames[parseInt(month.substring(5)) - 1],
      income: data.income,
      expense: data.expense,
      profit: data.income - data.expense,
      transactionCount: data.count,
    }));
}
