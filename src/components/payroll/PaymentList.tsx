import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { deleteSalaryPayment } from '@/services/payroll.service';
import { format } from 'date-fns';
import { useResponsive } from '@/hooks/useResponsive';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Employee { id: string; name: string; position: string | null; phone: string | null; monthly_salary: number; status: 'active' | 'inactive'; }
interface SalaryPayment { id: string; employee_id: string; payment_date: string; payment_month: string; base_salary: number; bonus: number; overtime_pay: number; gross_salary: number; advance_deduction: number; insurance_deduction: number; other_deduction: number; net_salary: number; currency: string; account_type: string; exchange_rate: number; amount_myr: number; remark: string | null; employee?: Employee; }
interface PaymentListProps { payments: SalaryPayment[]; loading: boolean; onEdit: (payment: SalaryPayment) => void; onRefresh: () => void; canEdit?: boolean; }

export function PaymentList({ payments, loading, onEdit, onRefresh, canEdit = true }: PaymentListProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { isMobile, isTablet } = useResponsive();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sortConfig, requestSort, sortData } = useSortableTable<SalaryPayment>();

  const getSortValue = (p: SalaryPayment, key: string): any => {
    switch (key) {
      case 'month': return p.payment_month;
      case 'date': return p.payment_date;
      case 'employee': return p.employee?.name;
      case 'gross': return p.gross_salary;
      case 'deduction': return p.advance_deduction + p.insurance_deduction + p.other_deduction;
      case 'net': return p.net_salary;
      default: return null;
    }
  };

  const sortedPayments = sortData(payments, getSortValue);

  const handleDelete = async (id: string) => {
    try {
      await deleteSalaryPayment(id);
      toast({ title: t('common.deleteSuccess') });
      onRefresh();
    } catch (error: any) {
      toast({ title: t('common.deleteFailed'), description: error.message, variant: 'destructive' });
    }
  };

  const formatMoney = (amount: number) => `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (payments.length === 0) return <div className="text-center py-8 text-muted-foreground">{t('payroll.noPayments')}</div>;

  if (isMobile) {
    return (
      <div className="space-y-2">
        {sortedPayments.map((payment) => {
          const totalDeduction = payment.advance_deduction + payment.insurance_deduction + payment.other_deduction;
          const isExpanded = expandedId === payment.id;
          return (
            <Card key={payment.id} className="p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : payment.id)}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{payment.employee?.name || '-'}</div>
                  <div className="text-xs text-muted-foreground">{payment.payment_month} · {format(new Date(payment.payment_date), 'yyyy-MM-dd')}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-sm text-success">{formatMoney(payment.net_salary)}</div>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-1.5 text-sm" onClick={e => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="text-muted-foreground">{t('payroll.grossSalary')}:</span> {formatMoney(payment.gross_salary)}</div>
                    <div className="text-destructive"><span className="text-muted-foreground">{t('payroll.totalDeduction')}:</span> {totalDeduction > 0 ? `-${formatMoney(totalDeduction)}` : '-'}</div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(payment)}><Edit className="w-3 h-3 mr-1" />{t('common.edit')}</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-destructive"><Trash2 className="w-3 h-3 mr-1" />{t('common.delete')}</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('payroll.deletePaymentWarning')}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(payment.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
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
      <div className="rounded-md border overflow-x-auto">
        <Table compact>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="employee" sortConfig={sortConfig} onSort={requestSort} className="sticky left-0 z-10 bg-card">{t('payroll.employeeName')}</SortableTableHead>
              <SortableTableHead sortKey="month" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.paymentMonth')}</SortableTableHead>
              <SortableTableHead sortKey="net" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payroll.netSalary')}</SortableTableHead>
              <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort}>{t('common.date')}</SortableTableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap">{payment.employee?.name || '-'}</TableCell>
                <TableCell>{payment.payment_month}</TableCell>
                <TableCell className="text-right whitespace-nowrap font-semibold text-success">{formatMoney(payment.net_salary)}</TableCell>
                <TableCell className="whitespace-nowrap">{format(new Date(payment.payment_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell className="text-right">
                  {canEdit ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(payment)}><Edit className="w-3.5 h-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('payroll.deletePaymentWarning')}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(payment.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead sortKey="month" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.paymentMonth')}</SortableTableHead>
            <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort}>{t('common.date')}</SortableTableHead>
            <SortableTableHead sortKey="employee" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.employeeName')}</SortableTableHead>
            <SortableTableHead sortKey="gross" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payroll.grossSalary')}</SortableTableHead>
            <TableHead className="text-right">{t('payroll.advanceDeduction')}</TableHead>
            <SortableTableHead sortKey="deduction" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payroll.totalDeduction')}</SortableTableHead>
            <SortableTableHead sortKey="net" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payroll.netSalary')}</SortableTableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPayments.map((payment) => {
            const totalDeduction = payment.advance_deduction + payment.insurance_deduction + payment.other_deduction;
            return (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">{payment.payment_month}</TableCell>
                <TableCell>{format(new Date(payment.payment_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{payment.employee?.name || '-'}</TableCell>
                <TableCell className="text-right">{formatMoney(payment.gross_salary)}</TableCell>
                <TableCell className="text-right text-warning">{payment.advance_deduction > 0 ? `-${formatMoney(payment.advance_deduction)}` : '-'}</TableCell>
                <TableCell className="text-right text-destructive">{totalDeduction > 0 ? `-${formatMoney(totalDeduction)}` : '-'}</TableCell>
                <TableCell className="text-right font-semibold text-success">{formatMoney(payment.net_salary)}</TableCell>
                <TableCell className="text-right">
                  {canEdit ? (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(payment)}><Edit className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('payroll.deletePaymentWarning')}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(payment.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">-</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}