import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3, TrendingUp, PieChart as PieChartIcon,
  CalendarDays, Building2, DollarSign, ArrowUpRight, ArrowDownRight,
  FileText, FileSpreadsheet, GitCompare
} from 'lucide-react';
import { getYear } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Line, Legend, ComposedChart
} from 'recharts';
import { CartesianGrid } from '@/components/ui/cartesian-grid-fix';
import { exportTransactionsToPDF, exportTransactionsToExcel, type CompanyTransactionData } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { AIReportSummary } from '@/components/ai/AIReportSummary';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useTenant } from '@/lib/tenant';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useReportData, useYearlyData } from '@/hooks/useReportsService';
import { format } from 'date-fns';

export default function Reports() {
  const { t, language } = useI18n();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const canExport = hasPermission('feature.export');
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()).toString());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const years = Array.from({ length: 5 }, (_, i) => (getYear(new Date()) - i).toString());
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getPeriodLabel = () => {
    if (!dateRange?.from) return t('reports.selectDate');
    if (dateRange.to) return `${format(dateRange.from, 'yyyy-MM-dd')} ~ ${format(dateRange.to, 'yyyy-MM-dd')}`;
    return format(dateRange.from, 'yyyy-MM-dd');
  };

  // ─── Data hooks ─────────────────────────────────────
  const reportLabels = useMemo(() => ({
    other: t('common.other'),
    statusLabels: {
      in_progress: t('reports.inProgress'),
      completed: t('reports.completed'),
      cancelled: t('reports.cancelled'),
      paused: t('reports.paused'),
    },
    monthNames,
    monthSuffix: t('common.monthSuffix'),
    language,
    expenseCategoryLabels: {
      material: t('reports.material'),
      project_management: t('reports.projectManagement'),
      outsourcing: t('reports.outsourcing'),
      transportation: t('reports.transportation'),
      labor: t('reports.labor'),
      other: t('reports.otherExpense'),
    },
  }), [t, language]);

  const { data: queryResult, isLoading } = useReportData({
    tenantId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    labels: reportLabels,
  });

  const { data: yearlyData = [] } = useYearlyData({
    tenantId,
    year: parseInt(selectedYear),
    labels: {
      language,
      monthNames,
      monthSuffix: t('common.monthSuffix'),
      incomeLabel: t('dashboard.income'),
      expenseLabel: t('dashboard.expense'),
      profitLabel: t('dashboard.profit'),
    },
  });

  const reportData = queryResult?.reportData ?? {
    incomeByCategory: [], expenseByCategory: [], monthlyTrend: [],
    projectStats: [], exchangeStats: { profit: 0, loss: 0, volume: 0 },
  };
  const transactions = queryResult?.transactions ?? [];
  const projectProfitData = queryResult?.projectProfitData ?? [];
  const projectExpenseData = queryResult?.projectExpenseData ?? [];
  const comparisonData = queryResult?.comparisonData ?? null;

  const totalIncome = useMemo(() => reportData.incomeByCategory.reduce((s, i) => s + i.value, 0), [reportData.incomeByCategory]);
  const totalExpense = useMemo(() => reportData.expenseByCategory.reduce((s, i) => s + i.value, 0), [reportData.expenseByCategory]);

  const formatCurrency = (amount: number) => `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const COLORS = [
    'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))',
    'hsl(var(--destructive))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658',
  ];

  const buildExportData = (): CompanyTransactionData => ({
    period: getPeriodLabel(),
    transactions: transactions.map(t => ({
      sequenceNo: t.sequence_no,
      date: t.transaction_date, type: t.type, category: t.category_name,
      summary: t.summary, amount: t.amount, currency: t.currency,
      amountMYR: t.amount_myr, accountType: t.account_type,
      ledgerType: t.ledger_type || '',
      receipt: '',
      source: t.project_code || t.remark_1 || '',
      remark: t.remark_2 || '',
      creator: t.creator_name || '',
    })),
    summary: {
      totalIncome, totalExpense, netProfit: totalIncome - totalExpense,
      incomeByCategory: reportData.incomeByCategory,
      expenseByCategory: reportData.expenseByCategory,
    },
    language,
  });

  const handleExportPDF = () => { exportTransactionsToPDF(buildExportData()); toast.success(t('reports.exportPDFSuccess')); };
  const handleExportExcel = () => { exportTransactionsToExcel(buildExportData()); toast.success(t('reports.exportExcelSuccess')); };

  // ─── Shared pie chart renderer ──────────────────────
  const renderPieSection = (data: { name: string; value: number }[], total: number, emptyMsg: string) => {
    if (data.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">{emptyMsg}</div>;
    return (
      <>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={false}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {data.map((item, i) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
            return (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                  <span className="text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
  };

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-4">
        <div className="flex items-center justify-end flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <AIReportSummary
              reportData={{
                totalIncome, totalExpense,
                incomeByCategory: reportData.incomeByCategory,
                expenseByCategory: reportData.expenseByCategory,
                projectStats: reportData.projectStats,
                comparison: comparisonData?.changePercent,
              }}
              period={getPeriodLabel()}
            />
            {canExport && (
              isMobile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><MoreHorizontal className="w-4 h-4 mr-1" />{t('common.export')}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" />{t('reports.exportPDF')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />{t('reports.exportExcel')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-1" />{t('reports.exportPDF')}</Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4 mr-1" />{t('reports.exportExcel')}</Button>
                </>
              )
            )}
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} showPresets className={isMobile ? 'w-full' : 'w-[280px]'} />
          </div>
        </div>

        {isLoading ? (
          <AppSectionLoading label={t('common.loading')} className="min-h-[min(50dvh,28rem)]" />
        ) : (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="stat-card"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('reports.periodIncomePlain')}</p><p className="text-lg sm:text-2xl font-bold text-success break-all">{formatCurrency(totalIncome)}</p></div><ArrowUpRight className="w-8 h-8 text-success opacity-60" /></div></CardContent></Card>
              <Card className="stat-card"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('reports.periodExpensePlain')}</p><p className="text-lg sm:text-2xl font-bold text-destructive break-all">{formatCurrency(totalExpense)}</p></div><ArrowDownRight className="w-8 h-8 text-destructive opacity-60" /></div></CardContent></Card>
              <Card className="stat-card"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('reports.periodProfitPlain')}</p><p className={`text-lg sm:text-2xl font-bold break-all ${totalIncome - totalExpense >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(totalIncome - totalExpense)}</p></div><TrendingUp className="w-8 h-8 text-primary opacity-60" /></div></CardContent></Card>
              <Card className="stat-card"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('reports.exchangeProfit')}</p><p className="text-lg sm:text-2xl font-bold text-success break-all">{formatCurrency(reportData.exchangeStats.profit - reportData.exchangeStats.loss)}</p></div><DollarSign className="w-8 h-8 text-primary opacity-60" /></div></CardContent></Card>
            </div>

            {/* Comparison */}
            {comparisonData && (
              <Card className="border-2 border-primary/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><GitCompare className="w-5 h-5 text-primary" />{t('reports.comparisonAnalysis')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(['income', 'expense', 'profit'] as const).map(key => {
                      const label = key === 'income' ? t('reports.incomeComparison') : key === 'expense' ? t('reports.expenseComparison') : t('reports.profitComparison');
                      const cur = comparisonData.current[key];
                      const prev = comparisonData.previous[key];
                      const change = comparisonData.changePercent[key];
                      const positive = key === 'expense' ? change <= 0 : change >= 0;
                      const color = key === 'expense' ? 'text-destructive' : key === 'profit' ? (cur >= 0 ? 'text-success' : 'text-destructive') : 'text-success';
                      return (
                        <div key={key} className="space-y-2">
                          <p className="text-sm text-muted-foreground">{label}</p>
                          <div className="flex items-end gap-4">
                            <div><p className="text-xs text-muted-foreground">{t('reports.currentPeriod')}</p><p className={`text-base sm:text-xl font-bold break-all ${color}`}>{formatCurrency(cur)}</p></div>
                            <div><p className="text-xs text-muted-foreground">{t('reports.previousPeriod')}</p><p className="text-lg text-muted-foreground">{formatCurrency(prev)}</p></div>
                            <div className={`text-sm font-medium px-2 py-1 rounded ${positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{formatPercent(change)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="trend" className="w-full">
              <TabsList className="flex-wrap">
                <TabsTrigger value="trend" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />{t('reports.trendTab')}</TabsTrigger>
                <TabsTrigger value="category" className="flex items-center gap-2"><PieChartIcon className="w-4 h-4" />{t('reports.categoryTab')}</TabsTrigger>
                <TabsTrigger value="yearly" className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />{t('reports.yearlyTab')}</TabsTrigger>
                <TabsTrigger value="project" className="flex items-center gap-2"><Building2 className="w-4 h-4" />{t('reports.projectTab')}</TabsTrigger>
              </TabsList>

              <TabsContent value="trend" className="mt-6">
                <Card>
                  <CardHeader><CardTitle>{t('reports.monthlyTrend')}</CardTitle></CardHeader>
                  <CardContent>
                    {reportData.monthlyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
                        <ComposedChart data={reportData.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                          <Bar dataKey="income" name={t('dashboard.income')} fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" name={t('dashboard.expense')} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                          <Line type="monotone" dataKey="profit" name={t('dashboard.profit')} stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className={`${isMobile ? 'h-[250px]' : 'h-[400px]'} flex items-center justify-center text-muted-foreground`}>
                        <div className="text-center"><BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" /><p>{t('common.noData')}</p></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="category" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-success" />{t('monthlyReports.incomeCategory')}</CardTitle></CardHeader>
                    <CardContent>{renderPieSection(reportData.incomeByCategory, totalIncome, t('monthlyReports.noIncomeData'))}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><ArrowDownRight className="w-5 h-5 text-destructive" />{t('monthlyReports.expenseCategory')}</CardTitle></CardHeader>
                    <CardContent>{renderPieSection(reportData.expenseByCategory, totalExpense, t('monthlyReports.noExpenseData'))}</CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />{t('reports.projectExpenseCategory')}</CardTitle></CardHeader>
                    <CardContent>
                      {projectExpenseData.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart><Pie data={projectExpenseData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={false}>{projectExpenseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => formatCurrency(v)} /></PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-2">
                            {projectExpenseData.map((item, i) => {
                              const total = projectExpenseData.reduce((s, x) => s + x.value, 0);
                              const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                              return (
                                <div key={item.name} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="font-medium text-sm">{item.name}</span></div>
                                  <div className="flex items-center gap-3 shrink-0"><span className="font-bold">{formatCurrency(item.value)}</span><span className="text-muted-foreground w-10 text-right">{pct}%</span></div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground">{t('common.noData')}</div>}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="yearly" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{t('reports.selectYear')}:</span>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Card>
                    <CardHeader><CardTitle>{t('reports.yearlyComparison').replace('{year}', selectedYear)}</CardTitle></CardHeader>
                    <CardContent>
                      {yearlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
                          <ComposedChart data={yearlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                            <YAxis stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                            <Legend />
                            <Bar dataKey={t('dashboard.income')} fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey={t('dashboard.expense')} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey={t('dashboard.profit')} stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))' }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : <div className={`${isMobile ? 'h-[250px]' : 'h-[400px]'} flex items-center justify-center text-muted-foreground`}>{t('common.noData')}</div>}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: t('reports.yearTotalIncome').replace('{year}', selectedYear), key: t('dashboard.income'), color: 'text-success' },
                      { label: t('reports.yearTotalExpense').replace('{year}', selectedYear), key: t('dashboard.expense'), color: 'text-destructive' },
                      { label: t('reports.yearNetProfit').replace('{year}', selectedYear), key: t('dashboard.profit'), color: '' },
                    ].map(({ label, key, color }) => {
                      const val = yearlyData.reduce((s, d) => s + (Number((d as any)[key]) || 0), 0);
                      return (
                        <Card key={label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className={`text-lg sm:text-2xl font-bold break-all ${color || (val >= 0 ? 'text-success' : 'text-destructive')}`}>{formatCurrency(val)}</p></CardContent></Card>
                      );
                    })}
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t('reports.monthlyAverageProfit')}</p><p className="text-lg sm:text-2xl font-bold text-primary break-all">{formatCurrency(yearlyData.reduce((s, d) => s + (Number((d as any)[t('dashboard.profit')]) || 0), 0) / 12)}</p></CardContent></Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="project" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-success" />{t('reports.projectProfitRanking')}</CardTitle></CardHeader>
                    <CardContent>
                      {projectProfitData.length > 0 ? (
                        <div className="space-y-3">
                          {projectProfitData.map((p, i) => (
                            <div key={p.projectCode} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors" onClick={() => navigate(`/projects/${p.projectId}`)}>
                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                              <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{p.projectCode}</div><div className="text-xs text-muted-foreground truncate">{p.projectName}</div></div>
                              <div className="text-right shrink-0"><div className={`font-bold ${p.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(p.netProfit)}</div><div className="text-xs text-muted-foreground">{t('reports.income')}: {formatCurrency(p.totalIncome)} | {t('reports.expense')}: {formatCurrency(p.totalExpense)}</div></div>
                            </div>
                          ))}
                        </div>
                      ) : <div className="h-[350px] flex items-center justify-center text-muted-foreground">{t('common.noData')}</div>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>{t('reports.projectStatusDistribution')}</CardTitle></CardHeader>
                    <CardContent>
                      {reportData.projectStats.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart><Pie data={reportData.projectStats} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="count">{reportData.projectStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                          </ResponsiveContainer>
                          <div className="mt-4 space-y-2">
                            {reportData.projectStats.map((item, i) => (
                              <div key={item.status} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span>{item.status}</span></div>
                                <div className="text-right"><span className="font-medium">{item.count} {t('reports.projects')}</span><span className="text-muted-foreground ml-2">({formatCurrency(item.amount)})</span></div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">{t('common.noData')}</div>}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
}
