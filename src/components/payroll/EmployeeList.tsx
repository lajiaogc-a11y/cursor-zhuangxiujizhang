import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { deleteEmployee } from '@/services/payroll.service';
import { useResponsive } from '@/hooks/useResponsive';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Employee {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  monthly_salary: number;
  status: 'active' | 'inactive';
}

interface EmployeeListProps {
  employees: Employee[];
  loading: boolean;
  onEdit: (employee: Employee) => void;
  onRefresh: () => void;
  canEdit?: boolean;
}

export function EmployeeList({ employees, loading, onEdit, onRefresh, canEdit = true }: EmployeeListProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { isMobile, isTablet } = useResponsive();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sortConfig, requestSort, sortData } = useSortableTable<Employee>();

  const getSortValue = (emp: Employee, key: string): any => {
    switch (key) {
      case 'name': return emp.name;
      case 'position': return emp.position;
      case 'salary': return emp.monthly_salary;
      case 'status': return emp.status;
      default: return null;
    }
  };

  const sortedEmployees = sortData(employees, getSortValue);

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee(id);
      toast({ title: t('common.deleteSuccess') });
      onRefresh();
    } catch (error: any) {
      toast({ title: t('common.deleteFailed'), description: error.message, variant: 'destructive' });
    }
  };

  const formatMoney = (amount: number) => {
    return `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return <AppSectionLoading label={t('common.loading')} compact />;
  }

  if (employees.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t('payroll.noEmployees')}</div>;
  }

  if (isMobile) {
    return (
      <div className="space-y-2">
        {sortedEmployees.map((emp) => (
          <Card key={emp.id} className="p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === emp.id ? null : emp.id)}>
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{emp.name}</div>
                <div className="text-sm text-muted-foreground">{emp.position || '-'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-sm">{formatMoney(emp.monthly_salary)}</div>
                <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {emp.status === 'active' ? t('payroll.statusActive') : t('payroll.statusInactive')}
                </Badge>
              </div>
            </div>
            {expandedId === emp.id && (
              <div className="mt-3 pt-3 border-t space-y-2 text-sm" onClick={e => e.stopPropagation()}>
                {emp.phone && <div><span className="text-muted-foreground">{t('payroll.phone')}:</span> {emp.phone}</div>}
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => onEdit(emp)}>
                      <Edit className="w-3 h-3 mr-1" />{t('common.edit')}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive">
                          <Trash2 className="w-3 h-3 mr-1" />{t('common.delete')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                          <AlertDialogDescription>{t('payroll.deleteEmployeeWarning')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(emp.id)}>{t('common.delete')}</AlertDialogAction>
                        </AlertDialogFooter>
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
              <SortableTableHead sortKey="name" sortConfig={sortConfig} onSort={requestSort} className="sticky left-0 z-10 bg-card">{t('payroll.employeeName')}</SortableTableHead>
              <SortableTableHead sortKey="position" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.position')}</SortableTableHead>
              <SortableTableHead sortKey="salary" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payroll.baseSalary')}</SortableTableHead>
              <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort}>{t('common.status')}</SortableTableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEmployees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap">{emp.name}</TableCell>
                <TableCell>{emp.position || '-'}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatMoney(emp.monthly_salary)}</TableCell>
                <TableCell>
                  <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {emp.status === 'active' ? t('payroll.statusActive') : t('payroll.statusInactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canEdit ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(emp)}><Edit className="w-3.5 h-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('payroll.deleteEmployeeWarning')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(emp.id)}>{t('common.delete')}</AlertDialogAction>
                          </AlertDialogFooter>
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
            <SortableTableHead sortKey="name" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.employeeName')}</SortableTableHead>
            <SortableTableHead sortKey="position" sortConfig={sortConfig} onSort={requestSort}>{t('payroll.position')}</SortableTableHead>
            <TableHead>{t('payroll.phone')}</TableHead>
            <SortableTableHead sortKey="salary" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('payroll.baseSalary')}</SortableTableHead>
            <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort}>{t('common.status')}</SortableTableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEmployees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{employee.name}</TableCell>
              <TableCell>{employee.position || '-'}</TableCell>
              <TableCell>{employee.phone || '-'}</TableCell>
              <TableCell className="text-right">{formatMoney(employee.monthly_salary)}</TableCell>
              <TableCell>
                <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                  {employee.status === 'active' ? t('payroll.statusActive') : t('payroll.statusInactive')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {canEdit ? (
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(employee)}><Edit className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                          <AlertDialogDescription>{t('payroll.deleteEmployeeWarning')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(employee.id)}>{t('common.delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}