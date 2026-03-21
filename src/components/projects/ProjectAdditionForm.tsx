import { useState, useEffect } from 'react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as exchangeService from '@/services/exchanges.service';
import * as projectsService from '@/services/projects.service';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const additionSchema = z.object({
  addition_date: z.date(),
  description: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  currency: z.enum(['MYR', 'CNY', 'USD'] as const),
  exchange_rate: z.coerce.number().min(0),
  is_paid: z.boolean(),
  remark: z.string().optional(),
});

type AdditionFormData = z.infer<typeof additionSchema>;

interface Addition {
  id: string;
  addition_date: string;
  description: string;
  amount: number;
  currency: string;
  exchange_rate?: number;
  is_paid: boolean;
  remark: string | null;
}

interface ProjectAdditionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  addition?: Addition | null;
  onSuccess: () => void;
}

export function ProjectAdditionForm({ open, onOpenChange, projectId, addition, onSuccess }: ProjectAdditionFormProps) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [rateInput, setRateInput] = useState('1');
  const [useAutoRate, setUseAutoRate] = useState(true);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<AdditionFormData>({
    resolver: zodResolver(additionSchema),
    defaultValues: {
      addition_date: new Date(),
      description: '',
      amount: 0,
      currency: 'MYR',
      exchange_rate: 1,
      is_paid: false,
      remark: '',
    },
  });

  const currency = watch('currency');
  const amount = watch('amount');
  const rate = watch('exchange_rate');
  const additionDate = watch('addition_date');
  const isPaid = watch('is_paid');

  useEffect(() => {
    if (addition) {
      reset({
        addition_date: new Date(addition.addition_date),
        description: addition.description,
        amount: addition.amount,
        currency: addition.currency as 'MYR' | 'CNY' | 'USD',
        exchange_rate: addition.exchange_rate || 1,
        is_paid: addition.is_paid,
        remark: addition.remark || '',
      });
      setRateInput((addition.exchange_rate || 1).toFixed(4));
      setUseAutoRate(false);
    } else {
      reset({
        addition_date: new Date(),
        description: '',
        amount: 0,
        currency: 'MYR',
        exchange_rate: 1,
        is_paid: false,
        remark: '',
      });
      setRateInput('1');
      setUseAutoRate(true);
    }
  }, [addition, reset, open]);

  useEffect(() => {
    const fetchRate = async () => {
      if (currency === 'MYR') {
        setValue('exchange_rate', 1);
        setRateInput('1');
        return;
      }
      if (!useAutoRate) return;
      
      try {
        const rate = await exchangeService.fetchLatestPairRate(currency, 'MYR');
        if (rate) {
          setValue('exchange_rate', rate);
          setRateInput(rate.toFixed(4));
        }
      } catch { /* ignore */ }
    };
    fetchRate();
  }, [currency, setValue, useAutoRate]);

  const calculateMYR = () => {
    if (currency === 'MYR') return amount;
    return amount * rate;
  };

  const onSubmit = async (data: AdditionFormData) => {
    setLoading(true);
    try {
      const amount_myr = data.currency === 'MYR' ? data.amount : data.amount * data.exchange_rate;
      const additionDateStr = format(data.addition_date, 'yyyy-MM-dd');

      const payload = {
        project_id: projectId,
        addition_date: additionDateStr,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        exchange_rate: data.exchange_rate,
        amount_myr,
        is_paid: data.is_paid,
        remark: data.remark || null,
        created_by: user?.id,
        tenant_id: tenant?.id,
      };

      if (addition) {
        await projectsService.saveProjectAddition(payload, addition.id);
        toast.success(t('toast.additionUpdated'));
      } else {
        await projectsService.saveProjectAddition(payload);
        toast.success(t('toast.additionAdded'));
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || t('toast.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{addition ? t('form.editAddition') : t('form.addAddition')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>{t('form.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !additionDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {additionDate ? format(additionDate, 'yyyy-MM-dd') : t('common.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={additionDate}
                  onSelect={(date) => date && setValue('addition_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>{t('form.description')}</Label>
            <Input {...register('description')} placeholder={t('form.descriptionPlaceholder')} />
            {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('form.currency')}</Label>
              <Select 
                value={watch('currency')} 
                onValueChange={(value: 'MYR' | 'CNY' | 'USD') => setValue('currency', value)}
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
            <div>
              <Label>{t('form.amount')}</Label>
              <Input type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          {currency !== 'MYR' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('form.exchangeRate')}</Label>
                <Input 
                  type="text"
                  inputMode="decimal"
                  placeholder={t('form.ratePlaceholder')}
                  value={rateInput}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // 允许空值、数字、小数点（最多4位小数）
                    if (inputValue === '' || /^\d*\.?\d{0,4}$/.test(inputValue)) {
                      setRateInput(inputValue);
                      setUseAutoRate(false); // 手动输入时切换到手动模式
                      const numVal = parseFloat(inputValue);
                      if (!isNaN(numVal) && numVal > 0) {
                        setValue('exchange_rate', numVal);
                      }
                    }
                  }}
                  onBlur={() => {
                    const numVal = parseFloat(rateInput);
                    if (!isNaN(numVal) && numVal > 0) {
                      setRateInput(numVal.toFixed(4));
                      setValue('exchange_rate', numVal);
                    } else {
                      setRateInput('1.0000');
                      setValue('exchange_rate', 1);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('form.rateHint')}</p>
              </div>
              <div>
                <Label>{t('form.myrEquivalent')}</Label>
                <div className="h-10 px-3 flex items-center bg-muted rounded-md">
                  RM {calculateMYR().toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="is_paid" 
              checked={isPaid}
              onCheckedChange={(checked) => setValue('is_paid', checked as boolean)}
            />
            <Label htmlFor="is_paid" className="cursor-pointer">{t('form.isPaid')}</Label>
          </div>

          <div>
            <Label>{t('form.remark')}</Label>
            <Textarea {...register('remark')} placeholder={t('form.remarkPlaceholder')} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('form.saving') : t('form.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
