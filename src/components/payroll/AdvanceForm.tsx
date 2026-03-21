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
import { saveSalaryAdvance } from '@/services/payroll.service';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
}

interface SalaryAdvance {
  id: string;
  employee_id: string;
  advance_date: string;
  amount: number;
  currency: string;
  account_type: string;
  exchange_rate: number;
  amount_myr: number;
  remark: string | null;
}

interface AdvanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advance: SalaryAdvance | null;
  employees: Employee[];
  onSuccess: () => void;
}

export function AdvanceForm({ open, onOpenChange, advance, employees, onSuccess }: AdvanceFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    advance_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    currency: 'MYR',
    account_type: 'cash',
    exchange_rate: '1',
    remark: '',
  });

  useEffect(() => {
    if (advance) {
      setFormData({
        employee_id: advance.employee_id,
        advance_date: advance.advance_date,
        amount: advance.amount.toString(),
        currency: advance.currency,
        account_type: advance.account_type,
        exchange_rate: advance.exchange_rate.toString(),
        remark: advance.remark || '',
      });
    } else {
      setFormData({
        employee_id: '',
        advance_date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        currency: 'MYR',
        account_type: 'cash',
        exchange_rate: '1',
        remark: '',
      });
    }
  }, [advance, open]);

  const calculateAmountMYR = () => {
    const amount = parseFloat(formData.amount) || 0;
    const rate = parseFloat(formData.exchange_rate) || 1;
    if (formData.currency === 'MYR') return amount;
    return amount * rate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast({ title: t('payroll.selectEmployeeRequired'), variant: 'destructive' });
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({ title: t('payroll.amountRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);

    const data = {
      employee_id: formData.employee_id,
      advance_date: formData.advance_date,
      amount: parseFloat(formData.amount),
      currency: formData.currency as 'MYR' | 'CNY' | 'USD',
      account_type: formData.account_type as 'cash' | 'bank',
      exchange_rate: parseFloat(formData.exchange_rate) || 1,
      amount_myr: calculateAmountMYR(),
      remark: formData.remark.trim() || null,
      created_by: user?.id,
      tenant_id: tenant?.id,
    };

    try {
      await saveSalaryAdvance(data, advance?.id);
      toast({ title: advance ? t('common.updateSuccess') : t('common.addSuccess') });
      onSuccess();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {advance ? t('payroll.editAdvance') : t('payroll.recordAdvance')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="advance_date">{t('common.date')} *</Label>
            <DateInput
              id="advance_date"
              value={formData.advance_date}
              onChange={(value) => setFormData({ ...formData, advance_date: value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('common.amount')} *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
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
          </div>

          {formData.currency !== 'MYR' && (
            <div className="space-y-2">
              <Label htmlFor="exchange_rate">{t('transactions.exchangeRate')}</Label>
              <Input
                id="exchange_rate"
                type="number"
                step="0.0001"
                value={formData.exchange_rate}
                onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
              />
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="remark">{t('common.remark')}</Label>
            <Textarea
              id="remark"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder={t('payroll.advanceRemarkPlaceholder')}
              rows={2}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">{t('transactions.myrEquivalent')}</div>
            <div className="text-lg font-semibold">
              RM {calculateAmountMYR().toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
