import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Wallet, Shield, Plus, DollarSign, History, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchEmployees, fetchSalaryAdvances, fetchSalaryPayments, fetchInsurancePayments } from '@/services/payroll.service';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { EmployeeList } from '@/components/payroll/EmployeeList';
import { EmployeeForm } from '@/components/payroll/EmployeeForm';
import { AdvanceList } from '@/components/payroll/AdvanceList';
import { AdvanceForm } from '@/components/payroll/AdvanceForm';
import { SalaryCalculation } from '@/components/payroll/SalaryCalculation';
import { PaymentHistory } from '@/components/payroll/PaymentHistory';
import { PaymentForm } from '@/components/payroll/PaymentForm';
import { InsuranceList } from '@/components/payroll/InsuranceList';
import { InsuranceForm } from '@/components/payroll/InsuranceForm';
import { PayrollSettings } from '@/components/payroll/PayrollSettings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidationMap } from '@/lib/queryKeys';
import { formatCompact } from '@/lib/formatCurrency';

interface Employee {
  id: string; name: string; position: string | null; phone: string | null; monthly_salary: number; status: 'active' | 'inactive';
}
interface SalaryAdvance {
  id: string; employee_id: string; advance_date: string; amount: number; currency: string; account_type: string; exchange_rate: number; amount_myr: number; is_deducted: boolean; remark: string | null; employee?: Employee;
}
interface SalaryPayment {
  id: string; employee_id: string; payment_date: string; payment_month: string; base_salary: number; bonus: number; overtime_pay: number; gross_salary: number; advance_deduction: number; insurance_deduction: number; other_deduction: number; net_salary: number; currency: string; account_type: string; exchange_rate: number; amount_myr: number; remark: string | null; commission?: number | null; full_attendance_bonus?: number | null; leave_days?: number | null; work_days?: number | null; penalty?: number | null; employee?: Employee;
}
interface InsurancePayment {
  id: string; employee_id: string; payment_date: string; payment_month: string; insurance_type: string; company_contribution: number; employee_contribution: number; total_amount: number; currency: string; account_type: string; amount_myr: number; remark: string | null; employee?: Employee;
}

export function PayrollTab() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('feature.edit');
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [advanceFormOpen, setAdvanceFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [insuranceFormOpen, setInsuranceFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingAdvance, setEditingAdvance] = useState<SalaryAdvance | null>(null);
  const [editingPayment, setEditingPayment] = useState<SalaryPayment | null>(null);
  const [editingInsurance, setEditingInsurance] = useState<InsurancePayment | null>(null);
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: [...queryKeys.employees, tenantId],
    queryFn: async () => { if (!tenantId) return []; return fetchEmployees(tenantId) as Promise<Employee[]>; },
    enabled: !!tenantId,
  });
  const { data: advances = [] } = useQuery({
    queryKey: [...queryKeys.salaryAdvances, tenantId],
    queryFn: async () => { if (!tenantId) return []; return fetchSalaryAdvances(tenantId) as Promise<SalaryAdvance[]>; },
    enabled: !!tenantId,
  });
  const { data: payments = [] } = useQuery({
    queryKey: [...queryKeys.salaryPayments, tenantId],
    queryFn: async () => { if (!tenantId) return []; return fetchSalaryPayments(tenantId) as Promise<SalaryPayment[]>; },
    enabled: !!tenantId,
  });
  const { data: insurances = [] } = useQuery({
    queryKey: [...queryKeys.insurancePayments, tenantId],
    queryFn: async () => { if (!tenantId) return []; return fetchInsurancePayments(tenantId) as Promise<InsurancePayment[]>; },
    enabled: !!tenantId,
  });

  const isLoading = loadingEmployees;
  const invalidatePayroll = () => { invalidationMap.payrollMutation.forEach(key => { queryClient.invalidateQueries({ queryKey: key }); }); };

  const advancesWithEmployee = useMemo(() => advances.map(a => ({ ...a, employee: employees.find(e => e.id === a.employee_id) })), [advances, employees]);
  const paymentsWithEmployee = useMemo(() => payments.map(p => ({ ...p, employee: employees.find(e => e.id === p.employee_id) })), [payments, employees]);
  const insurancesWithEmployee = useMemo(() => insurances.map(i => ({ ...i, employee: employees.find(e => e.id === i.employee_id) })), [insurances, employees]);

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const stats = useMemo(() => {
    const monthlyPayments = payments.filter(p => p.payment_date >= monthStart && p.payment_date <= monthEnd);
    const monthlyAdvances = advances.filter(a => a.advance_date >= monthStart && a.advance_date <= monthEnd);
    const monthlyInsurance = insurances.filter(i => i.payment_date >= monthStart && i.payment_date <= monthEnd);
    const activeEmployees = employees.filter(e => e.status === 'active');
    const totalMonthlySalary = activeEmployees.reduce((sum, e) => sum + e.monthly_salary, 0);
    return {
      monthlySalary: monthlyPayments.reduce((sum, p) => sum + p.amount_myr, 0),
      monthlyAdvance: monthlyAdvances.reduce((sum, a) => sum + a.amount_myr, 0),
      monthlyInsurance: monthlyInsurance.reduce((sum, i) => sum + i.amount_myr, 0),
      pendingSalary: Math.max(0, totalMonthlySalary - monthlyPayments.reduce((sum, p) => sum + p.amount_myr, 0)),
      employeeCount: activeEmployees.length,
    };
  }, [employees, payments, advances, insurances, monthStart, monthEnd]);

  const handleSuccess = () => {
    setEmployeeFormOpen(false); setAdvanceFormOpen(false); setPaymentFormOpen(false); setInsuranceFormOpen(false);
    setEditingEmployee(null); setEditingAdvance(null); setEditingPayment(null); setEditingInsurance(null);
    invalidatePayroll();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {canEdit && (
          isMobile ? (
            <Button variant="outline" size="sm" onClick={() => { setEditingEmployee(null); setEmployeeFormOpen(true); }}><Plus className="w-4 h-4" /></Button>
          ) : (
            <Button variant="outline" onClick={() => { setEditingEmployee(null); setEmployeeFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t('payroll.newEmployee')}</Button>
          )
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="stat-card"><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-primary" /><span className="text-sm text-muted-foreground">{t('payroll.monthlyTotal')}</span></div><div className="stat-value-container"><span className="stat-value-sm">{formatCompact(stats.monthlySalary)}</span></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-warning" /><span className="text-sm text-muted-foreground">{t('payroll.monthlyAdvance')}</span></div><div className="stat-value-container"><span className="stat-value-sm text-warning">{formatCompact(stats.monthlyAdvance)}</span></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-primary" /><span className="text-sm text-muted-foreground">{t('payroll.monthlyInsurance')}</span></div><div className="stat-value-container"><span className="stat-value-sm text-primary">{formatCompact(stats.monthlyInsurance)}</span></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-destructive" /><span className="text-sm text-muted-foreground">{t('payroll.pendingSalary')}</span></div><div className="stat-value-container"><span className="stat-value-sm text-destructive">{formatCompact(stats.pendingSalary)}</span></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-success" /><span className="text-sm text-muted-foreground">{t('payroll.employeeCount')}</span></div><div className="stat-value-container"><span className="stat-value-sm text-success">{stats.employeeCount} {t('payroll.people')}</span></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="salary">
            <TabsList className="mb-4 overflow-x-auto whitespace-nowrap flex w-full">
              <TooltipProvider>
                <Tooltip><TooltipTrigger asChild><TabsTrigger value="salary"><DollarSign className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">{t('payroll.salaryCalculation')}</span></TabsTrigger></TooltipTrigger><TooltipContent className="md:hidden">{t('payroll.salaryCalculation')}</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><TabsTrigger value="insurance"><Shield className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">{t('payroll.insurance')}</span></TabsTrigger></TooltipTrigger><TooltipContent className="md:hidden">{t('payroll.insurance')}</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><TabsTrigger value="advances"><Wallet className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">{t('payroll.advances')}</span></TabsTrigger></TooltipTrigger><TooltipContent className="md:hidden">{t('payroll.advances')}</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><TabsTrigger value="history"><History className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">{t('payroll.paymentHistory')}</span></TabsTrigger></TooltipTrigger><TooltipContent className="md:hidden">{t('payroll.paymentHistory')}</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><TabsTrigger value="employees"><Users className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">{t('payroll.employees')}</span></TabsTrigger></TooltipTrigger><TooltipContent className="md:hidden">{t('payroll.employees')}</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><TabsTrigger value="settings"><Settings className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">{t('payroll.settings')}</span></TabsTrigger></TooltipTrigger><TooltipContent className="md:hidden">{t('payroll.settings')}</TooltipContent></Tooltip>
              </TooltipProvider>
            </TabsList>
            <TabsContent value="salary"><SalaryCalculation employees={employees} loading={isLoading} onRefresh={invalidatePayroll} /></TabsContent>
            <TabsContent value="insurance">
              {canEdit && (<div className="flex justify-end mb-4"><Button variant="outline" size="sm" onClick={() => { setEditingInsurance(null); setInsuranceFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t('payroll.recordInsurance')}</Button></div>)}
              <InsuranceList insurances={insurancesWithEmployee} loading={isLoading} onEdit={(ins) => { setEditingInsurance(ins); setInsuranceFormOpen(true); }} onRefresh={invalidatePayroll} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="advances">
              {canEdit && (<div className="flex justify-end mb-4"><Button variant="outline" size="sm" onClick={() => { setEditingAdvance(null); setAdvanceFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t('payroll.recordAdvance')}</Button></div>)}
              <AdvanceList advances={advancesWithEmployee} loading={isLoading} onEdit={(adv) => { setEditingAdvance(adv); setAdvanceFormOpen(true); }} onRefresh={invalidatePayroll} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="history"><PaymentHistory payments={paymentsWithEmployee} loading={isLoading} onEdit={(pay) => { setEditingPayment(pay); setPaymentFormOpen(true); }} onRefresh={invalidatePayroll} canEdit={canEdit} /></TabsContent>
            <TabsContent value="employees">
              {canEdit && (<div className="flex justify-end mb-4"><Button variant="outline" size="sm" onClick={() => { setEditingEmployee(null); setEmployeeFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t('payroll.newEmployee')}</Button></div>)}
              <EmployeeList employees={employees} loading={isLoading} onEdit={(emp) => { setEditingEmployee(emp); setEmployeeFormOpen(true); }} onRefresh={invalidatePayroll} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="settings"><PayrollSettings /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EmployeeForm open={employeeFormOpen} onOpenChange={setEmployeeFormOpen} employee={editingEmployee} onSuccess={handleSuccess} />
      <AdvanceForm open={advanceFormOpen} onOpenChange={setAdvanceFormOpen} advance={editingAdvance} employees={employees.filter(e => e.status === 'active')} onSuccess={handleSuccess} />
      <PaymentForm open={paymentFormOpen} onOpenChange={setPaymentFormOpen} payment={editingPayment} employees={employees.filter(e => e.status === 'active')} advances={advances.filter(a => !a.is_deducted)} onSuccess={handleSuccess} />
      <InsuranceForm open={insuranceFormOpen} onOpenChange={setInsuranceFormOpen} insurance={editingInsurance} employees={employees.filter(e => e.status === 'active')} onSuccess={handleSuccess} />
    </div>
  );
}
