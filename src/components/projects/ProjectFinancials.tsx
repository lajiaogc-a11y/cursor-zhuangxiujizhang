import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projectsService } from '@/services';
import { toast } from 'sonner';
import { Plus, TrendingUp, TrendingDown, CreditCard, FileText, FileSpreadsheet, ArrowUpRight, ArrowDownRight, MoreHorizontal, Edit, Trash2, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProjectAdditionForm } from './ProjectAdditionForm';
import { ProjectTransactionList } from './ProjectTransactionList';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { exportProjectToPDF, exportProjectToExcel, type ProjectFinancialData } from '@/lib/exportUtils';
import { useI18n } from '@/lib/i18n';
import { CurrencyStatsPanel, calculateCurrencyStats } from '@/components/ui/currency-stats-panel';
import { useAuth } from '@/lib/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { ChevronDown } from 'lucide-react';

interface Project {
  id: string;
  project_code: string;
  project_name: string;
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

interface ProjectFinancialsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onRefresh?: () => void;
}

export function ProjectFinancials({ open, onOpenChange, project, onRefresh }: ProjectFinancialsProps) {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const canExport = hasPermission('feature.export');
  const canEdit = hasPermission('feature.edit');
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [additions, setAdditions] = useState<Addition[]>([]);
  const [loading, setLoading] = useState(true);
  const [additionFormOpen, setAdditionFormOpen] = useState(false);
  const [editingAddition, setEditingAddition] = useState<Addition | null>(null);
  const [projectData, setProjectData] = useState<Project | null>(project);
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);

  const handleViewInTransactions = (addition: Addition) => {
    onOpenChange(false);
    navigate(`/transactions?search=${encodeURIComponent(addition.description)}`);
  };

  const fetchData = async () => {
    if (!project) return;
    setLoading(true);
    
    const result = await projectsService.fetchProjectFinancialsDetail(project.id);
    setTransactions(result.transactions);
    setAdditions(result.additions);
    if (result.projectData) setProjectData(result.projectData);
    setLoading(false);
  };

  useEffect(() => {
    if (open && project) {
      fetchData();
    }
  }, [open, project]);

  const handleDeleteAddition = async (id: string) => {
    if (!confirm(t('toast.deleteConfirm'))) return;
    try {
      await projectsService.deleteProjectAddition(id);
      toast.success(t('toast.additionDeleted'));
      fetchData();
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || t('toast.deleteFailed'));
    }
  };



  const formatCurrency = (amount: number | null, currency: string = 'MYR') => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    return `${symbols[currency] || ''}${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!project || !projectData) return null;

  const contractTotal = projectData.contract_amount_myr || 0;
  const additionsTotal = projectData.total_addition_myr || 0;
  const receivableTotal = contractTotal + additionsTotal;
  
  const totalReceived = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount_myr, 0);
  const expenseTotal = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount_myr, 0);
  
  const additionsPaidTotal = additions
    .filter(a => a.is_paid)
    .reduce((sum, a) => sum + a.amount_myr, 0);
  
  const pendingAmount = (contractTotal === 0 && additionsTotal === 0) ? 0 : Math.max(0, receivableTotal - totalReceived);
  const netProfit = totalReceived - expenseTotal;
  const profitMargin = totalReceived > 0 ? (netProfit / totalReceived) * 100 : 0;

  const handleQuickMarkPaid = async (additionId: string) => {
    try {
      await projectsService.markAdditionAsPaid(additionId);
      toast.success(t('toast.markedAsPaid'));
      fetchData();
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || t('toast.operationFailed'));
    } finally {
      setConfirmPaymentId(null);
    }
  };

  const handleExportPDF = () => {
    const exportData: ProjectFinancialData = {
      projectName: projectData.project_name,
      projectCode: projectData.project_code,
      customerName: (projectData as any).customer_name || '',
      contractAmount: projectData.contract_amount,
      contractCurrency: projectData.contract_currency,
      contractAmountMYR: projectData.contract_amount_myr,
      totalIncome: receivableTotal,
      totalExpense: expenseTotal,
      netProfit: netProfit,
      totalAddition: additionsTotal,
      totalReceived: totalReceived,
      pendingAmount: pendingAmount,
      expenses: transactions
        .filter(tx => tx.type === 'expense')
        .map(tx => ({
          date: tx.transaction_date, category: tx.category_name, description: tx.summary,
          amount: tx.amount, currency: tx.currency, amountMYR: tx.amount_myr,
          accountType: tx.account_type, remark: tx.remark_2 || '',
        })),
      payments: transactions
        .filter(tx => tx.type === 'income')
        .map(tx => ({
          date: tx.transaction_date, stage: tx.category_name, amount: tx.amount,
          currency: tx.currency, amountMYR: tx.amount_myr, accountType: tx.account_type,
          remark: tx.remark_2 || '',
        })),
    };
    exportProjectToPDF(exportData);
    toast.success(t('pf.pdfExported'));
  };

  const handleExportExcel = () => {
    const exportData: ProjectFinancialData = {
      projectName: projectData.project_name,
      projectCode: projectData.project_code,
      customerName: (projectData as any).customer_name || '',
      contractAmount: projectData.contract_amount,
      contractCurrency: projectData.contract_currency,
      contractAmountMYR: projectData.contract_amount_myr,
      totalIncome: receivableTotal,
      totalExpense: expenseTotal,
      netProfit: netProfit,
      totalAddition: additionsTotal,
      totalReceived: totalReceived,
      pendingAmount: pendingAmount,
      expenses: transactions
        .filter(tx => tx.type === 'expense')
        .map(tx => ({
          date: tx.transaction_date, category: tx.category_name, description: tx.summary,
          amount: tx.amount, currency: tx.currency, amountMYR: tx.amount_myr,
          accountType: tx.account_type, remark: tx.remark_2 || '',
        })),
      payments: transactions
        .filter(tx => tx.type === 'income')
        .map(tx => ({
          date: tx.transaction_date, stage: tx.category_name, amount: tx.amount,
          currency: tx.currency, amountMYR: tx.amount_myr, accountType: tx.account_type,
          remark: tx.remark_2 || '',
        })),
    };
    exportProjectToExcel(exportData);
    toast.success(t('pf.excelExported'));
  };

  const incomeTransactions = transactions.filter(tx => tx.type === 'income');
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');

  const currencyStats = calculateCurrencyStats(transactions.map(tx => ({
    type: tx.type, currency: tx.currency, account_type: tx.account_type, amount: tx.amount,
  })));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden p-3 sm:p-6">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <DialogTitle className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm sm:text-lg">
                <span className="font-mono">{projectData.project_code}</span>
                <span>-</span>
                <span>{projectData.project_name}</span>
                <span className="text-muted-foreground text-xs sm:text-base">{t('pf.financialDetail')}</span>
              </DialogTitle>
              {canExport && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <FileText className="w-4 h-4 mr-1" />PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-1" />Excel
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="stats" className="mt-4 flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="stats">{t('pf.projectStats')}</TabsTrigger>
              <TabsTrigger value="transactions">{t('pf.transactionDetails')} ({transactions.length})</TabsTrigger>
              <TabsTrigger value="additions">{t('pf.additionDetails')} ({additions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="mt-4 flex-1 overflow-y-auto space-y-4">
              <CurrencyStatsPanel 
                stats={currencyStats} 
                title={t('projectFinancials.currencyStats')}
                showBalance={true}
              />

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="bg-muted">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">{t('pf.receivableTotal')}</div>
                    <div className="text-lg font-bold">{formatCurrency(receivableTotal)}</div>
                    <div className="text-xs text-muted-foreground">{t('pf.contractPlusAdditions')}</div>
                  </CardContent>
                </Card>
                <Card className="bg-success/5 border-success/20">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {t('pf.received')}
                    </div>
                    <div className="text-lg font-bold text-success">{formatCurrency(totalReceived)}</div>
                    <div className="text-xs text-muted-foreground">
                      {receivableTotal > 0 ? ((totalReceived / receivableTotal) * 100).toFixed(1) : 0}%
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-destructive/5 border-destructive/20">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">{t('pf.spent')}</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(expenseTotal)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-warning/5 border-warning/20">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">{t('pf.pendingPayment')}</div>
                    <div className="text-lg font-bold text-warning">{formatCurrency(pendingAmount)}</div>
                  </CardContent>
                </Card>
                <Card className={netProfit >= 0 ? 'bg-success/5 border-success/30' : 'bg-destructive/5 border-destructive/30'}>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">{t('pf.netProfit')}</div>
                    <div className={`text-lg font-bold flex items-center gap-1 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {formatCurrency(netProfit)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('pf.profitRate')}: {profitMargin.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="mt-4 flex-1 overflow-y-auto">
              {loading ? (
                <AppSectionLoading label={t('common.loading')} compact />
              ) : (
                <ProjectTransactionList
                  transactions={transactions}
                  onRefresh={() => { fetchData(); onRefresh?.(); }}
                />
              )}
            </TabsContent>

            <TabsContent value="additions" className="mt-4 flex-1 overflow-y-auto">
              <div className="flex justify-end mb-3">
                <Button size="sm" onClick={() => { setEditingAddition(null); setAdditionFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('projectFinancials.addAddition')}
                </Button>
              </div>
              {loading ? (
                <AppSectionLoading label={t('common.loading')} compact />
              ) : additions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('projectFinancials.noAdditions')}</div>
              ) : (
                isMobile ? (
                  <div className="space-y-2">
                    {additions.map((addition) => (
                      <Card key={addition.id} className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{addition.addition_date}</span>
                          <Badge variant={addition.is_paid ? 'default' : 'outline'} className="text-[10px]">
                            {addition.is_paid ? t('pf.paid') : t('pf.unpaid')}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{addition.description}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-semibold">{formatCurrency(addition.amount, addition.currency)}</span>
                          {addition.currency !== 'MYR' && (
                            <span className="text-xs text-muted-foreground">≈ {formatCurrency(addition.amount_myr)}</span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {!addition.is_paid && (
                            <Button size="sm" variant="outline" className="text-xs text-success flex-1" onClick={() => setConfirmPaymentId(addition.id)}>
                              <Check className="w-3 h-3 mr-1" />{t('pf.confirmCollection')}
                            </Button>
                          )}
                          {addition.is_paid && (
                            <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => handleViewInTransactions(addition)}>
                              <ExternalLink className="w-3 h-3 mr-1" />{t('pf.viewDetail')}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => { setEditingAddition(addition); setAdditionFormOpen(true); }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => handleDeleteAddition(addition.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('pf.additionsDate')}</TableHead>
                          <TableHead>{t('pf.additionsDesc')}</TableHead>
                          <TableHead className="text-right">{t('pf.additionsAmount')}</TableHead>
                          <TableHead>{t('pf.additionsStatus')}</TableHead>
                          <TableHead className="text-right">{t('pf.additionsActions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {additions.map((addition) => (
                          <TableRow key={addition.id}>
                            <TableCell>{addition.addition_date}</TableCell>
                            <TableCell>{addition.description}</TableCell>
                            <TableCell className="text-right">
                              <div>{formatCurrency(addition.amount, addition.currency)}</div>
                              {addition.currency !== 'MYR' && (
                                <div className="text-xs text-muted-foreground">≈ {formatCurrency(addition.amount_myr)}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={addition.is_paid ? 'default' : 'outline'}>
                                  {addition.is_paid ? t('pf.paid') : t('pf.unpaid')}
                                </Badge>
                                {addition.is_paid && (
                                  <span className="text-xs text-muted-foreground">{t('pf.syncedToTx')}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!addition.is_paid && (
                                  <Button size="sm" variant="ghost" className="text-success hover:bg-success/10" onClick={() => setConfirmPaymentId(addition.id)} title={t('pf.markAsPaid')}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                )}
                                {addition.is_paid && (
                                  <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => handleViewInTransactions(addition)} title={t('pf.viewTransactionDetails')}>
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-background">
                                    {!addition.is_paid && (
                                      <DropdownMenuItem className="text-success" onClick={() => setConfirmPaymentId(addition.id)}>
                                        <Check className="w-4 h-4 mr-2" />{t('pf.confirmCollection')}
                                      </DropdownMenuItem>
                                    )}
                                    {addition.is_paid && (
                                      <DropdownMenuItem onClick={() => handleViewInTransactions(addition)}>
                                        <ExternalLink className="w-4 h-4 mr-2" />{t('projectFinancials.viewInTransactions')}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => { setEditingAddition(addition); setAdditionFormOpen(true); }}>
                                      <Edit className="w-4 h-4 mr-2" />{t('common.edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAddition(addition.id)}>
                                      <Trash2 className="w-4 h-4 mr-2" />{t('common.delete')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ProjectAdditionForm
        open={additionFormOpen}
        onOpenChange={setAdditionFormOpen}
        projectId={project.id}
        addition={editingAddition}
        onSuccess={() => { fetchData(); onRefresh?.(); }}
      />

      <AlertDialog open={!!confirmPaymentId} onOpenChange={() => setConfirmPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projectFinancials.confirmPayment')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projectFinancials.confirmPaymentDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmPaymentId && handleQuickMarkPaid(confirmPaymentId)}
              className="bg-success hover:bg-success/90"
            >
              {t('projectFinancials.confirmPayment')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
