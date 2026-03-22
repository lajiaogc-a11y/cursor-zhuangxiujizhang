import { useState, useEffect, useMemo } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { saveSalaryPayment, markAdvancesAsDeducted } from '@/services/payroll.service';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { format } from 'date-fns';
import { useSystemCurrency } from '@/hooks/useSystemCurrency';

interface Employee {
  id: string;
  name: string;
  monthly_salary: number;
}

interface SalaryAdvance {
  id: string;
  employee_id: string;
  advance_date: string;
  amount: number;
  amount_myr: number;
  currency: string;
  remark: string | null;
  is_deducted: boolean;
}

interface SalaryPayment {
  id: string;
  employee_id: string;
  payment_date: string;
  payment_month: string;
  base_salary: number;
  bonus: number;
  overtime_pay: number;
  gross_salary: number;
  advance_deduction: number;
  insurance_deduction: number;
  other_deduction: number;
  net_salary: number;
  currency: string;
  account_type: string;
  exchange_rate: number;
  amount_myr: number;
  remark: string | null;
}

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: SalaryPayment | null;
  employees: Employee[];
  advances: SalaryAdvance[];
  onSuccess: () => void;
}

export function PaymentForm({ open, onOpenChange, payment, employees, advances, onSuccess }: PaymentFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const { systemCurrency } = useSystemCurrency();

  const [formData, setFormData] = useState({
    employee_id: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_month: format(new Date(), 'yyyy-MM'),
    base_salary: '',
    bonus: '0',
    overtime_pay: '0',
    insurance_deduction: '0',
    other_deduction: '0',
    currency: systemCurrency as string,
    account_type: 'bank',
    exchange_rate: '1',
    remark: '',
  });

  const [selectedAdvances, setSelectedAdvances] = useState<string[]>([]);

  useEffect(() => {
    if (payment) {
      setFormData({
        employee_id: payment.employee_id,
        payment_date: payment.payment_date,
        payment_month: payment.payment_month,
        base_salary: payment.base_salary.toString(),
        bonus: payment.bonus.toString(),
        overtime_pay: payment.overtime_pay.toString(),
        insurance_deduction: payment.insurance_deduction.toString(),
        other_deduction: payment.other_deduction.toString(),
        currency: payment.currency,
        account_type: payment.account_type,
        exchange_rate: payment.exchange_rate.toString(),
        remark: payment.remark || '',
      });
    } else {
      setFormData({
        employee_id: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_month: format(new Date(), 'yyyy-MM'),
        base_salary: '',
        bonus: '0',
        overtime_pay: '0',
        insurance_deduction: '0',
        other_deduction: '0',
        currency: systemCurrency as string,
        account_type: 'bank',
        exchange_rate: '1',
        remark: '',
      });
      setSelectedAdvances([]);
    }
  }, [payment, open]);

  // 当选择员工时，自动填充月薪
  useEffect(() => {
    if (formData.employee_id && !payment) {
      const emp = employees.find(e => e.id === formData.employee_id);
      if (emp) {
        setFormData(prev => ({ ...prev, base_salary: emp.monthly_salary.toString() }));
      }
    }
  }, [formData.employee_id, employees, payment]);

  // 获取选中员工的未扣除预支
  const employeeAdvances = useMemo(() => {
    if (!formData.employee_id) return [];
    return advances.filter(a => a.employee_id === formData.employee_id && !a.is_deducted);
  }, [advances, formData.employee_id]);

  // 计算金额
  const calculations = useMemo(() => {
    const baseSalary = parseFloat(formData.base_salary) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const overtimePay = parseFloat(formData.overtime_pay) || 0;
    const grossSalary = baseSalary + bonus + overtimePay;

    const advanceDeduction = selectedAdvances.reduce((sum, advId) => {
      const adv = employeeAdvances.find(a => a.id === advId);
      return sum + (adv?.amount_myr || 0);
    }, 0);

    const insuranceDeduction = parseFloat(formData.insurance_deduction) || 0;
    const otherDeduction = parseFloat(formData.other_deduction) || 0;
    const totalDeduction = advanceDeduction + insuranceDeduction + otherDeduction;
    const netSalary = grossSalary - totalDeduction;

    const exchangeRate = parseFloat(formData.exchange_rate) || 1;
    const amountMyr = formData.currency === 'MYR' ? netSalary : netSalary * exchangeRate;

    return { grossSalary, advanceDeduction, totalDeduction, netSalary, amountMyr };
  }, [formData, selectedAdvances, employeeAdvances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast({ title: t('payroll.selectEmployeeRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);

    const data = {
      employee_id: formData.employee_id,
      payment_date: formData.payment_date,
      payment_month: formData.payment_month,
      base_salary: parseFloat(formData.base_salary) || 0,
      bonus: parseFloat(formData.bonus) || 0,
      overtime_pay: parseFloat(formData.overtime_pay) || 0,
      gross_salary: calculations.grossSalary,
      advance_deduction: calculations.advanceDeduction,
      insurance_deduction: parseFloat(formData.insurance_deduction) || 0,
      other_deduction: parseFloat(formData.other_deduction) || 0,
      net_salary: calculations.netSalary,
      currency: formData.currency as 'MYR' | 'CNY' | 'USD',
      account_type: formData.account_type as 'cash' | 'bank',
      exchange_rate: parseFloat(formData.exchange_rate) || 1,
      amount_myr: calculations.amountMyr,
      remark: formData.remark.trim() || null,
      created_by: user?.id,
      tenant_id: tenant?.id,
    };

    try {
      const paymentId = await saveSalaryPayment(data, payment?.id);
      if (selectedAdvances.length > 0 && paymentId) {
        await markAdvancesAsDeducted(selectedAdvances, paymentId);
      }
      toast({ title: payment ? t('common.updateSuccess') : t('common.addSuccess') });
      onSuccess();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number) => {
    return `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {payment ? t('payroll.editPayment') : t('payroll.paySalary')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('payroll.selectEmployee')} *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('payroll.selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('payroll.paymentMonth')} *</Label>
              <Input
                type="month"
                value={formData.payment_month}
                onChange={(e) => setFormData({ ...formData, payment_month: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('common.date')} *</Label>
            <DateInput
              value={formData.payment_date}
              onChange={(value) => setFormData({ ...formData, payment_date: value })}
            />
          </div>

          {/* 工资明细 */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium">{t('payroll.salaryDetails')}</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('payroll.baseSalary')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.base_salary}
                  onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('payroll.bonus')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('payroll.overtimePay')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.overtime_pay}
                  onChange={(e) => setFormData({ ...formData, overtime_pay: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="text-right text-sm">
              {t('payroll.grossSalary')}: <span className="font-semibold">{formatMoney(calculations.grossSalary)}</span>
            </div>
          </div>

          {/* 扣除项目 */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium">{t('payroll.deductions')}</h4>
            
            {/* 预支扣除 */}
            {employeeAdvances.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">{t('payroll.undeductedAdvances')}</Label>
                <div className="border rounded p-2 space-y-2 max-h-32 overflow-y-auto">
                  {employeeAdvances.map((adv) => (
                    <div key={adv.id} className="flex items-center gap-2">
                      <Checkbox
                        id={adv.id}
                        checked={selectedAdvances.includes(adv.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAdvances([...selectedAdvances, adv.id]);
                          } else {
                            setSelectedAdvances(selectedAdvances.filter(id => id !== adv.id));
                          }
                        }}
                      />
                      <label htmlFor={adv.id} className="text-sm flex-1 cursor-pointer">
                        {format(new Date(adv.advance_date), 'yyyy-MM-dd')} - {formatMoney(adv.amount_myr)}
                        {adv.remark && <span className="text-muted-foreground ml-2">({adv.remark})</span>}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="text-right text-sm text-warning">
                  {t('payroll.advanceDeduction')}: -{formatMoney(calculations.advanceDeduction)}
                </div>
              </div>
            )}
            {employeeAdvances.length === 0 && formData.employee_id && (
              <div className="text-sm text-muted-foreground">{t('payroll.noAdvances')}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('payroll.insuranceDeduction')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.insurance_deduction}
                  onChange={(e) => setFormData({ ...formData, insurance_deduction: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('payroll.otherDeduction')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.other_deduction}
                  onChange={(e) => setFormData({ ...formData, other_deduction: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="text-right text-sm text-destructive">
              {t('payroll.totalDeduction')}: -{formatMoney(calculations.totalDeduction)}
            </div>
          </div>

          {/* 实发工资 */}
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">{t('payroll.netSalary')}</span>
              <span className="text-2xl font-bold text-primary">{formatMoney(calculations.netSalary)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('transactions.currency')}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MYR">{t('currency.myrFull')}</SelectItem>
                  <SelectItem value="CNY">{t('currency.cnyFull')}</SelectItem>
                  <SelectItem value="USD">{t('currency.usdFull')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('transactions.account')}</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('account.cash')}</SelectItem>
                  <SelectItem value="bank">{t('account.bank')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('common.remark')}</Label>
            <Textarea
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
              {t('payroll.confirmPayment')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
