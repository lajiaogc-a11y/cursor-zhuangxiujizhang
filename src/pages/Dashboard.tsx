import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { 
  TrendingUp, AlertTriangle,
  Scale, RefreshCw, RotateCcw,
  FolderOpen, ClipboardList, CreditCard, PieChart as PieChartIcon, Settings,
  BarChart3, Receipt, SlidersHorizontal, Eye, EyeOff,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import { CartesianGrid } from '@/components/ui/cartesian-grid-fix';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { DataConsistencyAlert } from '@/components/dashboard/DataConsistencyAlert';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { getDashboardTourSteps, DASHBOARD_TOUR_KEY } from '@/components/onboarding/tourSteps';
import { DashStatCard } from '@/components/dashboard/DashStatCard';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import { ProjectProfitChart } from '@/components/dashboard/ProjectProfitChart';
import { FinancialOverviewCard } from '@/components/dashboard/FinancialOverviewCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { queryKeys } from '@/lib/queryKeys';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';
import { useTenant } from '@/lib/tenant';
import { useDashboardData, useCategoryAnalysis } from '@/hooks/useDashboardService';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { AppSectionLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

export default function Dashboard() {
  const { t, language } = useI18n();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { baseCurrency: systemCurrency, convertToBase, active: baseCurrencyActive } = useBaseCurrency('finance');
  const { sections, toggleSection, resetLayout, isVisible } = useDashboardLayout();
  const [hiddenCompanyIncomeCategories, setHiddenCompanyIncomeCategories] = useState<Set<string>>(new Set());
  const [hiddenCompanyExpenseCategories, setHiddenCompanyExpenseCategories] = useState<Set<string>>(new Set());
  const [hiddenProjectIncomeCategories, setHiddenProjectIncomeCategories] = useState<Set<string>>(new Set());
  const [hiddenProjectExpenseCategories, setHiddenProjectExpenseCategories] = useState<Set<string>>(new Set());
  const [hiddenExchangeIncomeCategories, setHiddenExchangeIncomeCategories] = useState<Set<string>>(new Set());
  const [hiddenExchangeExpenseCategories, setHiddenExchangeExpenseCategories] = useState<Set<string>>(new Set());
  const [showAllProfit, setShowAllProfit] = useState(false);
  const [categoryDateRange, setCategoryDateRange] = useState<DateRange | undefined>(undefined);

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  // Service hooks replace 560+ lines of inline query logic
  const { data: dashData, isLoading: loading } = useDashboardData(tenantId);
  const { data: categoryData, isLoading: categoryLoading } = useCategoryAnalysis(
    tenantId,
    categoryDateRange ? { from: categoryDateRange.from, to: categoryDateRange.to } : undefined,
    t('common.other')
  );

  // Destructure with defaults
  const alerts = dashData?.alerts || [];
  const projectStats = dashData?.projectStats || { total: 0, inProgress: 0, completed: 0, paused: 0, totalContractMYR: 0, totalReceivedMYR: 0, totalAdditionMYR: 0, totalPendingMYR: 0, totalExpenseMYR: 0, totalProfitMYR: 0 };
  const transactionStats = dashData?.transactionStats || { totalIncome: 0, totalExpense: 0, recentTransactions: [] };
  const monthlyData = dashData?.monthlyData || [];
  const projectProfitData = dashData?.projectProfitData || [];
  const projectListData = dashData?.projectListData || [];
  const balanceStats = dashData?.balanceStats || { realtimeBalanceMYR: 0, fixedBalanceMYR: 0, equityIncomeMYR: 0, profitLossMYR: 0, exchangeProfitLossMYR: 0, unpaidTotalMYR: 0, unpaidMYR: 0, unpaidCNY: 0, unpaidUSD: 0 };
  const financialSummary = dashData?.financialSummary || null;
  const hasExchangeRates = dashData?.hasExchangeRates ?? true;
  const pendingApprovals = dashData?.pendingApprovals || 0;
  const overdueInvoices = dashData?.overdueInvoices || 0;
  const fixedAssetsNetValue = dashData?.fixedAssetsNetValue || 0;

  const companyIncomeCategoryData = categoryData?.companyIncomeCategoryData || [];
  const companyExpenseCategoryData = categoryData?.companyExpenseCategoryData || [];
  const projectIncomeCategoryData = categoryData?.projectIncomeCategoryData || [];
  const projectExpenseCategoryData = categoryData?.projectExpenseCategoryData || [];
  const exchangeIncomeCategoryData = categoryData?.exchangeIncomeCategoryData || [];
  const exchangeExpenseCategoryData = categoryData?.exchangeExpenseCategoryData || [];

  const formatCurrency = (amount: number, currency: string = 'MYR') => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    return `${symbols[currency] || ''}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCompact = (amount: number, currency: string = 'MYR') => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    const sym = symbols[currency] || '';
    if (Math.abs(amount) >= 10000) return `${sym}${(amount / 10000).toFixed(1)}万`;
    return `${sym}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const handleRefresh = () => {
    if (!tenantId) return;
    queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard, tenantId] });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboardCategories, tenantId] });
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { 'in_progress': t('projects.inProgress'), 'completed': t('projects.completed'), 'paused': t('projects.paused'), 'pending': t('common.pending') };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = { 'in_progress': 'bg-primary/10 text-primary', 'completed': 'bg-emerald-500/10 text-emerald-600', 'paused': 'bg-amber-500/10 text-amber-600', 'pending': 'bg-muted text-muted-foreground' };
    return map[status] || 'bg-muted text-muted-foreground';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-amber-500';
    if (progress >= 20) return 'bg-primary';
    return 'bg-muted-foreground/40';
  };

  if (loading) {
    return (
      <MainLayout>
        <AppSectionLoading label={t('common.loading')} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-4">
        <div className="flex justify-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {t('dashboard.customizeLayout')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <div className="space-y-1">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                  >
                    {section.visible ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className={section.visible ? '' : 'text-muted-foreground'}>{t(section.labelKey)}</span>
                  </button>
                ))}
                <div className="border-t border-border pt-1 mt-1">
                  <button onClick={resetLayout} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors">
                    <RotateCcw className="w-3 h-3" />
                    {t('dashboard.resetLayout')}
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            {loading ? <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {t('dashboard.refreshData')}
          </Button>
        </div>

        <DataConsistencyAlert />

        {!hasExchangeRates && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium text-warning">{t('dashboard.noRates')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.setRates')}</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="border-warning text-warning hover:bg-warning/10">
                  <Link to="/global-settings">{t('exchangeRates.title')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ====== 核心指标卡片 ====== */}
        {isVisible('stat-cards') && <div data-tour="stat-cards" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
          <DashStatCard label={t('projects.inProgress')} value={String(projectStats.inProgress)} icon={FolderOpen} iconBg="icon-gradient-orange" onClick={() => navigate('/projects')} />
          <DashStatCard label={t('dashboard.totalProjects')} value={String(projectStats.total)} icon={ClipboardList} iconBg="icon-gradient-blue" onClick={() => navigate('/projects')} />
          <DashStatCard label={t('dashboard.pendingApprovals')} value={String(pendingApprovals)} icon={AlertTriangle} iconBg="icon-gradient-amber" trendLabel={pendingApprovals > 0 ? t('dashboard.needsAttention') : ''} onClick={() => navigate('/approvals')} />
          <DashStatCard label={t('dashboard.unpaidTotal')} value={formatCompact(balanceStats.unpaidTotalMYR)} icon={CreditCard} iconBg="icon-gradient-rose" onClick={() => navigate('/payables')} />
          <DashStatCard label={t('dashboard.monthlyIncome')} value={formatCompact(transactionStats.totalIncome)} icon={TrendingUp} iconBg="icon-gradient-green" trend={transactionStats.totalIncome > 0 ? { value: formatCurrency(transactionStats.totalIncome), positive: true } : undefined} onClick={() => navigate('/transactions')} />
          <DashStatCard label={t('dashboard.realtimeBalance')} value={formatCompact(balanceStats.realtimeBalanceMYR)} icon={Scale} iconBg="icon-gradient-purple" onClick={() => navigate('/balance-ledger')} />
        </div>}

        {/* ====== 月度收支趋势 + 最近交易 ====== */}
        {isVisible('monthly-trend') && <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          <Card data-tour="chart" className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t('dashboard.monthlyTrend')}</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 320}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(35, 92%, 60%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(35, 92%, 60%)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? t('dashboard.income') : t('dashboard.expense')]}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="income" name={t('dashboard.income')} stroke="hsl(35, 92%, 60%)" fill="url(#gradIncome)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(35, 92%, 60%)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="expense" name={t('dashboard.expense')} stroke="hsl(var(--muted-foreground))" fill="url(#gradExpense)" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2.5, fill: 'hsl(var(--muted-foreground))', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[320px] flex items-center justify-center">
                  <EmptyState icon={BarChart3} title={t('common.noData')} description={t('dashboard.noChartDataHint') || ''} compact />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t('dashboard.recentTransactions')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {transactionStats.recentTransactions.length > 0 ? (
                <div className="space-y-1">
                  {transactionStats.recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{tx.summary || tx.category_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tx.category_name} · {tx.account_type === 'bank' ? t('account.bank') : t('account.cash')}</p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-500' : 'text-foreground'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount_myr || 0))}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{tx.transaction_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Receipt} title={t('common.noData')} compact className="h-[280px]" />
              )}
            </CardContent>
          </Card>
        </div>}

        {/* ====== 资金总览 ====== */}
        {isVisible('balance-cards') && <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 sm:overflow-visible">
          {/* MYR */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[200px] sm:min-w-0 shrink-0 sm:shrink" onClick={() => navigate('/balance-ledger')}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('dashboard.myrBalance')}</p>
              <p className="text-lg font-bold">{formatCurrency(financialSummary?.total_myr || 0, 'MYR')}</p>
              <div className="grid grid-cols-2 gap-1 pt-2 border-t border-border mt-2 text-center">
                <div><p className="text-[10px] text-muted-foreground">{t('account.cash')}</p><p className="text-xs font-semibold">{formatCurrency(financialSummary?.myr_cash || 0, 'MYR')}</p></div>
                <div><p className="text-[10px] text-muted-foreground">{t('account.bank')}</p><p className="text-xs font-semibold">{formatCurrency(financialSummary?.myr_bank || 0, 'MYR')}</p></div>
              </div>
            </CardContent>
          </Card>
          {/* CNY */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[200px] sm:min-w-0 shrink-0 sm:shrink" onClick={() => navigate('/balance-ledger')}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('dashboard.cnyBalance')}</p>
              <p className={`text-lg font-bold ${(financialSummary?.total_cny || 0) < 0 ? 'text-destructive' : ''}`}>{formatCurrency(financialSummary?.total_cny || 0, 'CNY')}</p>
              <div className="grid grid-cols-2 gap-1 pt-2 border-t border-border mt-2 text-center">
                <div><p className="text-[10px] text-muted-foreground">{t('account.cash')}</p><p className="text-xs font-semibold">{formatCurrency(financialSummary?.cny_cash || 0, 'CNY')}</p></div>
                <div><p className="text-[10px] text-muted-foreground">{t('account.bank')}</p><p className="text-xs font-semibold">{formatCurrency(financialSummary?.cny_bank || 0, 'CNY')}</p></div>
              </div>
            </CardContent>
          </Card>
          {/* USD */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[200px] sm:min-w-0 shrink-0 sm:shrink" onClick={() => navigate('/balance-ledger')}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('dashboard.usdBalance')}</p>
              <p className="text-lg font-bold">{formatCurrency(financialSummary?.total_usd || 0, 'USD')}</p>
              <div className="grid grid-cols-2 gap-1 pt-2 border-t border-border mt-2 text-center">
                <div><p className="text-[10px] text-muted-foreground">{t('account.cash')}</p><p className="text-xs font-semibold">{formatCurrency(financialSummary?.usd_cash || 0, 'USD')}</p></div>
                <div><p className="text-[10px] text-muted-foreground">{t('account.bank')}</p><p className="text-xs font-semibold">{formatCurrency(financialSummary?.usd_bank || 0, 'USD')}</p></div>
              </div>
            </CardContent>
          </Card>
          {/* Fixed Balance */}
          <Card className="min-w-[160px] sm:min-w-0 shrink-0 sm:shrink"><CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('dashboard.fixedBalance')}</p>
            <p className={`text-lg font-bold ${balanceStats.fixedBalanceMYR >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatCurrency(balanceStats.fixedBalanceMYR)}</p>
          </CardContent></Card>
          {/* Exchange P/L */}
          <Card className="min-w-[160px] sm:min-w-0 shrink-0 sm:shrink"><CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('dashboard.exchangeProfit')}</p>
            <p className={`text-lg font-bold ${balanceStats.exchangeProfitLossMYR >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {balanceStats.exchangeProfitLossMYR >= 0 ? '+' : ''}{formatCurrency(balanceStats.exchangeProfitLossMYR)}
            </p>
          </CardContent></Card>
          {/* P/L */}
          <Card className="min-w-[160px] sm:min-w-0 shrink-0 sm:shrink"><CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('dashboard.profitLoss')}</p>
            <p className={`text-lg font-bold ${balanceStats.profitLossMYR >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatCurrency(balanceStats.profitLossMYR)}</p>
          </CardContent></Card>
        </div>}

        {/* ====== 项目概览表 ====== */}
        {isVisible('project-table') && projectListData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{t('dashboard.projectOverview')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>{t('common.viewMore')} →</Button>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground px-6 py-2.5">{t('projects.projectName')}</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">{t('projects.status')}</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">{t('dashboard.progress')}</th>
                      <th className="text-right font-medium text-muted-foreground px-6 py-2.5">{t('projects.contractAmount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectListData.slice(0, 8).map((proj) => (
                      <tr key={proj.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/projects/${proj.id}/financials`)}>
                        <td className="px-6 py-3"><div><p className="font-medium truncate max-w-[300px]">{proj.name}</p><p className="text-xs text-muted-foreground">{proj.code}</p></div></td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proj.status)}`}>{getStatusLabel(proj.status)}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${getProgressColor(proj.progress)} transition-all`} style={{ width: `${proj.progress}%` }} /></div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{proj.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-medium tabular-nums">{formatCurrency(proj.contractAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden space-y-2 px-4">
                {projectListData.slice(0, 6).map((proj) => (
                  <div key={proj.id} className="p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/projects/${proj.id}/financials`)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-medium text-sm truncate flex-1">{proj.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ml-2 ${getStatusColor(proj.status)}`}>{getStatusLabel(proj.status)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[100px]"><div className={`h-full rounded-full ${getProgressColor(proj.progress)}`} style={{ width: `${proj.progress}%` }} /></div>
                        <span className="text-[10px] text-muted-foreground">{proj.progress}%</span>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(proj.contractAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ====== 财务总览 ====== */}
        {isVisible('financial-overview') && <FinancialOverviewCard
          totalIncome={transactionStats.totalIncome}
          totalExpense={transactionStats.totalExpense}
          netProfit={transactionStats.totalIncome - transactionStats.totalExpense}
          formatCurrency={formatCurrency}
          incomeLabel={t('dashboard.income')}
          expenseLabel={t('dashboard.expense')}
          profitLabel={t('dashboard.profitLoss')}
        />}

        {/* ====== 项目利润排行 + 类目分析 ====== */}
        {isVisible('profit-category') && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />{t('dashboard.profitRanking')}
                </CardTitle>
                {projectProfitData.length > 8 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAllProfit(!showAllProfit)} className="text-xs">
                    {showAllProfit ? t('common.collapse') : `${t('common.viewMore')} (${projectProfitData.length})`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {projectProfitData.length > 0 ? (
                <ProjectProfitChart
                  data={projectProfitData}
                  formatCurrency={formatCurrency}
                  onProjectClick={(id) => navigate(`/projects/${id}/financials`)}
                  maxItems={showAllProfit ? 20 : 8}
                />
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">{t('common.noData')}</div>
              )}
            </CardContent>
          </Card>

          {/* 类目分析 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-primary" />{t('chart.categoryAnalysis')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <DateRangePicker dateRange={categoryDateRange} onDateRangeChange={setCategoryDateRange} className="h-8 text-xs w-auto" placeholder={t('chart.allTime')} />
                <Button variant="ghost" size="sm" onClick={() => {
                  setHiddenCompanyIncomeCategories(new Set()); setHiddenCompanyExpenseCategories(new Set());
                  setHiddenProjectIncomeCategories(new Set()); setHiddenProjectExpenseCategories(new Set());
                  setHiddenExchangeIncomeCategories(new Set()); setHiddenExchangeExpenseCategories(new Set());
                }} className="h-8 px-2 text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" />{t('chart.resetFilter')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {categoryLoading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
                  <ChromeLoadingSpinner variant="muted" className="h-5 w-5" />
                </div>
              )}
              <Tabs defaultValue="company_daily" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="company_daily">{t('dashboard.companyDaily')}</TabsTrigger>
                  <TabsTrigger value="exchange">{t('dashboard.exchange')}</TabsTrigger>
                  <TabsTrigger value="project">{t('dashboard.projectRelated')}</TabsTrigger>
                </TabsList>
                <TabsContent value="company_daily">
                  {(companyIncomeCategoryData.length > 0 || companyExpenseCategoryData.length > 0) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <CategoryPieChart data={companyIncomeCategoryData} hiddenCategories={hiddenCompanyIncomeCategories} setHiddenCategories={setHiddenCompanyIncomeCategories} onCategoryClick={(c) => navigate(`/transactions?category=${encodeURIComponent(c)}&ledger_type=company_daily`)} t={t} title={t('chart.incomeCategories')} />
                      <CategoryPieChart data={companyExpenseCategoryData} hiddenCategories={hiddenCompanyExpenseCategories} setHiddenCategories={setHiddenCompanyExpenseCategories} onCategoryClick={(c) => navigate(`/transactions?category=${encodeURIComponent(c)}&ledger_type=company_daily`)} t={t} title={t('chart.expenseCategories')} />
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">{t('chart.noData')}</div>
                  )}
                </TabsContent>
                <TabsContent value="exchange">
                  {(exchangeIncomeCategoryData.length > 0 || exchangeExpenseCategoryData.length > 0) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <CategoryPieChart data={exchangeIncomeCategoryData} hiddenCategories={hiddenExchangeIncomeCategories} setHiddenCategories={setHiddenExchangeIncomeCategories} onCategoryClick={(c) => navigate(`/transactions?category=${encodeURIComponent(c)}&ledger_type=exchange`)} t={t} title={t('chart.incomeCategories')} />
                      <CategoryPieChart data={exchangeExpenseCategoryData} hiddenCategories={hiddenExchangeExpenseCategories} setHiddenCategories={setHiddenExchangeExpenseCategories} onCategoryClick={(c) => navigate(`/transactions?category=${encodeURIComponent(c)}&ledger_type=exchange`)} t={t} title={t('chart.expenseCategories')} />
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">{t('chart.noData')}</div>
                  )}
                </TabsContent>
                <TabsContent value="project">
                  {(projectIncomeCategoryData.length > 0 || projectExpenseCategoryData.length > 0) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <CategoryPieChart data={projectIncomeCategoryData} hiddenCategories={hiddenProjectIncomeCategories} setHiddenCategories={setHiddenProjectIncomeCategories} onCategoryClick={(c) => navigate(`/transactions?category=${encodeURIComponent(c)}&ledger_type=project`)} t={t} title={t('chart.incomeCategories')} />
                      <CategoryPieChart data={projectExpenseCategoryData} hiddenCategories={hiddenProjectExpenseCategories} setHiddenCategories={setHiddenProjectExpenseCategories} onCategoryClick={(c) => navigate(`/transactions?category=${encodeURIComponent(c)}&ledger_type=project`)} t={t} title={t('chart.expenseCategories')} />
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">{t('chart.noData')}</div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>}

        {/* Onboarding Tour */}
        <OnboardingTour
          steps={getDashboardTourSteps(language)}
          storageKey={DASHBOARD_TOUR_KEY}
        />
      </div>
    </MainLayout>
  );
}
