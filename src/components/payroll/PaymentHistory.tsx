import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { deleteSalaryPayment } from '@/services/payroll.service';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Employee { id: string; name: string; position: string | null; phone: string | null; monthly_salary: number; status: 'active' | 'inactive'; }
interface SalaryPayment { id: string; employee_id: string; payment_date: string; payment_month: string; base_salary: number; bonus: number; overtime_pay: number; gross_salary: number; advance_deduction: number; insurance_deduction: number; other_deduction: number; net_salary: number; currency: string; account_type: string; exchange_rate: number; amount_myr: number; remark: string | null; commission?: number | null; full_attendance_bonus?: number | null; leave_days?: number | null; work_days?: number | null; penalty?: number | null; employee?: Employee; }
interface PaymentHistoryProps { payments: SalaryPayment[]; loading: boolean; onEdit: (payment: SalaryPayment) => void; onRefresh: () => void; canEdit?: boolean; }

export function PaymentHistory({ payments, loading, onEdit, onRefresh, canEdit = true }: PaymentHistoryProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  if (loading) return <AppSectionLoading label={t('common.loading')} compact />;
  if (payments.length === 0) return <div className="text-center py-8 text-muted-foreground">{t('payroll.noPayments')}</div>;

  if (isMobile) {
    return (
      <div className="space-y-2">
        {payments.map((payment) => {
          const totalDeduction = payment.advance_deduction + payment.insurance_deduction + payment.other_deduction + (payment.penalty || 0);
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
                    <div><span className="text-muted-foreground">{t('payroll.baseSalary')}:</span> {formatMoney(payment.base_salary)}</div>
                    <div><span className="text-muted-foreground">{t('payroll.commission')}:</span> {(payment.commission || 0) > 0 ? formatMoney(payment.commission || 0) : '-'}</div>
                    <div><span className="text-muted-foreground">{t('payroll.fullAttendanceBonus')}:</span> {(payment.full_attendance_bonus || 0) > 0 ? formatMoney(payment.full_attendance_bonus || 0) : '-'}</div>
                    <div className="text-destructive"><span className="text-muted-foreground">{t('payroll.totalDeduction')}:</span> {totalDeduction > 0 ? `-${formatMoney(totalDeduction)}` : '-'}</div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(payment)}><Edit className="w-3 h-3 mr-1" />{t('common.edit')}</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive"><Trash2 className="w-3 h-3 mr-1" />{t('common.delete')}</Button>
                        </AlertDialogTrigger>
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

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('payroll.paymentMonth')}</TableHead>
            <TableHead>{t('common.date')}</TableHead>
            <TableHead>{t('payroll.employeeName')}</TableHead>
            <TableHead>{t('payroll.position')}</TableHead>
            <TableHead className="text-right">{t('payroll.baseSalary')}</TableHead>
            <TableHead className="text-right">{t('payroll.commission')}</TableHead>
            <TableHead className="text-right">{t('payroll.fullAttendanceBonus')}</TableHead>
            <TableHead className="text-right">{t('payroll.totalDeduction')}</TableHead>
            <TableHead className="text-right">{t('payroll.netSalary')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const totalDeduction = payment.advance_deduction + payment.insurance_deduction + payment.other_deduction + (payment.penalty || 0);
            return (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">{payment.payment_month}</TableCell>
                <TableCell>{format(new Date(payment.payment_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{payment.employee?.name || '-'}</TableCell>
                <TableCell>{payment.employee?.position || '-'}</TableCell>
                <TableCell className="text-right">{formatMoney(payment.base_salary)}</TableCell>
                <TableCell className="text-right text-primary">{(payment.commission || 0) > 0 ? formatMoney(payment.commission || 0) : '-'}</TableCell>
                <TableCell className="text-right">{(payment.full_attendance_bonus || 0) > 0 ? formatMoney(payment.full_attendance_bonus || 0) : '-'}</TableCell>
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
