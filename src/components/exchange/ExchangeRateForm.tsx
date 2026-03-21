import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { upsertExchangeRate } from '@/services/exchanges.service';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type ExchangeRate = Tables<'exchange_rates'>;
type CurrencyType = 'MYR' | 'CNY' | 'USD';

const formSchema = z.object({
  from_currency: z.enum(['MYR', 'CNY', 'USD'] as const),
  to_currency: z.enum(['MYR', 'CNY', 'USD'] as const),
  rate: z.string().min(1),
  rate_date: z.date(),
  source: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ExchangeRateFormProps {
  exchangeRate?: ExchangeRate | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExchangeRateForm({ exchangeRate, onSuccess, onCancel }: ExchangeRateFormProps) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const currencyLabels: Record<CurrencyType, string> = {
    MYR: t('currency.myrFull'),
    CNY: t('currency.cnyFull'),
    USD: t('currency.usdFull'),
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from_currency: exchangeRate?.from_currency || 'CNY',
      to_currency: exchangeRate?.to_currency || 'MYR',
      rate: exchangeRate?.rate?.toString() || '',
      rate_date: exchangeRate ? new Date(exchangeRate.rate_date) : new Date(),
      source: exchangeRate?.source || 'manual',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({ title: t('toast.loginRequired'), variant: 'destructive' });
      return;
    }

    if (data.from_currency === data.to_currency) {
      toast({ title: t('toast.sameCurrencyError'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        from_currency: data.from_currency,
        to_currency: data.to_currency,
        rate: parseFloat(data.rate),
        rate_date: format(data.rate_date, 'yyyy-MM-dd'),
        source: data.source || 'manual',
        created_by: user.id,
        tenant_id: tenant?.id,
      };

      await upsertExchangeRate(payload, exchangeRate?.id);
      toast({ title: exchangeRate ? t('toast.rateUpdated') : t('toast.rateAdded') });

      onSuccess();
    } catch (error: any) {
      toast({
        title: exchangeRate ? t('toast.updateFailed') : t('toast.addFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="from_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.sourceCurrency')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('form.selectCurrency')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(currencyLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="to_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.targetCurrency')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('form.selectCurrency')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(currencyLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.rateLabel')} (1 {form.watch('from_currency')} = ? {form.watch('to_currency')})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.0001"
                  min="0"
                  placeholder={t('form.ratePlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rate_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.effectiveDate')}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'yyyy-MM-dd') : t('common.selectDate')}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.source')}</FormLabel>
              <FormControl>
                <Input placeholder={t('form.sourcePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('form.cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('form.saving') : exchangeRate ? t('form.update') : t('form.add')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
