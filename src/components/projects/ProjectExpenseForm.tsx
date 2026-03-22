import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Image as ImageIcon } from 'lucide-react';
import { fetchLatestExchangeRate } from '@/services/transactions.service';
import { createProjectExpense, updateProjectExpense } from '@/services/projects.service';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { ImageUploader } from '@/components/ui/image-uploader';
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog';
import { useUploadWithRetry } from '@/hooks/useUploadWithRetry';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';

type ExpenseCategory = 'material' | 'project_management' | 'outsourcing' | 'transportation' | 'labor' | 'other';

const expenseSchema = z.object({
  expense_date: z.date({ required_error: 'Date is required' }),
  category: z.enum(['material', 'project_management', 'outsourcing', 'transportation', 'labor', 'other'] as const),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.enum(['MYR', 'CNY', 'USD'] as const),
  account_type: z.enum(['cash', 'bank'] as const),
  exchange_rate: z.coerce.number().min(0),
  remark: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  exchange_rate?: number;
  account_type: string;
  remark: string | null;
  receipt_url?: string | null;
}

interface ProjectExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  expense?: Expense | null;
  onSuccess: () => void;
}

export function ProjectExpenseForm({ open, onOpenChange, projectId, expense, onSuccess }: ProjectExpenseFormProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [showExistingPreview, setShowExistingPreview] = useState(false);
  const [rateInput, setRateInput] = useState('1.0000');
  
  // Use upload with retry hook
  const { 
    uploading: uploadingReceipt, 
    progress: uploadProgress, 
    error: uploadError,
    retryCount,
    uploadWithRetry, 
    resetState: resetUploadState 
  } = useUploadWithRetry({ maxRetries: 3 });

  const EXPENSE_CATEGORIES = [
    { value: 'material', label: t('expense.material') },
    { value: 'project_management', label: t('expense.projectManagement') },
    { value: 'outsourcing', label: t('expense.outsourcing') },
    { value: 'transportation', label: t('expense.transportation') },
    { value: 'labor', label: t('expense.labor') },
    { value: 'other', label: t('expense.other') },
  ] as const;

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: new Date(),
      category: 'material',
      description: '',
      amount: 0,
      currency: 'MYR',
      account_type: 'bank',
      exchange_rate: 1,
      remark: '',
    },
  });

  const currency = watch('currency');
  const amount = watch('amount');
  const rate = watch('exchange_rate');
  const expenseDate = watch('expense_date');

  useEffect(() => {
    if (expense) {
      reset({
        expense_date: new Date(expense.expense_date),
        category: expense.category as ExpenseCategory,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency as 'MYR' | 'CNY' | 'USD',
        account_type: expense.account_type as 'cash' | 'bank',
        exchange_rate: expense.exchange_rate || 1,
        remark: expense.remark || '',
      });
      setRateInput((expense.exchange_rate || 1).toFixed(4));
      // 设置已有票据
      if (expense.receipt_url) {
        setExistingReceiptUrl(expense.receipt_url);
      } else {
        setExistingReceiptUrl(null);
      }
    } else {
      reset({
        expense_date: new Date(),
        category: 'material',
        description: '',
        amount: 0,
        currency: 'MYR',
        account_type: 'bank',
        exchange_rate: 1,
        remark: '',
      });
      setRateInput('1.0000');
      setExistingReceiptUrl(null);
    }
    // 重置新上传的文件
    setReceiptFile(null);
    setReceiptPreview(null);
    resetUploadState();
  }, [expense, reset, open, resetUploadState]);

  useEffect(() => {
    const fetchRate = async () => {
      if (currency === 'MYR') {
        setValue('exchange_rate', 1);
        setRateInput('1.0000');
        return;
      }
      const rate = await fetchLatestExchangeRate(currency, 'MYR', tenant?.id);
      if (rate) {
        setValue('exchange_rate', rate);
        setRateInput(rate.toFixed(4));
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

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const amount_myr = data.currency === 'MYR' ? data.amount : data.amount * data.exchange_rate;
      const expenseDateStr = format(data.expense_date, 'yyyy-MM-dd');

      // Generate a temporary ID for new expenses to use in file path
      const tempId = expense?.id || crypto.randomUUID();
      
      // Upload receipt if present (with auto-retry)
      let receipt_url = expense?.receipt_url || null;
      if (receiptFile) {
        const uploadedPath = await uploadWithRetry(receiptFile, 'expenses', tempId);
        if (uploadedPath) {
          receipt_url = uploadedPath;
        } else if (uploadError) {
          toast.error(t('upload.failed'));
          setLoading(false);
          return;
        }
      }

      const legacyCategory = ['material', 'labor', 'other'].includes(data.category) 
        ? data.category as 'material' | 'labor' | 'other'
        : 'other' as const;
      
      const payload = {
        project_id: projectId,
        expense_date: expenseDateStr,
        category: legacyCategory,
        category_v2: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        account_type: data.account_type,
        exchange_rate: data.exchange_rate,
        amount_myr,
        remark: data.remark || null,
        receipt_url,
        created_by: user?.id,
        tenant_id: tenant?.id,
      };

      if (expense) {
        await updateProjectExpense(expense.id, payload);
        toast.success(t('expense.updated'));
      } else {
        await createProjectExpense({ ...payload, id: tempId });
        toast.success(t('expense.added'));
      }

      // Reset form state
      setReceiptFile(null);
      setReceiptPreview(null);
      resetUploadState();

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || t('expense.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? t('expense.editExpense') : t('expense.addExpense')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('expense.date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !expenseDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenseDate ? format(expenseDate, 'yyyy-MM-dd') : t('expense.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expenseDate}
                    onSelect={(date) => date && setValue('expense_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>{t('expense.category')}</Label>
              <Select 
                value={watch('category')} 
                onValueChange={(value: ExpenseCategory) => setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t('expense.description')}</Label>
            <Input {...register('description')} placeholder={t('expense.descriptionPlaceholder')} />
            {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{t('expense.currency')}</Label>
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
              <Label>{t('expense.account')}</Label>
              <Select 
                value={watch('account_type')} 
                onValueChange={(value: 'cash' | 'bank') => setValue('account_type', value)}
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
            <div>
              <Label>{t('expense.amount')}</Label>
              <Input type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          {currency !== 'MYR' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('expense.exchangeRate')}</Label>
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
                />
              </div>
              <div>
                <Label>{t('expense.myrEquivalent')}</Label>
                <div className="h-10 px-3 flex items-center bg-muted rounded-md">
                  RM {calculateMYR().toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

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
            <Label>{t('expense.remark')}</Label>
            <Textarea {...register('remark')} placeholder={t('expense.remarkPlaceholder')} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || uploadingReceipt}>
              {loading && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
              {t('common.save')}
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
