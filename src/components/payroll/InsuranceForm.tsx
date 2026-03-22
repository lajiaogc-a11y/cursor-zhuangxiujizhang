import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { saveInsurancePayment } from '@/services/payroll.service';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
}

interface InsurancePayment {
  id: string;
  employee_id: string;
  payment_date: string;
  payment_month: string;
  insurance_type: string;
  company_contribution: number;
  employee_contribution: number;
  total_amount: number;
  currency: string;
  account_type: string;
  amount_myr: number;
  remark: string | null;
}

interface InsuranceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insurance: InsurancePayment | null;
  employees: Employee[];
  onSuccess: () => void;
}

const INSURANCE_TYPES = ['EPF', 'SOCSO', 'EIS', 'PCB', '社保', '公积金', '其他'];

export function InsuranceForm({ open, onOpenChange, insurance, employees, onSuccess }: InsuranceFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_month: format(new Date(), 'yyyy-MM'),
    insurance_type: 'EPF',
    company_contribution: '',
    employee_contribution: '',
    currency: 'MYR',
    account_type: 'bank',
    remark: '',
  });

  useEffect(() => {
    if (insurance) {
      setFormData({
        employee_id: insurance.employee_id,
        payment_date: insurance.payment_date,
        payment_month: insurance.payment_month,
        insurance_type: insurance.insurance_type,
        company_contribution: insurance.company_contribution.toString(),
        employee_contribution: insurance.employee_contribution.toString(),
        currency: insurance.currency,
        account_type: insurance.account_type,
        remark: insurance.remark || '',
      });
    } else {
      setFormData({
        employee_id: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_month: format(new Date(), 'yyyy-MM'),
        insurance_type: 'EPF',
        company_contribution: '',
        employee_contribution: '',
        currency: 'MYR',
        account_type: 'bank',
        remark: '',
      });
    }
  }, [insurance, open]);

  const calculateTotal = () => {
    const company = parseFloat(formData.company_contribution) || 0;
    const employee = parseFloat(formData.employee_contribution) || 0;
    return company + employee;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast({ title: t('payroll.selectEmployeeRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);

    const totalAmount = calculateTotal();
    const data = {
      employee_id: formData.employee_id,
      payment_date: formData.payment_date,
      payment_month: formData.payment_month,
      insurance_type: formData.insurance_type,
      company_contribution: parseFloat(formData.company_contribution) || 0,
      employee_contribution: parseFloat(formData.employee_contribution) || 0,
      total_amount: totalAmount,
      currency: formData.currency as 'MYR' | 'CNY' | 'USD',
      account_type: formData.account_type as 'cash' | 'bank',
      amount_myr: totalAmount,
      remark: formData.remark.trim() || null,
      created_by: user?.id,
      tenant_id: tenant?.id,
    };

    try {
      await saveInsurancePayment(data, insurance?.id);
      toast({ title: insurance ? t('common.updateSuccess') : t('common.addSuccess') });
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {insurance ? t('payroll.editInsurance') : t('payroll.recordInsurance')}
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
              <Label>{t('payroll.insuranceType')} *</Label>
              <Select
                value={formData.insurance_type}
                onValueChange={(value) => setFormData({ ...formData, insurance_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('payroll.paymentMonth')} *</Label>
              <Input
                type="month"
                value={formData.payment_month}
                onChange={(e) => setFormData({ ...formData, payment_month: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.date')} *</Label>
              <DateInput
                value={formData.payment_date}
                onChange={(value) => setFormData({ ...formData, payment_date: value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('payroll.companyContribution')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.company_contribution}
                onChange={(e) => setFormData({ ...formData, company_contribution: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('payroll.employeeContribution')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.employee_contribution}
                onChange={(e) => setFormData({ ...formData, employee_contribution: e.target.value })}
                placeholder="0.00"
              />
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

          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">{t('payroll.totalAmount')}</div>
            <div className="text-lg font-semibold">{formatMoney(calculateTotal())}</div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
