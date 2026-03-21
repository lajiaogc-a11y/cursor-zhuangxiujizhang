import { useState, useEffect, useRef, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, Search, ArrowUpRight, ArrowDownRight, TrendingUp, Download, Upload, FileSpreadsheet, FileText, X, MoreHorizontal, Filter, ChevronDown, ArrowLeftRight, CreditCard, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/empty-state';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchCompanyAccountBalances, fetchTransactionStatsRaw, fetchTransactionStatsForExport, batchImportTransactions } from '@/services/settings.service';
import { fetchLatestExchangeRate, fetchTransactionFormData } from '@/services/transactions.service';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { ExchangeTab } from '@/components/transactions/ExchangeTab';
import { PayablesTab } from '@/components/transactions/PayablesTab';
import { PayrollTab } from '@/components/transactions/PayrollTab';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useI18n } from '@/lib/i18n';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { CurrencyStatsPanel, calculateCurrencyStats } from '@/components/ui/currency-stats-panel';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { queryKeys } from '@/lib/queryKeys';
import { exportTransactionsToPDF, type CompanyTransactionData } from '@/lib/exportUtils';
import { useTenant } from '@/lib/tenant';
import { useTransactions, useTransactionStats } from '@/hooks/useTransactionService';
import { CategoryStatsPanel } from '@/components/transactions/CategoryStatsPanel';

interface Transaction {
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
  project_id: string | null;
  project_code?: string | null;
  project_name?: string | null;
}

export default function Transactions() {
  const { t, language } = useI18n();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('feature.edit');
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(false);
  const { refreshTransactions } = useDataRefresh();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [initialType, setInitialType] = useState<'income' | 'expense'>('expense');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  
  const importAbortRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState('transactions');
  const [showStats, setShowStats] = useState(true);
  
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const tabParam = searchParams.get('tab');
    if (categoryParam) setCategoryFilter(decodeURIComponent(categoryParam));
    if (tabParam && ['transactions', 'exchange', 'payables', 'payroll', 'overview'].includes(tabParam)) setActiveTab(tabParam);
  }, [searchParams]);

  const clearCategoryFilter = () => {
    setCategoryFilter('');
    searchParams.delete('category');
    setSearchParams(searchParams);
  };

  const txFilters = {
    type: typeFilter !== 'all' ? typeFilter as 'income' | 'expense' : undefined,
    accountType: accountTypeFilter,
    currency: currencyFilter,
    search: debouncedSearch,
    category: categoryFilter || undefined,
    dateRange: {
      from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    },
    ledgerTypes: ['company_daily', 'exchange'] as string[],
  };
  const { data: txData, isLoading: loading } = useTransactions(
    tenantId,
    txFilters,
    { page: currentPage, pageSize },
    activeTab === 'transactions'
  );
  const transactions = (txData?.data || []) as Transaction[];
  const totalCount = txData?.totalCount || 0;

  const statsQueryKey = [...queryKeys.transactionStats, tenantId, { dateRange: dateRange?.from?.toISOString(), dateRangeTo: dateRange?.to?.toISOString(), accountTypeFilter, currencyFilter }];
  const { data: statsData } = useQuery({
    queryKey: statsQueryKey,
    queryFn: async () => {
      if (!tenantId) return { stats: { totalIncome: 0, totalExpense: 0 }, perCurrencyStats: { MYR: { income: 0, expense: 0 }, CNY: { income: 0, expense: 0 }, USD: { income: 0, expense: 0 } }, currencyStats: [] as any[], initialBalances: {} };
      
      const accountsData = await fetchCompanyAccountBalances(tenantId);
      const initialBalances: Record<string, Record<string, number>> = {};
      accountsData.forEach(acc => { if (!initialBalances[acc.currency]) initialBalances[acc.currency] = {}; initialBalances[acc.currency][acc.account_type] = Number(acc.balance || 0); });

      const data = await fetchTransactionStatsRaw(tenantId, {
        accountType: accountTypeFilter,
        currency: currencyFilter,
        dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      });
      if (!data.length) return { stats: { totalIncome: 0, totalExpense: 0 }, perCurrencyStats: { MYR: { income: 0, expense: 0 }, CNY: { income: 0, expense: 0 }, USD: { income: 0, expense: 0 } }, currencyStats: [] as any[], initialBalances };
      
      const perCurrency: Record<string, { income: number; expense: number }> = { MYR: { income: 0, expense: 0 }, CNY: { income: 0, expense: 0 }, USD: { income: 0, expense: 0 } };
      data.forEach(t => {
        const cur = t.currency || 'MYR';
        if (!perCurrency[cur]) perCurrency[cur] = { income: 0, expense: 0 };
        if (t.type === 'income') perCurrency[cur].income += Number(t.amount || 0);
        else perCurrency[cur].expense += Number(t.amount || 0);
      });
      
      const income = data.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount_myr || 0), 0);
      const expense = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount_myr || 0), 0);
      
      const cStats = calculateCurrencyStats(data.map(t => ({ type: t.type, currency: t.currency, account_type: t.account_type, amount: Number(t.amount || 0) })), initialBalances);
      return { stats: { totalIncome: income, totalExpense: expense }, perCurrencyStats: perCurrency, currencyStats: cStats, initialBalances };
    },
    enabled: !!tenantId && (activeTab === 'transactions' || activeTab === 'overview'),
  });
  const perCurrencyStats: Record<string, { income: number; expense: number }> = statsData?.perCurrencyStats || { MYR: { income: 0, expense: 0 }, CNY: { income: 0, expense: 0 }, USD: { income: 0, expense: 0 } };
  const currencyStats = statsData?.currencyStats || [];

  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1); }, 300); return () => clearTimeout(timer); }, [searchTerm]);
  useEffect(() => { setCurrentPage(1); }, [typeFilter, dateRange, categoryFilter, accountTypeFilter, currencyFilter]);

  const handleEdit = (transaction: Transaction) => { setEditingTransaction(transaction); setFormOpen(true); };
  const handleAddIncome = () => { setEditingTransaction(null); setInitialType('income'); setFormOpen(true); };
  const handleAddExpense = () => { setEditingTransaction(null); setInitialType('expense'); setFormOpen(true); };
  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };

  const handleRefresh = () => {
    refreshTransactions();
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      [t('common.date'), t('transactions.type'), t('transactions.category'), t('transactions.summary'), t('common.amount'), t('transactions.currency'), t('transactions.account'), t('transactions.exchangeRate'), t('form.projectCode'), t('common.remark')],
      ['2025-01-18', 'expense', t('transactions.other'), t('transactions.summary'), '1000', 'MYR', 'bank', '1', '', t('common.remark')],
      ['2025-01-18', 'income', t('transactions.other'), t('transactions.summary'), '5000', 'CNY', 'bank', '0.65', 'P001', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('transactions.importTemplate'));
    XLSX.writeFile(wb, `${t('transactions.importTemplate')}.xlsx`);
    toast.success(t('transactions.templateDownloaded'));
  };

  const handleExportExcel = async () => {
    try {
      const data = await fetchTransactionStatsForExport(tenantId!, {
        typeFilter,
        search: searchTerm.trim() || undefined,
        dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      });
      const exportData = [
        [t('table.sequence'), t('common.date'), t('table.type'), t('table.ledger'), t('table.category'), t('table.summary'), t('table.amount'), t('transactions.currency'), t('transactions.myrEquivalent'), t('table.account'), t('table.source'), t('table.remark'), t('transactions.creator')],
        ...(data).map(tx => [
          tx.sequence_no, tx.transaction_date,
          tx.type === 'income' ? t('transactions.income') : t('transactions.expense'),
          tx.ledger_type === 'company_daily' ? t('transactions.daily') : t('transactions.exchange'),
          tx.category_name, tx.summary, tx.amount, tx.currency, tx.amount_myr,
          tx.account_type === 'cash' ? t('account.cash') : t('account.bank'),
          tx.remark_1 || t('common.manualEntry'), tx.remark_2 || '', tx.creator_name || '',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('transactions.transactionRecords'));
      XLSX.writeFile(wb, `${t('transactions.companyRecords')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
      toast.success(t('common.exportSuccess'));
    } catch (error: any) { toast.error(error.message || t('common.exportFailed')); }
  };

  const handleExportPDF = async () => {
    try {
      const data = await fetchTransactionStatsForExport(tenantId!, {
        typeFilter,
        search: searchTerm.trim() || undefined,
        dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      });
      const incomeByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};
      let totalIncome = 0, totalExpense = 0;
      (data || []).forEach(tx => {
        if (tx.type === 'income') { totalIncome += Number(tx.amount_myr || 0); incomeByCategory[tx.category_name] = (incomeByCategory[tx.category_name] || 0) + Number(tx.amount_myr || 0); }
        else { totalExpense += Number(tx.amount_myr || 0); expenseByCategory[tx.category_name] = (expenseByCategory[tx.category_name] || 0) + Number(tx.amount_myr || 0); }
      });
      const periodLabel = dateRange?.from && dateRange?.to ? `${format(dateRange.from, 'yyyy-MM-dd')} ~ ${format(dateRange.to, 'yyyy-MM-dd')}` : t('common.all');
      const exportData: CompanyTransactionData = {
        period: periodLabel,
        transactions: (data || []).map(tx => ({ sequenceNo: tx.sequence_no, date: tx.transaction_date, type: tx.type, category: tx.category_name, summary: tx.summary, amount: tx.amount, currency: tx.currency, amountMYR: tx.amount_myr, accountType: tx.account_type, ledgerType: tx.ledger_type || '', receipt: '', source: tx.project_code || tx.remark_1 || '', remark: tx.remark_2 || '', creator: tx.creator_name || '' })),
        summary: { totalIncome, totalExpense, netProfit: totalIncome - totalExpense, incomeByCategory: Object.entries(incomeByCategory).map(([name, value]) => ({ name, value })), expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })) },
        language,
      };
      exportTransactionsToPDF(exportData);
      toast.success(t('common.exportSuccess'));
    } catch (error: any) { toast.error(error.message || t('common.exportFailed')); }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!tenantId) { toast.error(language === 'zh' ? '未选择租户' : 'No tenant selected'); return; }
    importAbortRef.current = { cancelled: false };
    const loadingToast = toast.loading(
      <div className="flex items-center gap-3">
        <span>{t('transactions.importing')} 0%</span>
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => { importAbortRef.current.cancelled = true; toast.dismiss(loadingToast); toast.info(t('common.operationCancelled')); }}>{t('common.cancel')}</Button>
      </div>
    );
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          const rows = jsonData.slice(1).filter(row => row.length >= 5 && row[0]);
          if (rows.length === 0) { toast.dismiss(loadingToast); toast.error(t('transactions.noValidData')); return; }
          const { data: { user } } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
          // Fetch exchange rates and projects via service layer
          const formData = await fetchTransactionFormData(tenantId, undefined);
          const latestRates: Array<{ from_currency: string; rate: number }> = [];
          for (const cur of ['CNY', 'USD'] as const) {
            const rate = await fetchLatestExchangeRate(cur);
            if (rate) latestRates.push({ from_currency: cur, rate });
          }

          // Helper: parse Excel date (serial number or string)
          const parseExcelDate = (val: any): string => {
            if (typeof val === 'number') {
              // Excel serial date → JS Date
              const epoch = new Date(1899, 11, 30);
              const d = new Date(epoch.getTime() + val * 86400000);
              return format(d, 'yyyy-MM-dd');
            }
            const s = String(val).trim();
            // Try common formats: yyyy-MM-dd, yyyy/MM/dd, dd/MM/yyyy, MM/dd/yyyy
            if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) return s.replace(/\//g, '-');
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
              const parts = s.split('/');
              return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
            }
            return s;
          };
          const rateMap: Record<string, number> = {};
          latestRates.forEach(r => { if (!rateMap[r.from_currency]) rateMap[r.from_currency] = r.rate; });

          // Use projects from service-layer form data
          const projectMap: Record<string, string> = {};
          (formData.projects || []).forEach((p: any) => { projectMap[p.project_code?.toLowerCase() || ''] = p.id; });

          const insertData = rows.map(row => {
            // Detect if first column is a sequence number (integer, not an Excel date serial)
            // Excel dates are typically > 40000 (year ~2009+), sequence numbers are small integers
            // Also check: if col0 is a small integer AND col1 looks like a date string or Excel date, it's new format
            const col0 = row[0];
            const col1 = row[1];
            const col0IsSmallInt = typeof col0 === 'number' && col0 > 0 && col0 < 10000 && Number.isInteger(col0);
            const col1LooksLikeDate = (typeof col1 === 'number' && col1 > 40000) || /\d{4}[-/]/.test(String(col1 || ''));
            const hasSeqNo = col0IsSmallInt && col1LooksLikeDate && row.length >= 6;
            const offset = hasSeqNo ? 1 : 0;
            
            const typeValue = row[1 + offset] === '收入' || row[1 + offset] === 'income' ? 'income' : 'expense';
            const currencyValue = String(row[5 + offset] || 'MYR').toUpperCase();
            const validCurrency = ['MYR', 'CNY', 'USD'].includes(currencyValue) ? currencyValue : 'MYR';
            const accountValue = row[6 + offset] === '现金' || row[6 + offset] === 'cash' ? 'cash' : 'bank';
            const amount = parseFloat(row[4 + offset]) || 0;
            let exchangeRate = parseFloat(row[7 + offset]) || 0;
            if (!exchangeRate || exchangeRate <= 0) { exchangeRate = validCurrency === 'MYR' ? 1 : (rateMap[validCurrency] || 1); }
            
            // Project code matching
            const projectCode = String(row[8 + offset] || '').trim();
            const projectId = projectCode ? (projectMap[projectCode.toLowerCase()] || null) : null;
            const ledgerType = projectId ? 'project' : 'company_daily';

            return {
              transaction_date: parseExcelDate(row[0 + offset]),
              type: typeValue as 'income' | 'expense',
              category_name: String(row[2 + offset] || t('transactions.other')),
              summary: String(row[3 + offset] || ''),
              amount,
              currency: validCurrency as 'MYR' | 'CNY' | 'USD',
              account_type: accountValue as 'cash' | 'bank',
              amount_myr: amount * exchangeRate,
              exchange_rate: exchangeRate,
              ledger_type: ledgerType as 'company_daily' | 'project',
              project_id: projectId,
              remark_2: String(row[9 + offset] || ''),
              created_by: user?.id,
              tenant_id: tenantId,
            };
          });

          // Use service-layer batch import
          const { insertedCount, errors } = await batchImportTransactions(
            insertData,
            100,
            (progress, inserted) => {
              toast.loading(<div className="flex items-center gap-3"><span>{t('transactions.importing')} {progress}%</span><Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => { importAbortRef.current.cancelled = true; }}>{t('common.cancel')}</Button></div>, { id: loadingToast });
              return importAbortRef.current.cancelled;
            }
          );
          if (importAbortRef.current.cancelled) { toast.dismiss(loadingToast); toast.info(t('transactions.importCancelled').replace('{count}', String(insertedCount))); handleRefresh(); return; }
          toast.dismiss(loadingToast);

          // Post-import: recalculate project summaries for all affected projects
          const affectedProjectIds = new Set<string>();
          insertData.forEach(row => { if (row.project_id) affectedProjectIds.add(row.project_id); });
          const { supabase: sb } = await import('@/integrations/supabase/client');
          for (const pid of affectedProjectIds) {
            try {
              await sb.rpc('recalculate_project_summary', { _project_id: pid });
            } catch (e) {
              console.error('Failed to recalculate project summary:', pid, e);
            }
          }

          if (errors.length === 0) toast.success(t('transactions.importSuccess').replace('{count}', String(insertedCount)));
          else if (insertedCount > 0) toast.warning(`${t('transactions.importPartial')}: ${insertedCount}/${insertData.length}`);
          else toast.error(errors[0] || t('common.importFailed'));
          handleRefresh();
        } catch (error: any) { toast.dismiss(loadingToast); toast.error(error.message || t('common.importFailed')); }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) { toast.dismiss(loadingToast); toast.error(error.message || t('common.fileReadFailed')); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList className="w-full sm:w-auto justify-start overflow-x-auto">
              <TabsTrigger value="transactions" className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">{t('transactions.title')}</span>
                <span className="sm:hidden">{language === 'zh' ? '收支' : 'Txn'}</span>
              </TabsTrigger>
              <TabsTrigger value="exchange" className="flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4" />
                <span className="hidden sm:inline">{t('exchange.title')}</span>
                <span className="sm:hidden">{language === 'zh' ? '换汇' : 'FX'}</span>
              </TabsTrigger>
              <TabsTrigger value="payables" className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">{t('payables.title')}</span>
                <span className="sm:hidden">{language === 'zh' ? '应付' : 'AP'}</span>
              </TabsTrigger>
              <TabsTrigger value="payroll" className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{t('payroll.title')}</span>
                <span className="sm:hidden">{language === 'zh' ? '账单' : 'Pay'}</span>
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'zh' ? '收支预览' : 'Overview'}</span>
                <span className="sm:hidden">{language === 'zh' ? '预览' : 'View'}</span>
              </TabsTrigger>
            </TabsList>
            {activeTab === 'transactions' && (
              <div className="flex gap-2 shrink-0">
                <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                {canEdit && (
                  <>
                    <Button size="sm" variant="outline" className="text-success border-success hover:bg-success/10" onClick={handleAddIncome}>
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      <span className="hidden md:inline">{t('transactions.income')}</span>
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={handleAddExpense}>
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                      <span className="hidden md:inline">{t('transactions.expense')}</span>
                    </Button>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      <span className="hidden md:inline">{language === 'zh' ? '更多' : 'More'}</span>
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadTemplate}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />{t('transactions.downloadTemplate')}
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />{t('common.import')}
                      </DropdownMenuItem>
                    )}
                    {hasPermission('feature.export') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportExcel}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />{language === 'zh' ? '导出 Excel' : 'Export Excel'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF}>
                          <FileText className="w-4 h-4 mr-2" />{language === 'zh' ? '导出 PDF' : 'Export PDF'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Company Transactions Tab - with stats sidebar */}
          <TabsContent value="transactions">
            <div className="space-y-4">
              {categoryFilter && (
                <Card>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t('transactions.currentCategoryFilter')}:</span>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {categoryFilter}
                        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={clearCategoryFilter}><X className="h-3 w-3" /></Button>
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder={t('transactions.searchPlaceholder')} className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      </div>
                      <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} showPresets={true} className="w-full md:w-[280px]" placeholder={t('common.selectDate')} />
                      {isMobile && (
                        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
                          <Filter className="w-4 h-4" />{t('common.filter')}
                          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                          {(typeFilter !== 'all' || accountTypeFilter !== 'all' || currencyFilter !== 'all') && (
                            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                              {[typeFilter, accountTypeFilter, currencyFilter].filter(f => f !== 'all').length}
                            </Badge>
                          )}
                        </Button>
                      )}
                    </div>
                    <Collapsible open={showFilters || !isMobile}>
                      <CollapsibleContent>
                        <div className="flex flex-col md:flex-row gap-3">
                          <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('transactions.allTypes')}</SelectItem>
                              <SelectItem value="income">{t('transactions.income')}</SelectItem>
                              <SelectItem value="expense">{t('transactions.expense')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                            <SelectTrigger className="w-full md:w-[130px]"><SelectValue placeholder={t('transactions.accountTypeFilter')} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('transactions.allAccountTypes')}</SelectItem>
                              <SelectItem value="cash">{t('account.cash')}</SelectItem>
                              <SelectItem value="bank">{t('account.bank')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                            <SelectTrigger className="w-full md:w-[130px]"><SelectValue placeholder={t('transactions.currencyFilter')} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('transactions.allCurrencies')}</SelectItem>
                              <SelectItem value="MYR">MYR</SelectItem>
                              <SelectItem value="CNY">CNY</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>

              {loading ? (
                <Card><CardContent className="py-16 text-center text-muted-foreground">{t('common.loading')}</CardContent></Card>
              ) : transactions.length === 0 ? (
                <Card><CardContent className="p-0">
                  <EmptyState
                    icon={Receipt}
                    title={t('transactions.noRecords')}
                    description={t('transactions.noRecordsHint')}
                    action={canEdit ? { label: t('transactions.addTransaction'), onClick: () => { setEditingTransaction(null); setFormOpen(true); } } : undefined}
                  />
                </CardContent></Card>
              ) : (
                <TransactionList transactions={transactions} onEdit={handleEdit} onRefresh={handleRefresh} canEdit={canEdit}
                  serverPagination={{ currentPage, totalPages, pageSize, totalItems: totalCount, onPageChange: handlePageChange, onPageSizeChange: handlePageSizeChange }} />
              )}
            </div>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="stat-card-v2 group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-success/10"><ArrowUpRight className="w-4 h-4 text-success" /></div>
                    <div className="min-w-0">
                      <div className="space-y-0.5">
                        {(['MYR', 'CNY', 'USD'] as const).map(cur => { const val = perCurrencyStats[cur]?.income || 0; if (val === 0) return null; const sym = cur === 'MYR' ? 'RM' : cur === 'CNY' ? '¥' : '$'; return (<p key={cur} className="text-sm font-bold text-success tabular-nums leading-tight">{sym} {val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>); })}
                        {Object.values(perCurrencyStats).every(v => v.income === 0) && <p className="text-sm font-bold text-success tabular-nums leading-tight">RM 0.00</p>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t('transactions.totalIncome')}</p>
                    </div>
                  </div>
                </div>
                <div className="stat-card-v2 group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-destructive/10"><ArrowDownRight className="w-4 h-4 text-destructive" /></div>
                    <div className="min-w-0">
                      <div className="space-y-0.5">
                        {(['MYR', 'CNY', 'USD'] as const).map(cur => { const val = perCurrencyStats[cur]?.expense || 0; if (val === 0) return null; const sym = cur === 'MYR' ? 'RM' : cur === 'CNY' ? '¥' : '$'; return (<p key={cur} className="text-sm font-bold text-destructive tabular-nums leading-tight">{sym} {val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>); })}
                        {Object.values(perCurrencyStats).every(v => v.expense === 0) && <p className="text-sm font-bold text-destructive tabular-nums leading-tight">RM 0.00</p>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t('transactions.totalExpense')}</p>
                    </div>
                  </div>
                </div>
                <div className="stat-card-v2 group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10"><TrendingUp className="w-4 h-4 text-primary" /></div>
                    <div className="min-w-0">
                      <div className="space-y-0.5">
                        {(['MYR', 'CNY', 'USD'] as const).map(cur => { const inc = perCurrencyStats[cur]?.income || 0; const exp = perCurrencyStats[cur]?.expense || 0; const net = inc - exp; if (inc === 0 && exp === 0) return null; const sym = cur === 'MYR' ? 'RM' : cur === 'CNY' ? '¥' : '$'; return (<p key={cur} className={`text-sm font-bold tabular-nums leading-tight ${net >= 0 ? 'text-success' : 'text-destructive'}`}>{sym} {net.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>); })}
                        {Object.values(perCurrencyStats).every(v => v.income === 0 && v.expense === 0) && <p className="text-sm font-bold text-success tabular-nums leading-tight">RM 0.00</p>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t('transactions.netIncome')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {(() => {
                  const currencies = ['CNY', 'MYR', 'USD'];
                  const accountTypes = ['cash', 'bank'] as const;
                  const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
                  const items: { currency: string; accountType: string; income: number; expense: number; balance: number }[] = [];
                  currencies.forEach(currency => { accountTypes.forEach(accType => { const stat = currencyStats.find(s => s.currency === currency && s.accountType === accType); items.push({ currency, accountType: accType, income: stat?.income || 0, expense: stat?.expense || 0, balance: stat?.balance || 0 }); }); });
                  return items.map((item) => (
                    <Card key={`${item.currency}-${item.accountType}`} className="border">
                      <CardContent className="p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1.5">{item.currency} {item.accountType === 'cash' ? t('account.cash') : t('account.bank')}</div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center"><span className="text-xs text-success">{t('dashboard.income')}</span><span className="text-xs font-medium text-success">{symbols[item.currency]}{item.income.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                          <div className="flex justify-between items-center"><span className="text-xs text-destructive">{t('dashboard.expense')}</span><span className="text-xs font-medium text-destructive">{symbols[item.currency]}{item.expense.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                          <div className="border-t pt-1 mt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium">{t('currencyStats.balance')}</span>
                              <span className={`text-xs font-bold ${item.balance >= 0 ? 'text-success' : 'text-destructive'}`}>{symbols[item.currency]}{item.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ));
                })()}
              </div>

              <CategoryStatsPanel tenantId={tenantId} dateRange={dateRange} />
            </div>
          </TabsContent>

          {/* Exchange Tab */}
          <TabsContent value="exchange"><ExchangeTab /></TabsContent>

          {/* Payables Tab */}
          <TabsContent value="payables"><PayablesTab /></TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll"><PayrollTab /></TabsContent>
        </Tabs>
      </div>

      <TransactionForm open={formOpen} onOpenChange={setFormOpen} transaction={editingTransaction} onSuccess={handleRefresh} initialType={initialType} />
    </MainLayout>
  );
}
