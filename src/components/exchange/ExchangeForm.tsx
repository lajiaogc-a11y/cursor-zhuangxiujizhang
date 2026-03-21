import { useState, useEffect } from 'react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { exchangesService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

type ExchangeTransaction = Tables<'exchange_transactions'>;
type AccountType = 'cash' | 'bank';
type CurrencyType = 'MYR' | 'CNY' | 'USD';

// Schema without hardcoded Chinese text - validation messages use t() in component
const formSchema = z.object({
  transaction_date: z.date(),
  out_currency: z.enum(['MYR', 'CNY', 'USD'] as const),
  out_amount: z.string().min(1),
  out_account_type: z.enum(['cash', 'bank'] as const),
  in_currency: z.enum(['MYR', 'CNY', 'USD'] as const),
  in_amount: z.string().min(1),
  in_account_type: z.enum(['cash', 'bank'] as const),
  exchange_rate: z.string().min(1),
  remark: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ExchangeFormProps {
  exchange?: ExchangeTransaction | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExchangeForm({ exchange, onSuccess, onCancel }: ExchangeFormProps) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [useAutoRate, setUseAutoRate] = useState(!exchange); // 新增时自动，编辑时手动

  // Dynamic labels using t()
  const getCurrencyLabel = (currency: CurrencyType) => {
    const labels: Record<CurrencyType, string> = {
      MYR: t('currency.myrFull'),
      CNY: t('currency.cnyFull'),
      USD: t('currency.usdFull'),
    };
    return labels[currency];
  };

  const getAccountLabel = (account: AccountType) => {
    const labels: Record<AccountType, string> = {
      cash: t('account.cash'),
      bank: t('account.bank'),
    };
    return labels[account];
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_date: exchange ? new Date(exchange.transaction_date) : new Date(),
      out_currency: exchange?.out_currency || 'CNY',
      out_amount: exchange?.out_amount?.toString() || '',
      out_account_type: exchange?.out_account_type || 'cash',
      in_currency: exchange?.in_currency || 'MYR',
      in_amount: exchange?.in_amount?.toString() || '',
      in_account_type: exchange?.in_account_type || 'cash',
      exchange_rate: exchange?.exchange_rate?.toString() || '',
      remark: exchange?.remark || '',
    },
  });

  const outCurrency = form.watch('out_currency');
  const inCurrency = form.watch('in_currency');
  const outAmount = form.watch('out_amount');
  const inAmount = form.watch('in_amount');
  const exchangeRate = form.watch('exchange_rate');

  // 获取所有汇率
  useEffect(() => {
    exchangesService.fetchLatestRateMap().then(setExchangeRates);
  }, []);

  // 自动获取汇率
  const fetchExchangeRate = async () => {
    if (outCurrency === inCurrency) return;
    
    setFetchingRate(true);
    try {
      const pairRate = await exchangesService.fetchLatestPairRate(outCurrency, inCurrency);
      
      if (pairRate) {
        form.setValue('exchange_rate', pairRate.toFixed(3));
        toast({ title: t('exchange.rateObtained'), description: `1 ${outCurrency} = ${pairRate.toFixed(3)} ${inCurrency}` });
      } else {
        // 如果没有直接汇率，尝试通过MYR换算
        const outToMyr = exchangeRates[`${outCurrency}_MYR`] || (outCurrency === 'MYR' ? 1 : null);
        const inToMyr = exchangeRates[`${inCurrency}_MYR`] || (inCurrency === 'MYR' ? 1 : null);
        
        if (outToMyr && inToMyr) {
          const rate = outToMyr / inToMyr;
          form.setValue('exchange_rate', rate.toFixed(3));
          toast({ title: t('exchange.rateCalculated'), description: `1 ${outCurrency} ≈ ${rate.toFixed(3)} ${inCurrency}` });
        } else {
          toast({ title: t('exchange.rateNotFound'), description: t('exchange.pleaseInputManually'), variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Failed to fetch rate:', error);
    } finally {
      setFetchingRate(false);
    }
  };

  // 当币种改变时自动获取汇率（仅在自动模式下）
  useEffect(() => {
    if (useAutoRate && outCurrency && inCurrency && outCurrency !== inCurrency && !exchange) {
      fetchExchangeRate();
    }
  }, [outCurrency, inCurrency, useAutoRate]);

  // 根据输入自动计算另一边
  useEffect(() => {
    const rate = parseFloat(exchangeRate);
    const out = parseFloat(outAmount);
    
    if (rate > 0 && out > 0 && !inAmount) {
      const calculated = (out * rate).toFixed(2);
      form.setValue('in_amount', calculated);
    }
  }, [outAmount, exchangeRate]);

  // 获取币种对MYR的汇率
  const getMyrRate = (currency: CurrencyType): number => {
    if (currency === 'MYR') return 1;
    return exchangeRates[`${currency}_MYR`] || 1;
  };

  // 计算盈亏(MYR) - 使用表单输入的汇率实时计算
  // 盈亏 = 收入折合MYR - 支出折合MYR
  // 计算逻辑：根据当前输入的汇率来计算MYR价值
  const calculateProfitLoss = (
    outAmt: number, 
    outCur: CurrencyType, 
    inAmt: number, 
    inCur: CurrencyType, 
    currentRate: number
  ): number => {
    let outMyr: number;
    let inMyr: number;
    
    // 场景1: CNY → MYR (支出CNY，收入MYR)
    // 汇率含义: 1 CNY = currentRate MYR
    // 支出MYR价值 = outAmt * currentRate (使用用户输入的汇率)
    // 收入MYR价值 = inAmt
    if (outCur !== 'MYR' && inCur === 'MYR' && currentRate > 0) {
      outMyr = outAmt * currentRate;
      inMyr = inAmt;
    }
    // 场景2: MYR → CNY (支出MYR，收入CNY)
    // 汇率含义: 1 MYR = currentRate CNY
    // 支出MYR价值 = outAmt
    // 收入MYR价值 = inAmt / currentRate (使用用户输入的汇率)
    else if (outCur === 'MYR' && inCur !== 'MYR' && currentRate > 0) {
      outMyr = outAmt;
      inMyr = inAmt / currentRate;
    }
    // 场景3: 两边都不是MYR，使用系统汇率
    else {
      outMyr = outAmt * getMyrRate(outCur);
      inMyr = inAmt * getMyrRate(inCur);
    }
    
    return Number((inMyr - outMyr).toFixed(2));
  };

  // 显示预计盈亏 - 使用当前表单的汇率和金额实时计算
  const getPreviewProfitLoss = () => {
    const out = parseFloat(outAmount) || 0;
    const inAmt = parseFloat(inAmount) || 0;
    const rate = parseFloat(exchangeRate) || 0;
    if (out > 0 && inAmt > 0 && rate > 0) {
      const pl = calculateProfitLoss(out, outCurrency, inAmt, inCurrency, rate);
      return pl;
    }
    return 0;
  };

  // 确保预计盈亏随输入值实时更新
  const previewPL = getPreviewProfitLoss();

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({ title: t('toast.loginRequired'), variant: 'destructive' });
      return;
    }

    if (data.out_currency === data.in_currency) {
      toast({ title: t('exchange.sameCurrencyError'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const outAmount = parseFloat(data.out_amount);
      const inAmount = parseFloat(data.in_amount);
      const exchangeRateValue = parseFloat(data.exchange_rate);

      const outAmountMyr = outAmount * getMyrRate(data.out_currency);
      const inAmountMyr = inAmount * getMyrRate(data.in_currency);
      
      // 使用与预览相同的计算逻辑来确保保存的profit_loss与预览一致
      const profitLoss = calculateProfitLoss(outAmount, data.out_currency, inAmount, data.in_currency, exchangeRateValue);

      const payload = {
        transaction_date: format(data.transaction_date, 'yyyy-MM-dd'),
        out_currency: data.out_currency,
        out_amount: outAmount,
        out_amount_myr: Number(outAmountMyr.toFixed(2)),
        out_account_type: data.out_account_type,
        in_currency: data.in_currency,
        in_amount: inAmount,
        in_amount_myr: Number(inAmountMyr.toFixed(2)),
        in_account_type: data.in_account_type,
        exchange_rate: exchangeRateValue,
        profit_loss: profitLoss,
        remark: data.remark || null,
        created_by: user.id,
        tenant_id: tenant?.id,
      };

      if (exchange) {
        await exchangesService.updateExchangeTransactionWithBalances(
          exchange.id,
          exchange as any,
          payload as any
        );
        toast({ title: t('exchange.updated') });
      } else {
        await exchangesService.createExchangeTransactionWithBalances(payload as any);
        toast({ title: t('exchange.created') });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: exchange ? t('toast.updateFailed') : t('toast.addFailed'),
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
        <FormField
          control={form.control}
          name="transaction_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('exchange.transactionDate')}</FormLabel>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4 p-4 border rounded-lg bg-destructive/5">
            <h4 className="font-medium text-destructive">{t('exchange.outSell')}</h4>
            <FormField
              control={form.control}
              name="out_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exchange.currency')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('form.selectCurrency')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['MYR', 'CNY', 'USD'] as CurrencyType[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {getCurrencyLabel(value)}
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
              name="out_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exchange.amount')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="out_account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exchange.account')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('form.selectAccount')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['cash', 'bank'] as AccountType[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {getAccountLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-success/5">
            <h4 className="font-medium text-success">{t('exchange.inBuy')}</h4>
            <FormField
              control={form.control}
              name="in_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exchange.currency')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('form.selectCurrency')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['MYR', 'CNY', 'USD'] as CurrencyType[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {getCurrencyLabel(value)}
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
              name="in_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exchange.amount')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="in_account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exchange.account')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('form.selectAccount')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['cash', 'bank'] as AccountType[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {getAccountLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 自动/手动汇率开关 */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={useAutoRate ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setUseAutoRate(true);
              fetchExchangeRate();
            }}
            className="text-xs"
          >
            {t('form.autoRate')}
          </Button>
          <Button
            type="button"
            variant={!useAutoRate ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUseAutoRate(false)}
            className="text-xs"
          >
            {t('form.manualRate')}
          </Button>
        </div>

        <FormField
          control={form.control}
          name="exchange_rate"
          render={({ field }) => {
            const rateValue = parseFloat(field.value);
            const isValidRate = !isNaN(rateValue) && rateValue > 0;
            const hasInput = field.value && field.value.length > 0;
            
            return (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {t('exchange.exchangeRate')} (1 {outCurrency} = ? {inCurrency})
                  {useAutoRate && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={fetchExchangeRate}
                      disabled={fetchingRate || outCurrency === inCurrency}
                    >
                      <RefreshCw className={cn("w-4 h-4", fetchingRate && "animate-spin")} />
                    </Button>
                  )}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type="text"
                      inputMode="decimal"
                      placeholder={t('form.ratePlaceholder')}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Allow empty, digits, and decimal point (up to 4 decimal places)
                        if (inputValue === '' || /^\d*\.?\d{0,4}$/.test(inputValue)) {
                          field.onChange(inputValue);
                          setUseAutoRate(false); // 手动输入时切换到手动模式
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          field.onChange(val.toFixed(4));
                        }
                      }}
                      disabled={useAutoRate && fetchingRate}
                      className={cn(
                        "pr-16 font-mono",
                        hasInput && !isValidRate && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {hasInput && (
                      <span className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium",
                        isValidRate ? "text-success" : "text-destructive"
                      )}>
                        {isValidRate ? "✓" : "✗"}
                      </span>
                    )}
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {t('form.rateHint')}
                </p>
                {hasInput && !isValidRate && (
                  <p className="text-xs text-destructive">
                    {t('form.rateInvalid')}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* 预计盈亏显示 */}
        {(parseFloat(outAmount) > 0 && parseFloat(inAmount) > 0) && (
          <div className={cn(
            "p-3 rounded-lg",
            previewPL >= 0 ? "bg-success/5 border border-success/20" : "bg-destructive/5 border border-destructive/20"
          )}>
            <div className="text-sm text-muted-foreground">{t('exchange.estimatedProfitLoss')} (MYR)</div>
            <div className={cn(
              "text-xl font-bold",
              previewPL >= 0 ? "text-success" : "text-destructive"
            )}>
              {previewPL >= 0 ? '+' : ''}RM {previewPL.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('transactions.expense')}: RM {(parseFloat(outAmount) * getMyrRate(outCurrency)).toFixed(2)} | 
              {t('transactions.income')}: RM {(parseFloat(inAmount) * getMyrRate(inCurrency)).toFixed(2)}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="remark"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.remark')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('form.optional')} {...field} />
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
            {loading ? t('form.saving') : exchange ? t('form.update') : t('exchange.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
