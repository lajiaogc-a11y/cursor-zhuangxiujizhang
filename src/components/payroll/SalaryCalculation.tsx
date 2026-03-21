import { useState, useEffect, useMemo } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Edit, Send, CheckCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { fetchSalaryCalcData, issueSalary } from '@/services/payroll.service';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { SalaryEditDialog } from './SalaryEditDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Employee {
  id: string;
  name: string;
  position: string | null;
  monthly_salary: number;
  status: 'active' | 'inactive';
}

interface Project {
  id: string;
  project_code: string;
  referrer_name: string | null;
  referrer_commission_rate: number | null;
  total_income_myr: number | null;
  status: string;
}

interface SalaryAdvance {
  id: string;
  employee_id: string;
  amount_myr: number;
  is_deducted: boolean;
}

interface InsurancePayment {
  employee_id: string;
  company_contribution: number;
  employee_contribution: number;
  payment_month: string;
}

interface EmployeeSalaryData {
  employeeId: string;
  name: string;
  position: string | null;
  baseSalary: number;
  commission: number;
  fullAttendanceBonus: number;
  otherBonus: number;
  companyInsurance: number;
  insuranceDeduction: number;
  advanceAmount: number;
  advanceIds: string[];
  leaveDays: number;
  workDays: number;
  penalty: number;
  netSalary: number;
  isIssued: boolean;
}

interface PayrollSetting {
  setting_type: string;
  setting_key: string;
  setting_value: Record<string, any>;
}

interface SalaryCalculationProps {
  employees: Employee[];
  loading: boolean;
  onRefresh: () => void;
}

export function SalaryCalculation({ employees, loading, onRefresh }: SalaryCalculationProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const isMobile = useIsMobile();
  
  const [paymentMonth, setPaymentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [projects, setProjects] = useState<Project[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [insurances, setInsurances] = useState<InsurancePayment[]>([]);
  const [issuedPayments, setIssuedPayments] = useState<Set<string>>(new Set());
  const [salaryData, setSalaryData] = useState<Map<string, Partial<EmployeeSalaryData>>>(new Map());
  const [editingEmployee, setEditingEmployee] = useState<EmployeeSalaryData | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSetting[]>([]);
  
  // Fetch related data
  useEffect(() => {
    const fetchData = async () => {
      const result = await fetchSalaryCalcData(paymentMonth);
      setProjects(result.projects);
      setAdvances(result.advances);
      setInsurances(result.insurances);
      setIssuedPayments(new Set(result.issuedEmployeeIds));
      setPayrollSettings(result.payrollSettings as PayrollSetting[]);
    };
    fetchData();
  }, [paymentMonth]);

  // Get settings helpers
  const getAttendanceConfig = () => {
    const setting = payrollSettings.find(s => s.setting_key === 'full_bonus');
    return {
      amount: setting?.setting_value?.amount || 0,
      requiredDays: setting?.setting_value?.required_days || 22,
    };
  };

  const getInsuranceRates = () => {
    const empRate = payrollSettings.find(s => s.setting_key === 'employee_rate');
    const compRate = payrollSettings.find(s => s.setting_key === 'company_rate');
    return {
      employeeRate: empRate?.setting_value?.percent || 11,
      companyRate: compRate?.setting_value?.percent || 13,
    };
  };

  const getPositionBonus = (position: string | null) => {
    if (!position) return 0;
    const setting = payrollSettings.find(s => s.setting_type === 'position_bonus' && s.setting_key === position);
    return setting?.setting_value?.fixed || 0;
  };

  const getPoolShare = (position: string | null) => {
    if (!position) return 0;
    const poolTotalSetting = payrollSettings.find(s => s.setting_key === 'pool_total');
    const poolTotal = poolTotalSetting?.setting_value?.amount || 0;
    if (poolTotal === 0) return 0;
    
    const poolPercentSetting = payrollSettings.find(s => s.setting_type === 'pool_percent' && s.setting_key === position);
    const poolPercent = poolPercentSetting?.setting_value?.pool_percent || 0;
    return poolTotal * (poolPercent / 100);
  };

  // Calculate period-based bonuses (monthly, quarterly, yearly)
  const calculatePeriodBonuses = (baseSalary: number, currentMonth: string): number => {
    const month = parseInt(currentMonth.split('-')[1]);
    let totalBonus = 0;
    
    const bonusRules = payrollSettings.filter(s => s.setting_type === 'bonus');
    
    bonusRules.forEach(rule => {
      const { percent = 0, fixed = 0, period = 'monthly' } = rule.setting_value as any;
      
      let shouldApply = false;
      if (period === 'monthly') {
        shouldApply = true;
      } else if (period === 'quarterly' && [3, 6, 9, 12].includes(month)) {
        shouldApply = true;
      } else if (period === 'yearly' && month === 12) {
        shouldApply = true;
      }
      
      if (shouldApply) {
        totalBonus += (baseSalary * percent / 100) + fixed;
      }
    });
    
    return totalBonus;
  };

  // Calculate commission for an employee
  const calculateCommission = (employeeName: string): number => {
    const referredProjects = projects.filter(p => 
      p.referrer_name === employeeName && p.status === 'completed'
    );
    return referredProjects.reduce((sum, p) => {
      const income = p.total_income_myr || 0;
      const rate = p.referrer_commission_rate || 0;
      return sum + (income * rate / 100);
    }, 0);
  };


  // Get pending advances for an employee
  const getEmployeeAdvances = (employeeId: string): { total: number; ids: string[] } => {
    const empAdvances = advances.filter(a => a.employee_id === employeeId);
    return {
      total: empAdvances.reduce((sum, a) => sum + a.amount_myr, 0),
      ids: empAdvances.map(a => a.id),
    };
  };

  // Get insurance for an employee
  const getEmployeeInsurance = (employeeId: string): { company: number; employee: number } => {
    const ins = insurances.find(i => i.employee_id === employeeId);
    return {
      company: ins?.company_contribution || 0,
      employee: ins?.employee_contribution || 0,
    };
  };

  // Calculate net salary
  const calculateNetSalary = (data: Partial<EmployeeSalaryData>): number => {
    const base = data.baseSalary || 0;
    const commission = data.commission || 0;
    const fullAttendance = data.fullAttendanceBonus || 0;
    const otherBonus = data.otherBonus || 0;
    const insuranceDed = data.insuranceDeduction || 0;
    const advanceDed = data.advanceAmount || 0;
    const penalty = data.penalty || 0;
    
    return base + commission + fullAttendance + otherBonus - insuranceDed - advanceDed - penalty;
  };

  // Build salary data for all employees
  const employeeSalaryList = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    const attendanceConfig = getAttendanceConfig();
    const insuranceRates = getInsuranceRates();
    
    return activeEmployees.map(emp => {
      const editData = salaryData.get(emp.id) || {};
      const commission = calculateCommission(emp.name);
      const advInfo = getEmployeeAdvances(emp.id);
      const insInfo = getEmployeeInsurance(emp.id);
      
      // Calculate automatic values from settings
      const positionBonus = getPositionBonus(emp.position);
      const poolShare = getPoolShare(emp.position);
      const periodBonus = calculatePeriodBonuses(emp.monthly_salary, paymentMonth);
      const workDays = editData.workDays ?? attendanceConfig.requiredDays;
      const autoFullAttendance = workDays >= attendanceConfig.requiredDays ? attendanceConfig.amount : 0;
      const autoInsuranceDeduction = insInfo.employee || (emp.monthly_salary * insuranceRates.employeeRate / 100);
      const autoCompanyInsurance = insInfo.company || (emp.monthly_salary * insuranceRates.companyRate / 100);
      
      const data: EmployeeSalaryData = {
        employeeId: emp.id,
        name: emp.name,
        position: emp.position,
        baseSalary: emp.monthly_salary,
        commission,
        fullAttendanceBonus: editData.fullAttendanceBonus ?? autoFullAttendance,
        otherBonus: (editData.otherBonus ?? 0) + positionBonus + poolShare + periodBonus,
        companyInsurance: autoCompanyInsurance,
        insuranceDeduction: editData.insuranceDeduction ?? autoInsuranceDeduction,
        advanceAmount: advInfo.total,
        advanceIds: advInfo.ids,
        leaveDays: editData.leaveDays ?? 0,
        workDays,
        penalty: editData.penalty ?? 0,
        netSalary: 0,
        isIssued: issuedPayments.has(emp.id),
      };
      
      data.netSalary = calculateNetSalary(data);
      return data;
    });
  }, [employees, projects, advances, insurances, salaryData, issuedPayments, payrollSettings]);

  // Handle edit
  const handleEdit = (emp: EmployeeSalaryData) => {
    setEditingEmployee(emp);
  };

  // Handle save from edit dialog
  const handleSaveEdit = (data: Partial<EmployeeSalaryData>) => {
    if (editingEmployee) {
      setSalaryData(prev => {
        const newMap = new Map(prev);
        newMap.set(editingEmployee.employeeId, {
          ...prev.get(editingEmployee.employeeId),
          ...data,
        });
        return newMap;
      });
    }
    setEditingEmployee(null);
  };

  // Issue salary for one employee
  const handleIssueSalary = async (emp: EmployeeSalaryData) => {
    if (emp.isIssued) return;
    
    setIssuingId(emp.employeeId);
    try {
      await issueSalary({
        employee_id: emp.employeeId,
        payment_date: new Date().toISOString().split('T')[0],
        payment_month: paymentMonth,
        base_salary: emp.baseSalary,
        commission: emp.commission,
        full_attendance_bonus: emp.fullAttendanceBonus,
        bonus: emp.otherBonus,
        overtime_pay: 0,
        gross_salary: emp.baseSalary + emp.commission + emp.fullAttendanceBonus + emp.otherBonus,
        advance_deduction: emp.advanceAmount,
        insurance_deduction: emp.insuranceDeduction,
        other_deduction: 0,
        leave_days: emp.leaveDays,
        work_days: emp.workDays,
        penalty: emp.penalty,
        net_salary: emp.netSalary,
        currency: 'MYR',
        account_type: 'bank',
        exchange_rate: 1,
        amount_myr: emp.netSalary,
        created_by: user?.id,
        tenant_id: tenant?.id,
      }, emp.advanceIds);

      toast({ title: t('payroll.issueSuccess') });
      setIssuedPayments(prev => new Set([...prev, emp.employeeId]));
      onRefresh();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIssuingId(null);
    }
  };

  // Issue all salaries
  const handleIssueAll = async () => {
    const unissued = employeeSalaryList.filter(e => !e.isIssued);
    for (const emp of unissued) {
      await handleIssueSalary(emp);
    }
  };

  const formatMoney = (amount: number) => {
    return `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(format(date, 'yyyy-MM'));
    }
    return options;
  }, []);

  const totalNetSalary = employeeSalaryList.reduce((sum, e) => sum + e.netSalary, 0);
  const unissuedCount = employeeSalaryList.filter(e => !e.isIssued).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (employees.filter(e => e.status === 'active').length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('payroll.noActiveEmployees')}
      </div>
    );
  }

  // Mobile card for a single employee
  const renderMobileCard = (emp: EmployeeSalaryData) => (
    <Card key={emp.employeeId} className={emp.isIssued ? 'bg-muted/30' : ''}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Name + Position + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{emp.name}</span>
            {emp.position && <span className="text-xs text-muted-foreground">({emp.position})</span>}
          </div>
          <Badge variant={emp.isIssued ? 'default' : 'outline'} className={emp.isIssued ? 'bg-success/10 text-success border-success/20' : ''}>
            {emp.isIssued ? t('payroll.issued') : t('payroll.pending')}
          </Badge>
        </div>

        {/* Earnings */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">{t('payroll.baseSalary')} / {t('payroll.commission')}</p>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('payroll.baseSalary')}</span>
              <span>{formatMoney(emp.baseSalary)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('payroll.commission')}</span>
              <span className="text-primary">{emp.commission > 0 ? formatMoney(emp.commission) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('payroll.fullAttendanceBonus')}</span>
              <span>{emp.fullAttendanceBonus > 0 ? formatMoney(emp.fullAttendanceBonus) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('payroll.otherBonus')}</span>
              <span>{emp.otherBonus > 0 ? formatMoney(emp.otherBonus) : '-'}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="space-y-1 border-t pt-2">
          <p className="text-xs font-semibold text-muted-foreground">{t('payroll.insuranceDeduction')} / {t('payroll.advanceDeduction')}</p>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('payroll.insuranceDeduction')}</span>
              <span className="text-destructive">{emp.insuranceDeduction > 0 ? `-${formatMoney(emp.insuranceDeduction)}` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('payroll.advanceDeduction')}</span>
              <span className="text-warning">{emp.advanceAmount > 0 ? `-${formatMoney(emp.advanceAmount)}` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('payroll.penalty')}</span>
              <span className="text-destructive">{emp.penalty > 0 ? `-${formatMoney(emp.penalty)}` : '-'}</span>
            </div>
          </div>
        </div>

        {/* Attendance */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          {t('payroll.workDays')}: {emp.workDays} | {t('payroll.leaveDays')}: {emp.leaveDays}
        </div>

        {/* Footer: Net Salary + Actions */}
        <div className="flex items-center justify-between border-t pt-2">
          <div>
            <span className="text-xs text-muted-foreground">{t('payroll.netSalary')}</span>
            <p className="text-lg font-bold text-success">{formatMoney(emp.netSalary)}</p>
          </div>
          <div className="flex gap-1">
            {emp.isIssued ? (
              <span className="flex items-center text-success text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
              </span>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => handleEdit(emp)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" disabled={issuingId === emp.employeeId}>
                      {issuingId === emp.employeeId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('payroll.confirmIssue')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {`${t('payroll.issueConfirmSingle')} ${emp.name}: ${formatMoney(emp.netSalary)}`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleIssueSalary(emp)}>
                        {t('common.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('payroll.paymentMonth')}:</span>
          <Select value={paymentMonth} onValueChange={setPaymentMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(month => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {unissuedCount > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className={isMobile ? 'w-full' : ''}>
                <Send className="w-4 h-4 mr-2" />
                {t('payroll.issueAll')} ({unissuedCount})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('payroll.confirmIssue')}</AlertDialogTitle>
              <AlertDialogDescription>
                  {`${t('payroll.issueAllConfirm')} (${unissuedCount})`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleIssueAll}>
                  {t('common.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Mobile: Card view / Desktop: Table view */}
      {isMobile ? (
        <div className="space-y-3">
          {employeeSalaryList.map(renderMobileCard)}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">{t('payroll.employeeName')}</TableHead>
                <TableHead className="min-w-[80px]">{t('payroll.position')}</TableHead>
                <TableHead className="text-right min-w-[90px]">{t('payroll.baseSalary')}</TableHead>
                <TableHead className="text-right min-w-[90px]">{t('payroll.commission')}</TableHead>
                <TableHead className="text-right min-w-[90px]">{t('payroll.fullAttendanceBonus')}</TableHead>
                <TableHead className="text-right min-w-[90px]">{t('payroll.otherBonus')}</TableHead>
                <TableHead className="text-right min-w-[90px]">{t('payroll.companyInsurance')}</TableHead>
                <TableHead className="text-right min-w-[90px]">{t('payroll.insuranceDeduction')}</TableHead>
                <TableHead className="text-right min-w-[90px]">{t('payroll.advanceDeduction')}</TableHead>
                <TableHead className="text-right min-w-[70px]">{t('payroll.leaveDays')}</TableHead>
                <TableHead className="text-right min-w-[70px]">{t('payroll.workDays')}</TableHead>
                <TableHead className="text-right min-w-[80px]">{t('payroll.penalty')}</TableHead>
                <TableHead className="text-right min-w-[100px]">{t('payroll.netSalary')}</TableHead>
                <TableHead className="text-right min-w-[120px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeSalaryList.map((emp) => (
                <TableRow key={emp.employeeId} className={emp.isIssued ? 'bg-muted/30' : ''}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>{emp.position || '-'}</TableCell>
                  <TableCell className="text-right">{formatMoney(emp.baseSalary)}</TableCell>
                  <TableCell className="text-right text-primary">
                    {emp.commission > 0 ? formatMoney(emp.commission) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {emp.fullAttendanceBonus > 0 ? formatMoney(emp.fullAttendanceBonus) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {emp.otherBonus > 0 ? formatMoney(emp.otherBonus) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {emp.companyInsurance > 0 ? formatMoney(emp.companyInsurance) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {emp.insuranceDeduction > 0 ? `-${formatMoney(emp.insuranceDeduction)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-warning">
                    {emp.advanceAmount > 0 ? `-${formatMoney(emp.advanceAmount)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">{emp.leaveDays || '-'}</TableCell>
                  <TableCell className="text-right">{emp.workDays}</TableCell>
                  <TableCell className="text-right text-destructive">
                    {emp.penalty > 0 ? `-${formatMoney(emp.penalty)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success">
                    {formatMoney(emp.netSalary)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {emp.isIssued ? (
                        <span className="flex items-center text-success text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t('payroll.issued')}
                        </span>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={issuingId === emp.employeeId}>
                                {issuingId === emp.employeeId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4 text-primary" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('payroll.confirmIssue')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                    {`${t('payroll.issueConfirmSingle')} ${emp.name}: ${formatMoney(emp.netSalary)}`}
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleIssueSalary(emp)}>
                                  {t('common.confirm')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Total */}
      <div className="flex justify-end">
        <div className="text-lg">
          <span className="text-muted-foreground">{t('dashboard.total')}: </span>
          <span className="font-bold text-success">{formatMoney(totalNetSalary)}</span>
        </div>
      </div>

      {/* Edit dialog */}
      {editingEmployee && (
        <SalaryEditDialog
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
          employee={editingEmployee}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
