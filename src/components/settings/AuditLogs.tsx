import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, Search, RotateCcw, Eye, User, 
  Calendar, Clock, FileText, ArrowRight, AlertTriangle
} from 'lucide-react';
import { settingsService } from '@/services';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import type { Json } from '@/integrations/supabase/types';
import { useI18n } from '@/lib/i18n';

interface AuditLog {
  id: string;
  user_id: string | null;
  table_name: string | null;
  table_display_name: string | null;
  action: string;
  action_display: string | null;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  created_at: string;
  restored_at: string | null;
  restored_by: string | null;
  profiles?: {
    username: string;
    display_name: string | null;
  } | null;
}

interface FilterState {
  table: string;
  action: string;
  search: string;
  dateRange: string;
}

export function AuditLogs() {
  const { t, language } = useI18n();

  const TABLE_OPTIONS = [
    { value: 'all', label: t('audit.allTables') },
    // Finance
    { value: 'projects', label: t('nav.projects') },
    { value: 'project_expenses', label: t('audit.tbl.projectExpenses') },
    { value: 'project_additions', label: t('audit.tbl.projectAdditions') },
    { value: 'project_payments', label: t('audit.tbl.projectPayments') },
    { value: 'transactions', label: t('nav.transactions') },
    { value: 'exchange_transactions', label: t('nav.exchange') },
    { value: 'payables', label: t('nav.payables') },
    { value: 'payable_payments', label: t('audit.tbl.payablePayments') },
    { value: 'bank_statements', label: t('audit.tbl.bankStatements') },
    { value: 'bank_import_batches', label: t('audit.tbl.importBatches') },
    { value: 'company_accounts', label: t('audit.tbl.companyAccounts') },
    { value: 'transaction_categories', label: t('audit.tbl.categories') },
    { value: 'project_categories', label: t('audit.tbl.projectCategories') },
    // Quotation
    { value: 'q_quotations', label: t('audit.tbl.quotations') },
    { value: 'q_products', label: t('audit.tbl.products') },
    { value: 'q_customers', label: t('audit.tbl.customers') },
    { value: 'q_product_categories', label: t('audit.tbl.productCategories') },
    // Cost Control
    { value: 'q_project_breakdowns', label: t('audit.tbl.projectBreakdowns') },
    { value: 'q_breakdown_items', label: t('audit.tbl.breakdownItems') },
    { value: 'q_methods', label: t('audit.tbl.methods') },
    { value: 'q_worker_types', label: t('audit.tbl.workerTypes') },
    { value: 'q_labor_rates', label: t('audit.tbl.laborRates') },
    // Purchasing
    { value: 'q_purchase_orders', label: t('audit.tbl.purchaseOrders') },
    { value: 'q_purchase_order_items', label: t('audit.tbl.poItems') },
    { value: 'q_suppliers', label: t('audit.tbl.suppliers') },
    { value: 'q_materials', label: t('audit.tbl.materials') },
    { value: 'q_inventory', label: t('audit.tbl.inventory') },
  ];

  const ACTION_OPTIONS = [
    { value: 'all', label: t('audit.allActions') },
    { value: 'INSERT', label: t('audit.insert') },
    { value: 'UPDATE', label: t('audit.update') },
    { value: 'DELETE', label: t('audit.delete') },
  ];

  const DATE_RANGE_OPTIONS = [
    { value: 'all', label: t('audit.allTime') },
    { value: 'today', label: t('audit.today') },
    { value: 'week', label: t('audit.week') },
    { value: 'month', label: t('audit.month') },
  ];

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    table: 'all',
    action: 'all',
    search: '',
    dateRange: 'week',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await settingsService.fetchAuditLogs({
        table: filters.table,
        action: filters.action,
        dateRange: filters.dateRange as any,
      });

      const userIds = [...new Set(data.map((log: any) => log.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        const profileMap = await settingsService.fetchProfilesByUserIds(userIds as string[]);
        const logsWithProfiles = data.map((log: any) => ({
          ...log,
          profiles: log.user_id ? profileMap.get(log.user_id) || null : null,
        }));
        setLogs(logsWithProfiles);
      } else {
        setLogs(data);
      }
    } catch (error: any) {
      toast({ title: t('audit.fetchFailed'), description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [filters.table, filters.action, filters.dateRange]);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  const getActionLabel = (log: AuditLog) => {
    return log.action_display || (
      log.action === 'INSERT' ? t('audit.insert') : 
      log.action === 'UPDATE' ? t('audit.update') : 
      log.action === 'DELETE' ? t('audit.delete') : log.action
    );
  };

  const getTableLabel = (log: AuditLog) => {
    return log.table_display_name || 
      TABLE_OPTIONS.find(t => t.value === log.table_name)?.label || 
      log.table_name || t('common.unknown');
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? t('audit.boolYes') : t('audit.boolNo');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getChangedFields = (oldData: Json | null, newData: Json | null) => {
    if (!oldData || !newData || typeof oldData !== 'object' || typeof newData !== 'object' || Array.isArray(oldData) || Array.isArray(newData)) return [];
    
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    const oldObj = oldData as Record<string, Json>;
    const newObj = newData as Record<string, Json>;
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    
    allKeys.forEach(key => {
      // Skip system fields
      if (['updated_at', 'created_at'].includes(key)) return;
      
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, oldValue: oldVal, newValue: newVal });
      }
    });
    
    return changes;
  };

  const handleRestore = async () => {
    if (!selectedLog || !selectedLog.old_data || !selectedLog.record_id || !selectedLog.table_name) {
      toast({ title: t('audit.restoreFailed'), description: t('audit.missingData'), variant: 'destructive' });
      return;
    }

    if (typeof selectedLog.old_data !== 'object' || Array.isArray(selectedLog.old_data)) {
      toast({ title: t('audit.restoreFailed'), description: t('audit.invalidFormat'), variant: 'destructive' });
      return;
    }

    setRestoring(true);

    try {
      const oldDataObj = selectedLog.old_data as Record<string, any>;
      const { id, created_at, updated_at, ...restoreData } = oldDataObj;
      
      await settingsService.restoreAuditLog(
        selectedLog.table_name!,
        selectedLog.record_id!,
        restoreData,
        selectedLog.id
      );

      toast({ title: t('audit.restoreSuccess'), description: t('audit.restoreSuccessDesc') });
      setRestoreDialogOpen(false);
      setSelectedLog(null);
      fetchLogs();
    } catch (error: any) {
      toast({ title: t('audit.restoreFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setRestoring(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    const recordData = JSON.stringify(log.new_data || log.old_data || {}).toLowerCase();
    const username = log.profiles?.display_name?.toLowerCase() || log.profiles?.username?.toLowerCase() || '';
    return recordData.includes(searchLower) || username.includes(searchLower);
  });

  const FIELD_LABELS: Record<string, string> = {
    project_name: t('audit.field.projectName'),
    project_code: t('audit.field.projectCode'),
    customer_name: t('audit.field.customerName'),
    contract_amount: t('audit.field.contractAmount'),
    contract_amount_myr: t('audit.field.contractAmountMyr'),
    amount: t('audit.field.amount'),
    amount_myr: t('audit.field.amountMyr'),
    description: t('audit.field.description'),
    category: t('audit.field.category'),
    status: t('common.status'),
    remark: t('common.remark'),
    exchange_rate: t('audit.field.exchangeRate'),
    transaction_date: t('audit.field.transactionDate'),
    payment_date: t('audit.field.paymentDate'),
    expense_date: t('audit.field.expenseDate'),
    addition_date: t('audit.field.additionDate'),
    currency: t('audit.field.currency'),
    account_type: t('audit.field.accountType'),
    type: t('audit.field.type'),
    summary: t('audit.field.summary'),
    category_name: t('audit.field.categoryName'),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          {t('settings.audit')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('audit.searchPlaceholder')}
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="pl-10"
            />
          </div>
          <Select value={filters.table} onValueChange={v => setFilters(f => ({ ...f, table: v }))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.action} onValueChange={v => setFilters(f => ({ ...f, action: v }))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.dateRange} onValueChange={v => setFilters(f => ({ ...f, dateRange: v }))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchLogs}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>

        {/* Logs List */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('audit.noLogs')}</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map(log => (
                  <div 
                    key={log.id} 
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedLog(log);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getActionBadgeVariant(log.action) as any}>
                            {getActionLabel(log)}
                          </Badge>
                          <span className="font-medium">{getTableLabel(log)}</span>
                          {log.restored_at && (
                            <Badge variant="outline" className="text-success border-success">
                              <RotateCcw className="w-3 h-3 mr-1" />
                              {t('audit.restored')}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {log.action === 'UPDATE' && log.old_data && log.new_data && (
                            <span>
                              {t('audit.modifiedFields').replace('{count}', String(getChangedFields(log.old_data, log.new_data).length))}
                            </span>
                          )}
                          {log.action === 'INSERT' && log.new_data && typeof log.new_data === 'object' && !Array.isArray(log.new_data) && (
                            <span className="truncate block">
                              {(log.new_data as Record<string, any>).project_name || (log.new_data as Record<string, any>).description || (log.new_data as Record<string, any>).summary || t('audit.newRecord')}
                            </span>
                          )}
                          {log.action === 'DELETE' && log.old_data && typeof log.old_data === 'object' && !Array.isArray(log.old_data) && (
                            <span className="truncate block text-destructive">
                              {t('audit.deletedLabel')}: {(log.old_data as Record<string, any>).project_name || (log.old_data as Record<string, any>).description || (log.old_data as Record<string, any>).summary || t('audit.record')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1 justify-end">
                          <User className="w-3 h-3" />
                          {log.profiles?.display_name || log.profiles?.username || t('audit.system')}
                        </div>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.created_at), 'MM-dd HH:mm', { locale: language === 'zh' ? zhCN : enUS })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('audit.details')}
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <span className="text-sm text-muted-foreground">{t('audit.actionType')}</span>
                      <div className="mt-1">
                        <Badge variant={getActionBadgeVariant(selectedLog.action) as any}>
                          {getActionLabel(selectedLog)}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">{t('audit.table')}</span>
                      <p className="mt-1 font-medium">{getTableLabel(selectedLog)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">{t('audit.operator')}</span>
                      <p className="mt-1 font-medium">
                        {selectedLog.profiles?.display_name || selectedLog.profiles?.username || t('audit.system')}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">{t('audit.operationTime')}</span>
                      <p className="mt-1 font-medium">
                        {format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: language === 'zh' ? zhCN : enUS })}
                      </p>
                    </div>
                  </div>

                  {/* Changes */}
                  {selectedLog.action === 'UPDATE' && selectedLog.old_data && selectedLog.new_data && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        {t('audit.changeContent')}
                      </h4>
                      <div className="space-y-2">
                        {getChangedFields(selectedLog.old_data, selectedLog.new_data).map(change => (
                          <div key={change.field} className="p-3 border rounded-lg">
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              {FIELD_LABELS[change.field] || change.field}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-2 bg-destructive/10 rounded text-sm">
                                <span className="text-xs text-destructive block mb-1">{t('audit.before')}</span>
                                <span className="break-all">{formatValue(change.oldValue)}</span>
                              </div>
                              <div className="p-2 bg-success/10 rounded text-sm">
                                <span className="text-xs text-success block mb-1">{t('audit.after')}</span>
                                <span className="break-all">{formatValue(change.newValue)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Data (for INSERT) */}
                  {selectedLog.action === 'INSERT' && selectedLog.new_data && (
                    <div>
                      <h4 className="font-medium mb-3">{t('audit.newData')}</h4>
                      <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(selectedLog.new_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Old Data (for DELETE) */}
                  {selectedLog.action === 'DELETE' && selectedLog.old_data && (
                    <div>
                      <h4 className="font-medium mb-3 text-destructive">{t('audit.deletedData')}</h4>
                      <pre className="p-4 bg-destructive/10 rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(selectedLog.old_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Restore Button */}
                  {selectedLog.action === 'UPDATE' && 
                   selectedLog.old_data && 
                   selectedLog.record_id && 
                   !selectedLog.restored_at && (
                    <div className="pt-4 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setDetailDialogOpen(false);
                          setRestoreDialogOpen(true);
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t('audit.restoreToPrevious')}
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        {/* Restore Confirmation Dialog */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5" />
                {t('audit.confirmRestore')}
              </DialogTitle>
              <DialogDescription>
                {t('audit.restoreConfirmDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleRestore} disabled={restoring}>
                {restoring ? t('audit.restoring') : t('audit.confirmRestore')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}