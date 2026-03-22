import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projectsService } from '@/services';
import { toast } from 'sonner';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, CreditCard, FileText, FileSpreadsheet, ArrowUpRight, ArrowDownRight, MoreHorizontal, Edit, Trash2, Check, ExternalLink, Search, Filter, X, RotateCcw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProjectAdditionForm } from '@/components/projects/ProjectAdditionForm';
import { ProjectTransactionList } from '@/components/projects/ProjectTransactionList';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { exportProjectToPDF, exportProjectToExcel, type ProjectFinancialData } from '@/lib/exportUtils';
import { useI18n } from '@/lib/i18n';
import { CurrencyStatsPanel, calculateCurrencyStats } from '@/components/ui/currency-stats-panel';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useTenant } from '@/lib/tenant';

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  customer_name: string;
  contract_currency: string;
  contract_amount: number;
  contract_amount_myr: number;
  total_income_myr?: number | null;
  total_addition_myr?: number | null;
  total_material_myr?: number | null;
  total_labor_myr?: number | null;
  total_other_expense_myr?: number | null;
  total_expense_myr?: number | null;
  net_profit_myr?: number | null;
}

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
}

interface Addition {
  id: string;
  addition_date: string;
  description: string;
  amount: number;
  currency: string;
  amount_myr: number;
  is_paid: boolean;
  remark: string | null;
}

export default function ProjectFinancialsPage() {
  const { t, language } = useI18n();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('feature.edit');
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: projectData, isLoading } = useQuery({
    queryKey: [...queryKeys.projects, tenantId, 'financials', projectId],
    queryFn: () => projectsService.fetchProjectFinancials(projectId!),
    enabled: !!projectId && !!tenantId,
  });

  const project = projectData?.project ?? null;
  const transactions = projectData?.transactions ?? [];
  const additions = projectData?.additions ?? [];
  const loading = isLoading;

  const invalidateProjectData = () => {
    if (!tenantId) return;
    queryClient.invalidateQueries({ queryKey: [...queryKeys.projects, tenantId, 'financials', projectId] });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.projects, tenantId] });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.transactions, tenantId] });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard, tenantId] });
  };

  const [additionFormOpen, setAdditionFormOpen] = useState(false);
  const [editingAddition, setEditingAddition] = useState<Addition | null>(null);
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  const handleDeleteAddition = async (id: string) => {
    if (!confirm(t('toast.deleteConfirm'))) return;
    try {
      await projectsService.deleteProjectAddition(id);
      toast.success(t('toast.additionDeleted'));
      invalidateProjectData();
    } catch (error: any) {
      toast.error(error.message || t('toast.deleteFailed'));
    }
  };



  const handleQuickMarkPaid = async (additionId: string) => {
    try {
      await projectsService.markAdditionPaid(additionId);
      toast.success(t('toast.markedAsPaid'));
      invalidateProjectData();
    } catch (error: any) {
      toast.error(error.message || t('toast.operationFailed'));
    } finally {
      setConfirmPaymentId(null);
    }
  };

  const formatCurrency = (amount: number | null, currency: string = 'MYR') => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    return `${symbols[currency] || ''}${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Search & filter logic (must be before early return for hooks rules)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (dateFrom && tx.transaction_date < dateFrom) return false;
      if (dateTo && tx.transaction_date > dateTo) return false;
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const accountMatch = 
          (tx.account_type === 'cash' && ('现金'.includes(kw) || 'cash'.includes(kw))) ||
          (tx.account_type === 'bank' && ('银行'.includes(kw) || 'bank'.includes(kw)));
        return (
          tx.category_name.toLowerCase().includes(kw) ||
          tx.summary.toLowerCase().includes(kw) ||
          (tx.remark_2 || '').toLowerCase().includes(kw) ||
          (tx.remark_1 || '').toLowerCase().includes(kw) ||
          tx.amount.toString().includes(kw) ||
          tx.amount_myr.toString().includes(kw) ||
          accountMatch
        );
      }
      return true;
    });
  }, [transactions, searchKeyword, typeFilter, dateFrom, dateTo]);

  const activeFilterCount = [
    typeFilter !== 'all',
    dateFrom !== '',
    dateTo !== '',
  ].filter(Boolean).length;

  const hasAnyFilter = searchKeyword !== '' || activeFilterCount > 0;

  const handleResetFilters = () => {
    setSearchKeyword('');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  if (loading || !project) {
    return (
      <MainLayout>
        <AppSectionLoading label={t('common.loading')} className="min-h-[50dvh]" />
      </MainLayout>
    );
  }

  // 计算财务数据
  const contractTotal = project.contract_amount_myr || 0;
  const additionsTotal = project.total_addition_myr || 0;
  const receivableTotal = contractTotal + additionsTotal;
  
  const totalReceived = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount_myr, 0);
  const expenseTotal = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount_myr, 0);
  
  const pendingAmount = (contractTotal === 0 && additionsTotal === 0) ? 0 : Math.max(0, receivableTotal - totalReceived);
  const netProfit = totalReceived - expenseTotal;
  const profitMargin = totalReceived > 0 ? (netProfit / totalReceived) * 100 : 0;

  const currencyStats = calculateCurrencyStats(transactions.map(tx => ({
    type: tx.type,
    currency: tx.currency,
    account_type: tx.account_type,
    amount: tx.amount,
  })));

  const handleExportPDF = () => {
    const lang = (language === 'zh' || language === 'en') ? language : 'zh';
    const exportData: ProjectFinancialData = {
      projectName: project.project_name,
      projectCode: project.project_code,
      customerName: project.customer_name || '',
      contractAmount: project.contract_amount,
      contractCurrency: project.contract_currency,
      contractAmountMYR: project.contract_amount_myr,
      totalIncome: receivableTotal,
      totalExpense: expenseTotal,
      netProfit: netProfit,
      totalAddition: additionsTotal,
      totalReceived: totalReceived,
      pendingAmount: pendingAmount,
      language: lang,
      expenses: transactions
        .filter(tx => tx.type === 'expense')
        .map(tx => ({
          date: tx.transaction_date,
          category: tx.category_name,
          description: tx.summary,
          amount: tx.amount,
          currency: tx.currency,
          amountMYR: tx.amount_myr,
          accountType: tx.account_type,
          remark: tx.remark_2 || '',
        })),
      payments: transactions
        .filter(tx => tx.type === 'income')
        .map(tx => ({
          date: tx.transaction_date,
          stage: tx.category_name,
          amount: tx.amount,
          currency: tx.currency,
          amountMYR: tx.amount_myr,
          accountType: tx.account_type,
          remark: tx.remark_2 || '',
        })),
    };
    exportProjectToPDF(exportData);
    toast.success(t('pf.pdfExported'));
  };

  const handleExportExcel = () => {
    const lang = (language === 'zh' || language === 'en') ? language : 'zh';
    const exportData: ProjectFinancialData = {
      projectName: project.project_name,
      projectCode: project.project_code,
      customerName: project.customer_name || '',
      contractAmount: project.contract_amount,
      contractCurrency: project.contract_currency,
      contractAmountMYR: project.contract_amount_myr,
      totalIncome: receivableTotal,
      totalExpense: expenseTotal,
      netProfit: netProfit,
      totalAddition: additionsTotal,
      totalReceived: totalReceived,
      pendingAmount: pendingAmount,
      language: lang,
      expenses: transactions
        .filter(tx => tx.type === 'expense')
        .map(tx => ({
          date: tx.transaction_date,
          category: tx.category_name,
          description: tx.summary,
          amount: tx.amount,
          currency: tx.currency,
          amountMYR: tx.amount_myr,
          accountType: tx.account_type,
          remark: tx.remark_2 || '',
        })),
      payments: transactions
        .filter(tx => tx.type === 'income')
        .map(tx => ({
          date: tx.transaction_date,
          stage: tx.category_name,
          amount: tx.amount,
          currency: tx.currency,
          amountMYR: tx.amount_myr,
          accountType: tx.account_type,
          remark: tx.remark_2 || '',
        })),
    };
    exportProjectToExcel(exportData);
    toast.success(t('pf.excelExported'));
  };

  const handleViewInTransactions = (addition: Addition) => {
    navigate(`/transactions?search=${encodeURIComponent(addition.description)}`);
  };

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/projects')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="font-mono">{project.project_code}</span>
                <span>-</span>
                <span>{project.project_name}</span>
              </h1>
              <p className="text-muted-foreground">{t('projects.transactionDetails')}</p>
            </div>
          </div>
          {hasPermission('feature.export') && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                Excel
              </Button>
            </div>
          )}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-muted">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">{t('projects.totalAmount')}</div>
              <div className="text-xl font-bold">{formatCurrency(receivableTotal)}</div>
              <div className="text-xs text-muted-foreground">{t('projects.totalAmountNote')}</div>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                {t('projects.received')}
              </div>
              <div className="text-xl font-bold text-success">{formatCurrency(totalReceived)}</div>
              <div className="text-xs text-muted-foreground">
                {receivableTotal > 0 ? ((totalReceived / receivableTotal) * 100).toFixed(1) : 0}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">{t('projects.expense')}</div>
              <div className="text-xl font-bold text-destructive">{formatCurrency(expenseTotal)}</div>
            </CardContent>
          </Card>
          <Card className="bg-warning/5 border-warning/20">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">{t('projects.pending')}</div>
              <div className="text-xl font-bold text-warning">{formatCurrency(pendingAmount)}</div>
            </CardContent>
          </Card>
          <Card className={netProfit >= 0 ? 'bg-success/5 border-success/30' : 'bg-destructive/5 border-destructive/30'}>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">{t('projects.profit')}</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatCurrency(netProfit)}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('projects.profitMargin')}: {profitMargin.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 货币统计 */}
        <CurrencyStatsPanel 
          stats={currencyStats} 
          title={t('transactions.currencyStats')}
          showBalance={true}
        />

        {/* 明细 Tabs */}
        <Card>
          <Tabs defaultValue="transactions" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactions">
                  {t('projects.transactionDetails')} ({hasAnyFilter ? `${filteredTransactions.length}/${transactions.length}` : transactions.length})
                </TabsTrigger>
                <TabsTrigger value="additions">{t('projects.additionDetails')} ({additions.length})</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="transactions" className="mt-0">
                {/* Search & Filter Bar */}
                <div className="mb-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder={t('projectFinancials.searchPlaceholder')}
                        className="pl-9 pr-8"
                      />
                      {searchKeyword && (
                        <button
                          onClick={() => setSearchKeyword('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {isMobile && (
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0 relative"
                          onClick={() => setShowFilters(!showFilters)}
                        >
                          <Filter className="w-4 h-4" />
                          {activeFilterCount > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                              {activeFilterCount}
                            </Badge>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>

                  <Collapsible open={showFilters || !isMobile}>
                    <CollapsibleContent>
                      <div className="flex flex-col md:flex-row gap-2 md:items-center">
                        {/* Type filter buttons */}
                        <div className="flex gap-1">
                          {(['all', 'income', 'expense'] as const).map((type) => (
                            <Button
                              key={type}
                              size="sm"
                              variant={typeFilter === type ? 'default' : 'outline'}
                              onClick={() => setTypeFilter(type)}
                              className="text-xs h-8"
                            >
                              {type === 'all' ? t('common.all') : type === 'income' ? t('transactions.income') : t('transactions.expense')}
                            </Button>
                          ))}
                        </div>

                        {/* Date range */}
                        <div className="flex items-center gap-2 flex-1">
                          <DateInput
                            value={dateFrom}
                            onChange={setDateFrom}
                            placeholder={t('common.startDate')}
                            className="h-8 text-xs"
                          />
                          <span className="text-muted-foreground text-sm">~</span>
                          <DateInput
                            value={dateTo}
                            onChange={setDateTo}
                            placeholder={t('common.endDate')}
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Reset button */}
                        {hasAnyFilter && (
                          <Button size="sm" variant="ghost" onClick={handleResetFilters} className="h-8 text-xs shrink-0">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            {t('projectFinancials.reset')}
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <ProjectTransactionList
                  transactions={filteredTransactions}
                  onRefresh={invalidateProjectData}
                />
              </TabsContent>

              <TabsContent value="additions" className="mt-0">
                {canEdit && (
                  <div className="flex justify-end mb-4">
                    <Button size="sm" onClick={() => { setEditingAddition(null); setAdditionFormOpen(true); }}>
                      <Plus className="w-4 h-4 mr-1" />
                      {t('projectFinancials.addAddition')}
                    </Button>
                  </div>
                )}
                {additions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">{t('common.noData')}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead>{t('transactions.summary')}</TableHead>
                        <TableHead className="text-right">{t('common.amount')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {additions.map((addition, index) => (
                        <TableRow key={addition.id}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>{addition.addition_date}</TableCell>
                          <TableCell>{addition.description}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(addition.amount, addition.currency)}
                          </TableCell>
                          <TableCell>
                            {addition.is_paid ? (
                              <Badge variant="default" className="bg-success text-white hover:bg-success">
                                <Check className="w-3 h-3 mr-1" />
                                {t('projectFinancials.paid')}
                              </Badge>
                            ) : canEdit ? (
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer hover:bg-primary/10"
                                onClick={() => setConfirmPaymentId(addition.id)}
                              >
                                {t('projectFinancials.unpaid')}
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                {t('projectFinancials.unpaid')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {addition.is_paid && (
                                  <DropdownMenuItem onClick={() => handleViewInTransactions(addition)}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    {t('projectFinancials.viewInTransactions')}
                                  </DropdownMenuItem>
                                )}
                                {canEdit && (
                                  <>
                                    <DropdownMenuItem onClick={() => { setEditingAddition(addition); setAdditionFormOpen(true); }}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      {t('common.edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive" 
                                      onClick={() => handleDeleteAddition(addition.id)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      {t('common.delete')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* 增项表单 */}
      <ProjectAdditionForm
        open={additionFormOpen}
        onOpenChange={setAdditionFormOpen}
        projectId={project.id}
        addition={editingAddition}
        onSuccess={() => { setAdditionFormOpen(false); setEditingAddition(null); invalidateProjectData(); }}
      />

      {/* 确认收款对话框 */}
      <AlertDialog open={!!confirmPaymentId} onOpenChange={() => setConfirmPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('alerts.confirmPayment')}</AlertDialogTitle>
            <AlertDialogDescription>{t('alerts.confirmPaymentDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmPaymentId && handleQuickMarkPaid(confirmPaymentId)}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
