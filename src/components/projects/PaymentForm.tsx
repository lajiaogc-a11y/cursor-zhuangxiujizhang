import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { fetchLatestExchangeRate, createProjectPayment, updateProjectPayment } from '@/services/admin.service';
import { adjustAccountBalance } from '@/services/projects.service';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateInput } from '@/components/ui/date-input';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { ImageUploader } from '@/components/ui/image-uploader';
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog';
import { Image as ImageIcon } from 'lucide-react';
import { useUploadWithRetry } from '@/hooks/useUploadWithRetry';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';

type CurrencyType = Database['public']['Enums']['currency_type'];
type AccountType = Database['public']['Enums']['account_type'];
type PaymentStage = Database['public']['Enums']['payment_stage'];

// Schema with dynamic validation
const paymentSchema = z.object({
  payment_stage: z.enum(['deposit_1', 'deposit_2', 'progress_3', 'progress_4', 'final_5'] as const),
  amount: z.coerce.number().min(0.01),
  currency: z.enum(['MYR', 'CNY', 'USD'] as const),
  account_type: z.enum(['cash', 'bank'] as const),
  exchange_rate: z.coerce.number().min(0),
  payment_date: z.string().min(1),
  remark: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectCurrency: string;
  payment?: any;
  onSuccess: () => void;
}

// Payment stage labels will be generated dynamically using t() in the component

export function PaymentForm({ open, onOpenChange, projectId, projectCurrency, payment, onSuccess }: PaymentFormProps) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState('1.0000');
  const [showExistingPreview, setShowExistingPreview] = useState(false);
  
  // Use upload with retry hook
  const { 
    uploading: uploadingReceipt, 
    progress: uploadProgress, 
    error: uploadError,
    retryCount,
    uploadWithRetry, 
    resetState: resetUploadState 
  } = useUploadWithRetry({ maxRetries: 3 });

  // Dynamic stage labels based on i18n
  const getStageLabel = (stage: string) => {
    const stageMap: Record<string, string> = {
      deposit_1: t('payment.deposit1'),
      deposit_2: t('payment.deposit2'),
      progress_3: t('payment.progress3'),
      progress_4: t('payment.progress4'),
      final_5: t('payment.final5'),
    };
    return stageMap[stage] || stage;
  };

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_stage: 'deposit_1',
      amount: 0,
      currency: projectCurrency as CurrencyType,
      account_type: 'bank',
      exchange_rate: 1,
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  const currency = watch('currency');
  const amount = watch('amount');
  const rate = watch('exchange_rate');

  useEffect(() => {
    if (payment) {
      reset({
        payment_stage: payment.payment_stage,
        amount: payment.amount,
        currency: payment.currency,
        account_type: payment.account_type,
        exchange_rate: payment.exchange_rate,
        payment_date: payment.payment_date,
        remark: payment.remark || '',
      });
      setRateInput((payment.exchange_rate || 1).toFixed(4));
      // 如果有已保存的票据，设置预览
      if (payment.receipt_url) {
        setExistingReceiptUrl(payment.receipt_url);
      } else {
        setExistingReceiptUrl(null);
      }
    } else {
      reset({
        payment_stage: 'deposit_1',
        amount: 0,
        currency: projectCurrency as CurrencyType,
        account_type: 'bank',
        exchange_rate: 1,
        payment_date: new Date().toISOString().split('T')[0],
      });
      setRateInput('1.0000');
      setExistingReceiptUrl(null);
    }
    // 重置新上传的文件
    setReceiptFile(null);
    setReceiptPreview(null);
    resetUploadState();
  }, [payment, reset, projectCurrency, resetUploadState]);

  useEffect(() => {
    const fetchRate = async () => {
      if (currency === 'MYR') {
        setValue('exchange_rate', 1);
        setRateInput('1.0000');
        return;
      }
      const rate = await fetchLatestExchangeRate(currency, 'MYR', tenant?.id);
      if (rate) {
        const formattedRate = Number(rate.toFixed(4));
        setValue('exchange_rate', formattedRate);
        setRateInput(formattedRate.toFixed(4));
      }
    };
    fetchRate();
  }, [currency, setValue]);

  const calculateMYR = () => {
    if (currency === 'MYR') return amount;
    return amount * rate;
  };

  // Handle receipt file selection
  const handleReceiptSelect = (file: File) => {
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    resetUploadState();
  };

  const onSubmit = async (data: PaymentFormData) => {
    setLoading(true);
    try {
      const amount_myr = data.currency === 'MYR' ? data.amount : data.amount * data.exchange_rate;

      // Generate a temporary ID for new payments to use in file path
      const tempId = payment?.id || crypto.randomUUID();
      
      // Upload receipt if present (with auto-retry)
      let receipt_url = payment?.receipt_url || null;
      if (receiptFile) {
        const uploadedPath = await uploadWithRetry(receiptFile, 'payments', tempId);
        if (uploadedPath) {
          receipt_url = uploadedPath;
        } else if (uploadError) {
          toast.error(t('upload.failed'));
          setLoading(false);
          return;
        }
      }

      const payload = {
        project_id: projectId,
        payment_stage: data.payment_stage,
        amount: data.amount,
        currency: data.currency,
        account_type: data.account_type,
        exchange_rate: data.exchange_rate,
        amount_myr,
        payment_date: data.payment_date,
        remark: data.remark || null,
        receipt_url,
        created_by: user?.id,
        tenant_id: tenant?.id,
      };

      if (payment) {
        await updateProjectPayment(payment.id, payload);
        toast.success(t('toast.recordUpdated'));
      } else {
        await createProjectPayment({ ...payload, id: tempId });

        // Update company account balance
        await adjustAccountBalance(data.currency, data.account_type, data.amount);

        toast.success(t('toast.recordAdded'));
      }

      // Reset form state
      setReceiptFile(null);
      setReceiptPreview(null);
      resetUploadState();
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || t('toast.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const stageOptions = ['deposit_1', 'deposit_2', 'progress_3', 'progress_4', 'final_5'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{payment ? t('form.editRecord') : t('form.newRecord')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>{t('paymentList.stage')}</Label>
            <Select 
              value={watch('payment_stage')} 
              onValueChange={(value: PaymentStage) => setValue('payment_stage', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map((value) => (
                  <SelectItem key={value} value={value}>{getStageLabel(value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('form.currency')}</Label>
              <Select 
                value={watch('currency')} 
                onValueChange={(value: CurrencyType) => setValue('currency', value)}
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
              <Label>{t('form.account')}</Label>
              <Select 
                value={watch('account_type')} 
                onValueChange={(value: AccountType) => setValue('account_type', value)}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('form.amount')}</Label>
              <Input type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-destructive text-sm mt-1">{t('validation.amountPositive')}</p>}
            </div>
            <div>
              <Label>{t('form.exchangeRate')}</Label>
              <Input 
                type="text"
                inputMode="decimal"
                value={rateInput}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === '' || /^\d*\.?\d{0,4}$/.test(inputValue)) {
                    setRateInput(inputValue);
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
                disabled={currency === 'MYR'}
              />
            </div>
          </div>

          {currency !== 'MYR' && (
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">{t('form.myrEquivalent')}: </span>
              <span className="font-bold">RM {calculateMYR().toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          <div>
            <Label>{t('paymentList.date')}</Label>
            <DateInput 
              value={watch('payment_date')} 
              onChange={(value) => setValue('payment_date', value)}
            />
            {errors.payment_date && <p className="text-destructive text-sm mt-1">{t('validation.dateRequired')}</p>}
          </div>

          {/* 票据上传 */}
          <div>
            <Label>{t('form.receiptOptional')}</Label>
            <div className="mt-2 space-y-2">
              {/* 显示已有票据 */}
              {existingReceiptUrl && !receiptFile && (
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExistingPreview(true)}
                    className="flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('form.viewExistingReceipt')}</span>
                  </Button>
                  <span className="text-xs text-muted-foreground">{t('form.uploadNewToReplace')}</span>
                </div>
              )}
              {/* 显示重试信息 */}
              {uploadError && retryCount > 0 && (
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  {uploadError}
                </div>
              )}
              <ImageUploader
                onFileSelect={handleReceiptSelect}
                onRemove={removeReceipt}
                previewUrl={receiptPreview}
                uploading={uploadingReceipt}
                uploadProgress={uploadProgress}
                maxSizeMB={10}
                compressImages={true}
                compressionQuality={0.8}
                variant="compact"
              />
            </div>
          </div>

          <div>
            <Label>{t('form.remark')}</Label>
            <Textarea {...register('remark')} placeholder={t('form.remarkPlaceholder')} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('form.cancel')}</Button>
            <Button type="submit" disabled={loading || uploadingReceipt}>
              {loading && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
              {t('form.save')}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* 已有票据预览 */}
      <ImagePreviewDialog
        open={showExistingPreview}
        onOpenChange={setShowExistingPreview}
        imageUrl={existingReceiptUrl}
        title={t('common.receipt')}
      />
    </Dialog>
  );
}
