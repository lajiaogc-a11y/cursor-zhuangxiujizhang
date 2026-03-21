import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Eye, CreditCard, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { deletePayable } from '@/services/payables.service';
import { toast } from 'sonner';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useResponsive } from '@/hooks/useResponsive';

interface PayableListProps {
  payables: any[];
  projects: any[];
  onEdit: (payable: any) => void;
  onAddPayment: (payable: any) => void;
  onViewDetail: (payable: any) => void;
  onRefresh: () => void;
}

const formatCurrency = (amount: number, currency: string = 'MYR') => {
  const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
  return `${symbols[currency] || ''}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function PayableList({ payables, projects, onEdit, onAddPayment, onViewDetail, onRefresh }: PayableListProps) {
  const { t } = useI18n();
  const { isMobile, isTablet } = useResponsive();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('feature.edit');
  const { sortConfig, requestSort, sortData } = useSortableTable<any>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_code]));

  const getSortValue = (item: any, key: string) => {
    switch (key) {
      case 'total_amount': return Number(item.total_amount);
      case 'paid_amount': return Number(item.paid_amount);
      case 'unpaid_amount': return Number(item.unpaid_amount);
      default: return item[key];
    }
  };

  const sorted = sortData(payables, getSortValue);

  const handleDelete = async (id: string) => {
    try {
      await deletePayable(id);
      toast.success(t('common.deleteSuccess'));
      onRefresh();
    } catch {
      toast.error(t('common.deleteFailed'));
    }
  };

  const isReceivable = (p: any) => (p.record_type || 'payable') === 'receivable';

  const typeBadge = (p: any) => {
    if (isReceivable(p)) {
      return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">{t('payables.receivable')}</Badge>;
    }
    return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">{t('payables.payable')}</Badge>;
  };

  const statusBadge = (p: any) => {
    const status = p.status;
    const variant = status === 'paid' ? 'default' : status === 'partial' ? 'secondary' : 'destructive';
    if (isReceivable(p)) {
      const label = status === 'paid' ? t('payables.receivablePaid') : status === 'partial' ? t('payables.receivablePartial') : t('payables.receivablePending');
      return <Badge variant={variant as any}>{label}</Badge>;
    }
    return <Badge variant={variant as any}>{t(`payables.${status}`)}</Badge>;
  };

  const counterpartyLabel = (p: any) => isReceivable(p) ? t('payables.customerName') : t('payables.supplierName');
  const addPaymentLabel = (p: any) => isReceivable(p) ? t('payables.addCollection') : t('payables.addPayment');
  const paidLabel = (p: any) => isReceivable(p) ? t('payables.totalReceived') : t('payables.paidAmount');
  const unpaidLabel = (p: any) => isReceivable(p) ? t('payables.totalUnreceived') : t('payables.unpaidAmount');

  if (sorted.length === 0) {
    return <div className="text-center text-muted-foreground py-8">{t('payables.noPayables')}</div>;
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-3 p-3">
        {sorted.map(p => {
          const isOverdue = p.due_date && p.status !== 'paid' && new Date(p.due_date) < new Date();
          const isExpanded = expandedId === p.id;

          return (
            <Card
              key={p.id}
              className={`p-3 cursor-pointer active:bg-muted/30 transition-colors ${isOverdue ? 'border-destructive/30 bg-destructive/5' : ''}`}
              onClick={() => setExpandedId(isExpanded ? null : p.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm truncate flex-1 min-w-0">{p.supplier_name}</span>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {typeBadge(p)}
                  {statusBadge(p)}
                  {isOverdue && <Badge variant="destructive" className="text-[10px]">{t('payables.overdue')}</Badge>}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              <div className="text-xs text-muted-foreground truncate mb-2">{p.description}</div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground">{t('payables.totalAmount')}</div>
                  <div className="text-xs font-semibold">{formatCurrency(p.total_amount, p.currency)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">{paidLabel(p)}</div>
                  <div className="text-xs font-semibold text-success">{formatCurrency(p.paid_amount, p.currency)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">{unpaidLabel(p)}</div>
                  <div className="text-xs font-semibold text-destructive">{formatCurrency(p.unpaid_amount, p.currency)}</div>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-2" onClick={e => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">{t('common.date')}: </span>{p.payable_date}</div>
                    <div><span className="text-muted-foreground">{t('payables.dueDate')}: </span>{p.due_date || '-'}</div>
                    <div><span className="text-muted-foreground">{t('transactions.currency')}: </span>{p.currency}</div>
                    <div><span className="text-muted-foreground">{t('payables.project')}: </span>{p.project_id ? projectMap[p.project_id] || '-' : '-'}</div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onViewDetail(p)}>
                      <Eye className="w-3 h-3 mr-1" />{t('common.view')}
                    </Button>
                    {canEdit && p.status !== 'paid' && (
                      <Button variant="outline" size="sm" className="flex-1 text-xs text-primary" onClick={() => onAddPayment(p)}>
                        <CreditCard className="w-3 h-3 mr-1" />{addPaymentLabel(p)}
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => onEdit(p)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                    {canEdit && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id)}>{t('common.confirm')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  // Tablet compact table view
  if (isTablet) {
    return (
      <div className="overflow-x-auto">
        <Table compact>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="supplier_name" sortConfig={sortConfig} onSort={requestSort} className="sticky left-0 z-10 bg-card">{t('payables.counterparty')}</SortableTableHead>
              <SortableTableHead sortKey="total_amount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payables.totalAmount')}</SortableTableHead>
              <SortableTableHead sortKey="paid_amount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payables.paidAmount')}</SortableTableHead>
              <SortableTableHead sortKey="unpaid_amount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payables.unpaidAmount')}</SortableTableHead>
              <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort}>{t('payables.status')}</SortableTableHead>
              <TableHead>{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(p => {
              const isOverdue = p.due_date && p.status !== 'paid' && new Date(p.due_date) < new Date();
              return (
                <TableRow key={p.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium max-w-[120px] truncate">{p.supplier_name}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.total_amount, p.currency)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-success">{formatCurrency(p.paid_amount, p.currency)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-destructive font-medium">{formatCurrency(p.unpaid_amount, p.currency)}</TableCell>
                  <TableCell>
                    {statusBadge(p)}
                    {isOverdue && <Badge variant="destructive" className="ml-1 text-[10px]">{t('payables.overdue')}</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewDetail(p)}><Eye className="w-3.5 h-3.5" /></Button>
                      {canEdit && p.status !== 'paid' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => onAddPayment(p)}><CreditCard className="w-3.5 h-3.5" /></Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('payables.recordType')}</TableHead>
            <SortableTableHead sortKey="payable_date" sortConfig={sortConfig} onSort={requestSort}>{t('common.date')}</SortableTableHead>
            <SortableTableHead sortKey="supplier_name" sortConfig={sortConfig} onSort={requestSort}>{t('payables.counterparty')}</SortableTableHead>
            <SortableTableHead sortKey="description" sortConfig={sortConfig} onSort={requestSort}>{t('payables.description')}</SortableTableHead>
            <SortableTableHead sortKey="total_amount" sortConfig={sortConfig} onSort={requestSort}>{t('payables.totalAmount')}</SortableTableHead>
            <SortableTableHead sortKey="paid_amount" sortConfig={sortConfig} onSort={requestSort}>{t('payables.paidAmount')}</SortableTableHead>
            <SortableTableHead sortKey="unpaid_amount" sortConfig={sortConfig} onSort={requestSort}>{t('payables.unpaidAmount')}</SortableTableHead>
            <TableHead>{t('transactions.currency')}</TableHead>
            <TableHead>{t('payables.project')}</TableHead>
            <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort}>{t('payables.status')}</SortableTableHead>
            <SortableTableHead sortKey="due_date" sortConfig={sortConfig} onSort={requestSort}>{t('payables.dueDate')}</SortableTableHead>
            <TableHead>{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(p => {
            const isOverdue = p.due_date && p.status !== 'paid' && new Date(p.due_date) < new Date();
            return (
              <TableRow key={p.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                <TableCell>{typeBadge(p)}</TableCell>
                <TableCell className="whitespace-nowrap">{p.payable_date}</TableCell>
                <TableCell className="max-w-[120px] truncate">{p.supplier_name}</TableCell>
                <TableCell className="max-w-[150px] truncate">{p.description}</TableCell>
                <TableCell className="whitespace-nowrap">{formatCurrency(p.total_amount, p.currency)}</TableCell>
                <TableCell className="whitespace-nowrap text-success">{formatCurrency(p.paid_amount, p.currency)}</TableCell>
                <TableCell className="whitespace-nowrap text-destructive font-medium">{formatCurrency(p.unpaid_amount, p.currency)}</TableCell>
                <TableCell>{p.currency}</TableCell>
                <TableCell>{p.project_id ? projectMap[p.project_id] || '-' : '-'}</TableCell>
                <TableCell>
                  {statusBadge(p)}
                  {isOverdue && <Badge variant="destructive" className="ml-1 text-[10px]">{t('payables.overdue')}</Badge>}
                </TableCell>
                <TableCell className="whitespace-nowrap">{p.due_date || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewDetail(p)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {canEdit && p.status !== 'paid' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => onAddPayment(p)} title={addPaymentLabel(p)}>
                        <CreditCard className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canEdit && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id)}>{t('common.confirm')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
