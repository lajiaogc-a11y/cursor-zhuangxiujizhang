import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, TrendingUp, FileText, FileSpreadsheet,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { format, startOfMonth, endOfMonth, getYear } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { CartesianGrid } from '@/components/ui/cartesian-grid-fix';
import { exportTransactionsToExcel, exportTransactionsToPDF, type CompanyTransactionData } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { fetchPeriodReport, fetchYearlyTrend, type CategoryData } from '@/services/monthlyReports.service';

// Sub-component for grouped category display with pie chart + list
function CategoryGroupSection({ title, data, colors, formatCurrency }: {
  title: string;
  data: CategoryData[];
  colors: string[];
  formatCurrency: (v: number) => string;
}) {
  const total = data.reduce((sum, i) => sum + i.value, 0);
  return (
    <div>
      <h4 className="text-sm font-semibold text-muted-foreground mb-2 border-b pb-1">{title}</h4>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={60} dataKey="value" label={false}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-1.5">
        {data.map((item, index) => {
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
          return (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-medium">{formatCurrency(item.value)}</span>
                <span className="text-muted-foreground w-10 text-right">{percent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MonthlyReports() {
  const { t, language } = useI18n();
  const { hasPermission } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const isMobile = useIsMobile();
  const canExport = hasPermission('feature.export');
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()).toString());
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const years = Array.from({ length: 5 }, (_, i) => (getYear(new Date()) - i).toString());

  const getPeriodLabel = () => {
    if (!dateRange?.from) return t('reports.selectDate');
    if (dateRange.to) {
      return `${format(dateRange.from, 'yyyy-MM-dd')} ~ ${format(dateRange.to, 'yyyy-MM-dd')}`;
    }
    return format(dateRange.from, 'yyyy-MM-dd');
  };

  const COLORS = [
    'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))',
    'hsl(var(--destructive))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658',
  ];

  // Current period data query - now using service layer
  const { data: periodData, isLoading } = useQuery({
    queryKey: [...queryKeys.monthlyReports, tenantId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), language],
    queryFn: () => {
      const startDate = format(dateRange?.from || startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(dateRange?.to || endOfMonth(new Date()), 'yyyy-MM-dd');
      return fetchPeriodReport(tenantId!, startDate, endDate, t('common.other'));
    },
    enabled: !!tenantId,
  });

  // Yearly trend query - now using service layer
  const { data: monthlyData = [] } = useQuery({
    queryKey: [...queryKeys.monthlyReports, 'yearly', selectedYear, tenantId, language],
    queryFn: () => fetchYearlyTrend(tenantId!, parseInt(selectedYear), language, t('common.monthSuffix')),
    enabled: !!tenantId,
  });

  const transactions = periodData?.transactions ?? [];
  const currentMonthData = periodData?.currentMonthData ?? null;
  const incomeByCategory = periodData?.incomeByCategory ?? [];
  const expenseByCategory = periodData?.expenseByCategory ?? [];
  const companyIncomeByCategory = periodData?.companyIncomeByCategory ?? [];
  const companyExpenseByCategory = periodData?.companyExpenseByCategory ?? [];
  const projectIncomeByCategory = periodData?.projectIncomeByCategory ?? [];
  const projectExpenseByCategory = periodData?.projectExpenseByCategory ?? [];
  const exchangeIncomeByCategory = periodData?.exchangeIncomeByCategory ?? [];
  const exchangeExpenseByCategory = periodData?.exchangeExpenseByCategory ?? [];

  const formatCurrency = (amount: number) => 
    `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
      totalIncome: currentMonthData?.income || 0,
      totalExpense: currentMonthData?.expense || 0,
      netProfit: currentMonthData?.profit || 0,
      incomeByCategory, expenseByCategory,
    },
    language,
  });

  const handleExportPDF = () => { exportTransactionsToPDF(buildExportData()); toast.success(t('monthlyReports.exportSuccess')); };
  const handleExportExcel = () => { exportTransactionsToExcel(buildExportData()); toast.success(t('monthlyReports.exportSuccess')); };

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-end flex-wrap gap-3">
          <div className={`flex items-center gap-3 ${isMobile ? 'flex-col w-full' : 'flex-wrap'}`}>
            {canExport && (
              isMobile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <MoreHorizontal className="w-4 h-4 mr-1" />
                      {t('common.export')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileText className="w-4 h-4 mr-2" />{t('monthlyReports.exportPDF')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />{t('monthlyReports.exportExcel')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <FileText className="w-4 h-4 mr-1" />{t('monthlyReports.exportPDF')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-1" />{t('monthlyReports.exportExcel')}
                  </Button>
                </>
              )
            )}
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} showPresets={true} className={isMobile ? 'w-full' : 'w-[280px]'} />
          </div>
        </div>

        {isLoading ? (
          <AppSectionLoading label={t('common.loading')} className="min-h-[min(50dvh,28rem)]" />
        ) : (
          <>
            {/* 当月统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="stat-card"><CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><ArrowUpRight className="w-4 h-4 text-success" />{t('monthlyReports.monthlyIncome')} (MYR)</div>
                <div className="text-lg sm:text-2xl font-bold text-success break-all">{formatCurrency(currentMonthData?.income || 0)}</div>
              </CardContent></Card>
              <Card className="stat-card"><CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><ArrowDownRight className="w-4 h-4 text-destructive" />{t('monthlyReports.monthlyExpense')} (MYR)</div>
                <div className="text-lg sm:text-2xl font-bold text-destructive break-all">{formatCurrency(currentMonthData?.expense || 0)}</div>
              </CardContent></Card>
              <Card className="stat-card"><CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingUp className="w-4 h-4" />{t('monthlyReports.monthlyProfit')} (MYR)</div>
                <div className={`text-lg sm:text-2xl font-bold break-all ${(currentMonthData?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(currentMonthData?.profit || 0)}</div>
              </CardContent></Card>
              <Card className="stat-card"><CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><CalendarDays className="w-4 h-4" />{t('monthlyReports.transactionCount')}</div>
                <div className="text-lg sm:text-2xl font-bold break-all">{currentMonthData?.transactionCount || 0}</div>
              </CardContent></Card>
            </div>

            {/* 年度月度趋势图 */}
            <Card>
              <CardHeader><CardTitle>{selectedYear}{t('monthlyReports.year')} {t('monthlyReports.yearlyTrend')} (MYR)</CardTitle></CardHeader>
              <CardContent>
                <div className={`${isMobile ? 'h-[200px]' : 'h-[300px]'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `RM ${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="income" name={t('transactions.income')} fill="hsl(var(--success))" />
                      <Bar dataKey="expense" name={t('transactions.expense')} fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 分类统计 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-success">{t('monthlyReports.incomeCategory')} (MYR)</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {companyIncomeByCategory.length === 0 && projectIncomeByCategory.length === 0 && exchangeIncomeByCategory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">{t('monthlyReports.noIncomeData')}</div>
                  ) : (
                    <>
                      {companyIncomeByCategory.length > 0 && <CategoryGroupSection title={t('report.companyDaily')} data={companyIncomeByCategory} colors={COLORS} formatCurrency={formatCurrency} />}
                      {projectIncomeByCategory.length > 0 && <CategoryGroupSection title={t('report.projectRelated')} data={projectIncomeByCategory} colors={COLORS} formatCurrency={formatCurrency} />}
                      {exchangeIncomeByCategory.length > 0 && <CategoryGroupSection title={t('report.exchangeRelated')} data={exchangeIncomeByCategory} colors={COLORS} formatCurrency={formatCurrency} />}
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-destructive">{t('monthlyReports.expenseCategory')} (MYR)</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {companyExpenseByCategory.length === 0 && projectExpenseByCategory.length === 0 && exchangeExpenseByCategory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">{t('monthlyReports.noExpenseData')}</div>
                  ) : (
                    <>
                      {companyExpenseByCategory.length > 0 && <CategoryGroupSection title={t('report.companyDaily')} data={companyExpenseByCategory} colors={COLORS} formatCurrency={formatCurrency} />}
                      {projectExpenseByCategory.length > 0 && <CategoryGroupSection title={t('report.projectRelated')} data={projectExpenseByCategory} colors={COLORS} formatCurrency={formatCurrency} />}
                      {exchangeExpenseByCategory.length > 0 && <CategoryGroupSection title={t('report.exchangeRelated')} data={exchangeExpenseByCategory} colors={COLORS} formatCurrency={formatCurrency} />}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 交易明细表 */}
            <Card>
              <CardHeader><CardTitle>{getPeriodLabel()} {t('monthlyReports.transactionDetails')}</CardTitle></CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">{t('monthlyReports.noTransactions')}</div>
                ) : isMobile ? (
                  <div className="space-y-2">
                    {transactions.slice(0, 20).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">{tx.transaction_date}</span>
                            <Badge className={`text-xs ${tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                              {tx.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                            </Badge>
                          </div>
                          <p className="text-sm truncate">{tx.summary}</p>
                        </div>
                        <span className={`font-semibold text-sm shrink-0 ml-2 ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(tx.amount_myr)}
                        </span>
                      </div>
                    ))}
                    {transactions.length > 20 && (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        {t('monthlyReports.showingRecords').replace('{count}', '20')}，{t('reports.totalRecords').replace('{count}', String(transactions.length))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('common.date')}</TableHead>
                          <TableHead>{t('monthlyReports.type')}</TableHead>
                          <TableHead>{t('transactions.category')}</TableHead>
                          <TableHead>{t('transactions.summary')}</TableHead>
                          <TableHead className="text-right">{t('common.amount')} (MYR)</TableHead>
                          <TableHead>{t('transactions.account')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.slice(0, 20).map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>{tx.transaction_date}</TableCell>
                            <TableCell>
                              <Badge className={tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                                {tx.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                              </Badge>
                            </TableCell>
                            <TableCell>{tx.category_name}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{tx.summary}</TableCell>
                            <TableCell className="text-right">
                              <span className={tx.type === 'income' ? 'text-success' : 'text-destructive'}>{formatCurrency(tx.amount_myr)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{tx.account_type === 'cash' ? t('account.cash') : t('account.bank')}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {transactions.length > 20 && (
                      <div className="p-4 text-center text-sm text-muted-foreground border-t">
                        {t('monthlyReports.showingRecords').replace('{count}', '20')}，{t('reports.totalRecords').replace('{count}', String(transactions.length))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
