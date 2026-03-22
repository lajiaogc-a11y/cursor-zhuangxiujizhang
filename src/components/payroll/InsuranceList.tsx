import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { deleteInsurancePayment } from '@/services/payroll.service';
import { format } from 'date-fns';
import { useResponsive } from '@/hooks/useResponsive';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Employee { id: string; name: string; position: string | null; phone: string | null; monthly_salary: number; status: 'active' | 'inactive'; }
interface InsurancePayment { id: string; employee_id: string; payment_date: string; payment_month: string; insurance_type: string; company_contribution: number; employee_contribution: number; total_amount: number; currency: string; account_type: string; amount_myr: number; remark: string | null; employee?: Employee; }
interface InsuranceListProps { insurances: InsurancePayment[]; loading: boolean; onEdit: (insurance: InsurancePayment) => void; onRefresh: () => void; canEdit?: boolean; }

export function InsuranceList({ insurances, loading, onEdit, onRefresh, canEdit = true }: InsuranceListProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { isMobile, isTablet } = useResponsive();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sortConfig, requestSort, sortData } = useSortableTable<InsurancePayment>();

  const getSortValue = (ins: InsurancePayment, key: string): any => {
    switch (key) {
      case 'month': return ins.payment_month;
      case 'date': return ins.payment_date;
      case 'employee': return ins.employee?.name;
      case 'total': return ins.total_amount;
      default: return null;
    }
  };

  const sortedInsurances = sortData(insurances, getSortValue);

  const handleDelete = async (id: string) => {
    try {
      await deleteInsurancePayment(id);
      toast({ title: t('common.deleteSuccess') });
      onRefresh();
    } catch (error: any) {
      toast({ title: t('common.deleteFailed'), description: error.message, variant: 'destructive' });
    }
  };

  const formatMoney = (amount: number) => `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return <AppSectionLoading label={t('common.loading')} compact />;
  if (insurances.length === 0) return <div className="text-center py-8 text-muted-foreground">{t('payroll.noInsurance')}</div>;

  if (isMobile) {
    return (
      <div className="space-y-2">
        {sortedInsurances.map((ins) => {
          const isExpanded = expandedId === ins.id;
          return (
            <Card key={ins.id} className="p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : ins.id)}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{ins.employee?.name || '-'}</div>
                  <div className="text-xs text-muted-foreground">{ins.payment_month} · {ins.insurance_type}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-sm">{formatMoney(ins.total_amount)}</div>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-1.5 text-sm" onClick={e => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="text-muted-foreground">{t('payroll.companyContribution')}:</span> {formatMoney(ins.company_contribution)}</div>
                    <div><span className="text-muted-foreground">{t('payroll.employeeContribution')}:</span> {formatMoney(ins.employee_contribution)}</div>
                    <div><span className="text-muted-foreground">{t('common.date')}:</span> {format(new Date(ins.payment_date), 'yyyy-MM-dd')}</div>
                  </div>
                  {ins.remark && <div><span className="text-muted-foreground">{t('common.remark')}:</span> {ins.remark}</div>}
                  {canEdit && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(ins)}><Edit className="w-3 h-3 mr-1" />{t('common.edit')}</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-destructive"><Trash2 className="w-3 h-3 mr-1" />{t('common.delete')}</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(ins.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
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
              <TableHead>{t('payroll.insuranceType')}</TableHead>
              <SortableTableHead sortKey="total" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payroll.totalAmount')}</SortableTableHead>
              <SortableTableHead sortKey="month" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.paymentMonth')}</SortableTableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInsurances.map((ins) => (
              <TableRow key={ins.id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap">{ins.employee?.name || '-'}</TableCell>
                <TableCell>{ins.insurance_type}</TableCell>
                <TableCell className="text-right whitespace-nowrap font-semibold">{formatMoney(ins.total_amount)}</TableCell>
                <TableCell>{ins.payment_month}</TableCell>
                <TableCell className="text-right">
                  {canEdit ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(ins)}><Edit className="w-3.5 h-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(ins.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
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
            <SortableTableHead sortKey="month" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.paymentMonth')}</SortableTableHead>
            <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort}>{t('common.date')}</SortableTableHead>
            <SortableTableHead sortKey="employee" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.employeeName')}</SortableTableHead>
            <TableHead>{t('payroll.insuranceType')}</TableHead>
            <TableHead className="text-right">{t('payroll.companyContribution')}</TableHead>
            <TableHead className="text-right">{t('payroll.employeeContribution')}</TableHead>
            <SortableTableHead sortKey="total" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payroll.totalAmount')}</SortableTableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInsurances.map((insurance) => (
            <TableRow key={insurance.id}>
              <TableCell className="font-medium">{insurance.payment_month}</TableCell>
              <TableCell>{format(new Date(insurance.payment_date), 'yyyy-MM-dd')}</TableCell>
              <TableCell>{insurance.employee?.name || '-'}</TableCell>
              <TableCell>{insurance.insurance_type}</TableCell>
              <TableCell className="text-right">{formatMoney(insurance.company_contribution)}</TableCell>
              <TableCell className="text-right">{formatMoney(insurance.employee_contribution)}</TableCell>
              <TableCell className="text-right font-semibold">{formatMoney(insurance.total_amount)}</TableCell>
              <TableCell className="text-right">
                {canEdit ? (
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(insurance)}><Edit className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(insurance.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
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