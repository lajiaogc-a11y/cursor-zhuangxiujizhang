import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { deleteSalaryAdvance } from '@/services/payroll.service';
import { format } from 'date-fns';
import { useResponsive } from '@/hooks/useResponsive';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Employee { id: string; name: string; position: string | null; phone: string | null; monthly_salary: number; status: 'active' | 'inactive'; }
interface SalaryAdvance { id: string; employee_id: string; advance_date: string; amount: number; currency: string; account_type: string; exchange_rate: number; amount_myr: number; is_deducted: boolean; remark: string | null; employee?: Employee; }
interface AdvanceListProps { advances: SalaryAdvance[]; loading: boolean; onEdit: (advance: SalaryAdvance) => void; onRefresh: () => void; canEdit?: boolean; }

export function AdvanceList({ advances, loading, onEdit, onRefresh, canEdit = true }: AdvanceListProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { isMobile, isTablet } = useResponsive();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sortConfig, requestSort, sortData } = useSortableTable<SalaryAdvance>();

  const getSortValue = (adv: SalaryAdvance, key: string): any => {
    switch (key) {
      case 'date': return adv.advance_date;
      case 'employee': return adv.employee?.name;
      case 'amount': return adv.amount_myr;
      case 'account': return adv.account_type;
      case 'status': return adv.is_deducted ? 1 : 0;
      default: return null;
    }
  };

  const sortedAdvances = sortData(advances, getSortValue);

  const handleDelete = async (id: string) => {
    try {
      await deleteSalaryAdvance(id);
      toast({ title: t('common.deleteSuccess') });
      onRefresh();
    } catch (error: any) {
      toast({ title: t('common.deleteFailed'), description: error.message, variant: 'destructive' });
    }
  };

  const formatMoney = (amount: number, currency: string = 'MYR') => {
    const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : 'RM';
    return `${symbol} ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) return <AppSectionLoading label={t('common.loading')} compact />;
  if (advances.length === 0) return <div className="text-center py-8 text-muted-foreground">{t('payroll.noAdvances')}</div>;

  if (isMobile) {
    return (
      <div className="space-y-2">
        {sortedAdvances.map((adv) => (
          <Card key={adv.id} className="p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === adv.id ? null : adv.id)}>
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{adv.employee?.name || '-'}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(adv.advance_date), 'yyyy-MM-dd')}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-sm">{formatMoney(adv.amount, adv.currency)}</div>
                <Badge variant={adv.is_deducted ? 'secondary' : 'default'} className="text-xs">
                  {adv.is_deducted ? t('payroll.deducted') : t('payroll.pending')}
                </Badge>
              </div>
            </div>
            {expandedId === adv.id && (
              <div className="mt-3 pt-3 border-t space-y-2 text-sm" onClick={e => e.stopPropagation()}>
                <div><span className="text-muted-foreground">{t('transactions.account')}:</span> {adv.account_type === 'cash' ? t('account.cash') : t('account.bank')}</div>
                {adv.remark && <div><span className="text-muted-foreground">{t('common.remark')}:</span> {adv.remark}</div>}
                {canEdit && !adv.is_deducted && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => onEdit(adv)}><Edit className="w-3 h-3 mr-1" />{t('common.edit')}</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive"><Trash2 className="w-3 h-3 mr-1" />{t('common.delete')}</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(adv.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  // Tablet compact table view
  if (isTablet) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table compact>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="employee" sortConfig={sortConfig} onSort={requestSort} className="sticky left-0 z-10 bg-card">{t('payroll.employeeName')}</SortableTableHead>
              <SortableTableHead sortKey="amount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('common.amount')}</SortableTableHead>
              <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort}>{t('common.date')}</SortableTableHead>
              <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort}>{t('common.status')}</SortableTableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAdvances.map((adv) => (
              <TableRow key={adv.id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap">{adv.employee?.name || '-'}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatMoney(adv.amount, adv.currency)}</TableCell>
                <TableCell className="whitespace-nowrap">{format(new Date(adv.advance_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>
                  <Badge variant={adv.is_deducted ? 'secondary' : 'default'} className="text-xs">{adv.is_deducted ? t('payroll.deducted') : t('payroll.pending')}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canEdit && !adv.is_deducted ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(adv)}><Edit className="w-3.5 h-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(adv.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">-</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort}>{t('common.date')}</SortableTableHead>
            <SortableTableHead sortKey="employee" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.employeeName')}</SortableTableHead>
            <SortableTableHead sortKey="amount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('common.amount')}</SortableTableHead>
            <SortableTableHead sortKey="account" sortConfig={sortConfig} onSort={requestSort}>{t('transactions.account')}</SortableTableHead>
            <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort}>{t('common.status')}</SortableTableHead>
            <TableHead>{t('common.remark')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAdvances.map((advance) => (
            <TableRow key={advance.id}>
              <TableCell>{format(new Date(advance.advance_date), 'yyyy-MM-dd')}</TableCell>
              <TableCell className="font-medium">{advance.employee?.name || '-'}</TableCell>
              <TableCell className="text-right">{formatMoney(advance.amount, advance.currency)}</TableCell>
              <TableCell>{advance.account_type === 'cash' ? t('account.cash') : t('account.bank')}</TableCell>
              <TableCell>
                <Badge variant={advance.is_deducted ? 'secondary' : 'default'}>{advance.is_deducted ? t('payroll.deducted') : t('payroll.pending')}</Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{advance.remark || '-'}</TableCell>
              <TableCell className="text-right">
                {canEdit ? (
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(advance)} disabled={advance.is_deducted}><Edit className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" disabled={advance.is_deducted}><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(advance.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : <span className="text-xs text-muted-foreground">-</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}