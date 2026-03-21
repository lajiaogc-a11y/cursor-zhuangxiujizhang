import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { fetchActiveEmployees, fetchLatestExchangeRateForCurrency, createProject, updateProject } from '@/services/projects.service';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

interface Employee {
  id: string;
  name: string;
}

type CurrencyType = Database['public']['Enums']['currency_type'];
type ProjectStatus = Database['public']['Enums']['project_status'];

// Schema without hardcoded Chinese text
const projectSchema = z.object({
  project_code: z.string().min(1),
  project_name: z.string().min(1),
  customer_name: z.string().min(1),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  customer_nationality: z.string().optional(),
  customer_gender: z.string().optional(),
  customer_age: z.coerce.number().optional(),
  contract_currency: z.enum(['MYR', 'CNY', 'USD'] as const),
  contract_amount: z.coerce.number().min(0),
  exchange_rate_at_sign: z.coerce.number().min(0),
  referrer_name: z.string().optional(),
  referrer_commission_rate: z.coerce.number().optional(),
  project_manager: z.string().optional(),
  sign_date: z.string().min(1),
  delivery_date: z.string().optional(),
  actual_delivery_date: z.string().optional(),
  warranty_end_date: z.string().optional(),
  final_payment_date: z.string().optional(),
  status: z.enum(['in_progress', 'completed', 'paused'] as const),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: any;
  onSuccess: () => void;
}

interface DatePickerFieldProps {
  label: string;
  value: string | undefined;
  onChange: (date: string | undefined) => void;
  required?: boolean;
  error?: string;
}

function DatePickerField({ label, value, onChange, required, error, placeholder }: DatePickerFieldProps & { placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(value) : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}{required && ' *'}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(new Date(value), "yyyy-MM-dd") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : undefined);
              setOpen(false);
            }}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

export function ProjectForm({ open, onOpenChange, project, onSuccess }: ProjectFormProps) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [latestRate, setLatestRate] = useState<number>(1);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Fetch employees for referrer combobox
  useEffect(() => {
    const fetchEmployeesData = async () => {
      const data = await fetchActiveEmployees();
      setEmployees(data);
    };
    if (open) fetchEmployeesData();
  }, [open]);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      project_code: '',
      project_name: '',
      customer_name: '',
      contract_currency: 'MYR',
      contract_amount: 0,
      exchange_rate_at_sign: 1,
      status: 'in_progress',
      sign_date: new Date().toISOString().split('T')[0],
    },
  });

  const currency = watch('contract_currency');
  const amount = watch('contract_amount');
  const rate = watch('exchange_rate_at_sign');

  useEffect(() => {
    if (project) {
      reset({
        project_code: project.project_code,
        project_name: project.project_name,
        customer_name: project.customer_name,
        customer_phone: project.customer_phone || '',
        customer_address: project.customer_address || '',
        customer_nationality: project.customer_nationality || '',
        customer_gender: project.customer_gender || '',
        customer_age: project.customer_age || undefined,
        contract_currency: project.contract_currency,
        contract_amount: project.contract_amount,
        exchange_rate_at_sign: project.exchange_rate_at_sign,
        referrer_name: project.referrer_name || '',
        referrer_commission_rate: project.referrer_commission_rate || 0,
        project_manager: project.project_manager || '',
        sign_date: project.sign_date,
        delivery_date: project.delivery_date || '',
        actual_delivery_date: project.actual_delivery_date || '',
        warranty_end_date: project.warranty_end_date || '',
        final_payment_date: project.final_payment_date || '',
        status: project.status,
      });
    } else {
      reset({
        project_code: '',
        project_name: '',
        customer_name: '',
        contract_currency: 'MYR',
        contract_amount: 0,
        exchange_rate_at_sign: 1,
        status: 'in_progress',
        sign_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [project, reset]);

  useEffect(() => {
    const fetchRate = async () => {
      const rate = await fetchLatestExchangeRateForCurrency(currency);
      if (rate !== null) {
        setValue('exchange_rate_at_sign', rate);
        setLatestRate(rate);
      }
    };
    fetchRate();
  }, [currency, setValue]);

  const calculateMYR = () => {
    if (currency === 'MYR') return amount;
    return amount * rate;
  };

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    try {
      const contract_amount_myr = data.contract_currency === 'MYR' 
        ? data.contract_amount 
        : data.contract_amount * data.exchange_rate_at_sign;

      const referrer_commission_amount = data.referrer_commission_rate 
        ? contract_amount_myr * (data.referrer_commission_rate / 100)
        : 0;

      if (project) {
        await updateProject(project.id, {
          project_code: data.project_code,
          project_name: data.project_name,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone || null,
          customer_address: data.customer_address || null,
          customer_nationality: data.customer_nationality || null,
          customer_gender: data.customer_gender || null,
          customer_age: data.customer_age || null,
          contract_currency: data.contract_currency,
          contract_amount: data.contract_amount,
          contract_amount_myr,
          exchange_rate_at_sign: data.exchange_rate_at_sign,
          referrer_name: data.referrer_name || null,
          referrer_commission_rate: data.referrer_commission_rate || 0,
          referrer_commission_amount,
          project_manager: data.project_manager || null,
          sign_date: data.sign_date,
          delivery_date: data.delivery_date || null,
          actual_delivery_date: data.actual_delivery_date || null,
          warranty_end_date: data.warranty_end_date || null,
          final_payment_date: data.final_payment_date || null,
          status: data.status,
        });
        toast.success(t('projects.updateSuccess'));
      } else {
        await createProject({
          project_code: data.project_code,
          project_name: data.project_name,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone || null,
          customer_address: data.customer_address || null,
          customer_nationality: data.customer_nationality || null,
          customer_gender: data.customer_gender || null,
          customer_age: data.customer_age || null,
          contract_currency: data.contract_currency,
          contract_amount: data.contract_amount,
          contract_amount_myr,
          exchange_rate_at_sign: data.exchange_rate_at_sign,
          referrer_name: data.referrer_name || null,
          referrer_commission_rate: data.referrer_commission_rate || 0,
          referrer_commission_amount,
          project_manager: data.project_manager || null,
          sign_date: data.sign_date,
          delivery_date: data.delivery_date || null,
          actual_delivery_date: data.actual_delivery_date || null,
          warranty_end_date: data.warranty_end_date || null,
          final_payment_date: data.final_payment_date || null,
          status: data.status,
          created_by: user?.id,
          tenant_id: tenant?.id,
        });
        toast.success(t('projects.createSuccess'));
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? t('projects.editProject') : t('projects.newProject')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">{t('projects.basicInfo')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project_code">{t('projects.projectCode')} *</Label>
                <Input id="project_code" {...register('project_code')} placeholder="P2024001" />
                {errors.project_code && <p className="text-destructive text-sm mt-1">{t('validation.projectCodeRequired')}</p>}
              </div>
              <div>
                <Label htmlFor="project_name">{t('projects.projectName')} *</Label>
                <Input id="project_name" {...register('project_name')} />
                {errors.project_name && <p className="text-destructive text-sm mt-1">{t('validation.projectNameRequired')}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <DatePickerField
                label={t('projects.signDate')}
                value={watch('sign_date')}
                onChange={(date) => setValue('sign_date', date || '')}
                required
                error={errors.sign_date?.message}
                placeholder={t('common.selectDate')}
              />
              <div>
                <Label htmlFor="status">{t('common.status')}</Label>
                <Select 
                  value={watch('status')} 
                  onValueChange={(value: ProjectStatus) => setValue('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">{t('projects.inProgress')}</SelectItem>
                    <SelectItem value="completed">{t('projects.completed')}</SelectItem>
                    <SelectItem value="paused">{t('projects.paused')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="project_manager">{t('projects.manager')}</Label>
                <Input id="project_manager" {...register('project_manager')} />
              </div>
            </div>
          </div>

          {/* 客户信息 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">{t('projects.customerInfo')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">{t('projects.customerName')} *</Label>
                <Input id="customer_name" {...register('customer_name')} />
                {errors.customer_name && <p className="text-destructive text-sm mt-1">{t('validation.customerNameRequired')}</p>}
              </div>
              <div>
                <Label htmlFor="customer_phone">{t('projects.customerPhone')}</Label>
                <Input id="customer_phone" {...register('customer_phone')} />
              </div>
            </div>
            <div>
              <Label htmlFor="customer_address">{t('projects.customerAddress')}</Label>
              <Input id="customer_address" {...register('customer_address')} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customer_nationality">{t('projects.customerNationality')}</Label>
                <Input id="customer_nationality" {...register('customer_nationality')} />
              </div>
              <div>
                <Label htmlFor="customer_gender">{t('projects.customerGender')}</Label>
                <Select 
                  value={watch('customer_gender') || ''} 
                  onValueChange={(value) => setValue('customer_gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('projects.male')}</SelectItem>
                    <SelectItem value="female">{t('projects.female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="customer_age">{t('projects.customerAge')}</Label>
                <Input id="customer_age" type="number" {...register('customer_age')} />
              </div>
            </div>
          </div>

          {/* 合同信息 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">{t('projects.contractInfo')}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contract_currency">{t('projects.contractCurrency')}</Label>
                <Select 
                  value={watch('contract_currency')} 
                  onValueChange={(value: CurrencyType) => setValue('contract_currency', value)}
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
                <Label htmlFor="contract_amount">{t('projects.contractAmount')} *</Label>
                <Input id="contract_amount" type="number" step="0.01" {...register('contract_amount')} />
                {errors.contract_amount && <p className="text-destructive text-sm mt-1">{t('validation.amountPositive')}</p>}
              </div>
              <div>
                <Label htmlFor="exchange_rate_at_sign">{t('projects.signRate')}</Label>
                <Input 
                  id="exchange_rate_at_sign" 
                  type="number" 
                  step="0.001" 
                  value={rate ? Number(rate).toFixed(3) : ''} 
                  onChange={(e) => setValue('exchange_rate_at_sign', parseFloat(e.target.value) || 0)}
                  disabled={currency === 'MYR'}
                />
              </div>
            </div>
            {currency !== 'MYR' && (
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">{t('projects.myrEquivalent')}: </span>
                <span className="font-bold text-lg">RM {calculateMYR().toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          {/* 介绍人信息 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">{t('projects.referrerInfo')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('projects.referrerName')}</Label>
                <Combobox
                  options={employees.map(e => ({ value: e.name, label: e.name }))}
                  value={watch('referrer_name') || ''}
                  onValueChange={(value) => setValue('referrer_name', value)}
                  placeholder={t('projects.selectOrEnterReferrer')}
                  searchPlaceholder={t('common.search')}
                  emptyText={t('common.noData')}
                  allowCustomValue={true}
                />
              </div>
              <div>
                <Label htmlFor="referrer_commission_rate">{t('projects.commissionRate')} (%)</Label>
                <Input id="referrer_commission_rate" type="number" step="0.1" {...register('referrer_commission_rate')} />
              </div>
            </div>
          </div>

          {/* 日期信息 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">{t('projects.importantDates')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <DatePickerField
                label={t('projects.deliveryDate')}
                value={watch('delivery_date')}
                onChange={(date) => setValue('delivery_date', date || '')}
                placeholder={t('common.selectDate')}
              />
              <DatePickerField
                label={t('projects.actualDeliveryDate')}
                value={watch('actual_delivery_date')}
                onChange={(date) => {
                  setValue('actual_delivery_date', date || '');
                  // 自动计算保修截止日期（实际交付日期 + 1年）
                  if (date) {
                    const deliveryDate = new Date(date);
                    deliveryDate.setFullYear(deliveryDate.getFullYear() + 1);
                    const warrantyEndDate = format(deliveryDate, 'yyyy-MM-dd');
                    setValue('warranty_end_date', warrantyEndDate);
                    // 尾款到期日期等于保修截止日期
                    setValue('final_payment_date', warrantyEndDate);
                  }
                }}
                placeholder={t('common.selectDate')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DatePickerField
                label={t('projects.warrantyEndDate')}
                value={watch('warranty_end_date')}
                onChange={(date) => {
                  setValue('warranty_end_date', date || '');
                  // 尾款到期日期同步更新
                  if (date) {
                    setValue('final_payment_date', date);
                  }
                }}
                placeholder={t('common.selectDate')}
              />
              <DatePickerField
                label={t('projects.finalPaymentDate')}
                value={watch('final_payment_date')}
                onChange={(date) => setValue('final_payment_date', date || '')}
                placeholder={t('common.selectDate')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('form.cancel')}</Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('form.saving') : (project ? t('projects.updateProject') : t('projects.createProject'))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
