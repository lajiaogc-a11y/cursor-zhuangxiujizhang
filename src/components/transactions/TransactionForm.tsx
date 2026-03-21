import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Eye, RefreshCw } from 'lucide-react';
import { fetchTransactionFormData, fetchLatestExchangeRate, createTransactionWithBalance, updateTransactionFull, updateTransactionReceiptUrl, checkApprovalThreshold } from '@/services/transactions.service';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { formatChineseAmount } from '@/lib/numberToChinese';
import { ImageUploader } from '@/components/ui/image-uploader';
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog';
import { useUploadWithRetry } from '@/hooks/useUploadWithRetry';
import { useSystemCurrency } from '@/hooks/useSystemCurrency';

type CurrencyType = Database['public']['Enums']['currency_type'];
type AccountType = Database['public']['Enums']['account_type'];
type TransactionType = Database['public']['Enums']['transaction_type'];
type LedgerType = Database['public']['Enums']['ledger_type'];

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  status?: string;
}

const transactionSchema = z.object({
  transaction_date: z.date({ required_error: '请选择日期' }),
  type: z.enum(['income', 'expense'] as const),
  ledger_type: z.enum(['company_daily', 'exchange', 'project'] as const),
  category_id: z.string().optional(),
  category_name: z.string().min(1, '请选择或输入分类'),
  summary: z.string().min(1, '请输入摘要'),
  amount: z.coerce.number().min(0.01, '金额必须大于0'),
  currency: z.enum(['MYR', 'CNY', 'USD'] as const),
  account_type: z.enum(['cash', 'bank'] as const),
  exchange_rate: z.coerce.number().min(0),
  project_id: z.string().optional(),
  remark_1: z.string().optional(),
  remark_2: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: any;
  onSuccess: () => void;
  initialType?: 'income' | 'expense';
}

export function TransactionForm({ open, onOpenChange, transaction, onSuccess, initialType = 'expense' }: TransactionFormProps) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { t } = useI18n();
  const { systemCurrency } = useSystemCurrency();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projectCategories, setProjectCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Use retry upload hook
  const { 
    uploading: uploadingReceipt, 
    progress: uploadProgress, 
    error: uploadError,
    retryCount,
    uploadWithRetry,
    resetState: resetUploadState
  } = useUploadWithRetry();
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [fetchingRate, setFetchingRate] = useState(false);
  const [rateInput, setRateInput] = useState('1'); // 独立的字符串输入状态
  const [useAutoRate, setUseAutoRate] = useState(true); // 自动/手动开关

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_date: new Date(),
      type: initialType,
      ledger_type: 'company_daily',
      category_name: '',
      summary: '',
      amount: 0,
      currency: systemCurrency as any,
      account_type: undefined as any, // 默认为空，强制用户选择
      exchange_rate: 1,
    },
  });

  const transactionType = watch('type');
  const ledgerType = watch('ledger_type');
  const currency = watch('currency');
  const amount = watch('amount');
  const rate = watch('exchange_rate');
  const transactionDate = watch('transaction_date');

  // 同步rateInput到表单（失焦时）
  const syncRateToForm = () => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) {
      const formatted = Number(val.toFixed(4));
      setValue('exchange_rate', formatted);
      setRateInput(formatted.toString());
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!tenant?.id) return;
      const result = await fetchTransactionFormData(tenant.id, transaction?.id);
      setCategories(result.categories);
      setProjectCategories(result.projectCategories);
      setProjects(result.projects);
      setAccountBalances(result.accountBalances);
    };
    fetchData();
  }, [tenant?.id]);

  useEffect(() => {
    if (transaction) {
      reset({
        transaction_date: new Date(transaction.transaction_date),
        type: transaction.type,
        ledger_type: transaction.ledger_type,
        category_id: transaction.category_id || '',
        category_name: transaction.category_name,
        summary: transaction.summary,
        amount: transaction.amount,
        currency: transaction.currency,
        account_type: transaction.account_type,
        exchange_rate: transaction.exchange_rate,
        project_id: transaction.project_id || '',
        remark_1: transaction.remark_1 || '',
        remark_2: transaction.remark_2 || '',
      });
      // 编辑时同步汇率输入框
      setRateInput(transaction.exchange_rate?.toString() || '1');
      setUseAutoRate(false); // 编辑时默认手动模式
      // Set existing receipt URL for preview button
      if (transaction.receipt_url_1) {
        setExistingReceiptUrl(transaction.receipt_url_1);
      } else {
        setExistingReceiptUrl(null);
      }
      setReceiptFile(null);
      setReceiptPreview(null);
    } else {
      reset({
        transaction_date: new Date(),
        type: initialType,
        ledger_type: 'company_daily',
        category_name: '',
        summary: '',
        amount: 0,
        currency: systemCurrency as any,
        account_type: undefined as any, // 默认为空，强制用户选择
        exchange_rate: 1,
      });
      setRateInput('1');
      setUseAutoRate(true);
      setReceiptFile(null);
      setReceiptPreview(null);
      setExistingReceiptUrl(null);
    }
    resetUploadState();
  }, [transaction, reset, initialType, resetUploadState]);

  const fetchExchangeRate = async () => {
    if (currency === 'MYR') {
      setValue('exchange_rate', 1);
      setRateInput('1');
      return;
    }
    setFetchingRate(true);
    try {
      const rate = await fetchLatestExchangeRate(currency);
      if (rate) {
        setValue('exchange_rate', rate);
        setRateInput(rate.toString());
        toast.success(t('toast.rateUpdated'));
      }
    } finally {
      setFetchingRate(false);
    }
  };

  // 仅在自动模式下，币种变化时获取汇率
  useEffect(() => {
    if (useAutoRate) {
      fetchExchangeRate();
    }
  }, [currency, useAutoRate]);

  // Check balance when expense amount changes
  useEffect(() => {
    if (transactionType === 'expense' && amount > 0) {
      const balanceKey = `${currency}_${watch('account_type')}`;
      const currentBalance = accountBalances[balanceKey] || 0;
      if (amount > currentBalance) {
        setBalanceWarning(`余额不足！当前${currency}${watch('account_type') === 'cash' ? '现金' : '网银'}余额: ${currentBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`);
      } else {
        setBalanceWarning(null);
      }
    } else {
      setBalanceWarning(null);
    }
  }, [transactionType, amount, currency, watch('account_type'), accountBalances]);

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

  // Upload receipt using retry hook
  const uploadReceipt = async (transactionId: string): Promise<string | null> => {
    if (!receiptFile) return null;
    return await uploadWithRetry(receiptFile, 'transactions', transactionId);
  };

  const calculateMYR = () => {
    if (currency === 'MYR') return amount;
    const rateVal = parseFloat(rateInput) || rate || 1;
    return amount * rateVal;
  };

  // 根据账本类型选择分类来源：项目相关用 project_categories，公司日常用 transaction_categories
  const currentCategories = ledgerType === 'project' ? projectCategories : categories;
  const filteredCategories = currentCategories.filter(c => c.type === transactionType);

  const onSubmit = async (data: TransactionFormData) => {
    setLoading(true);
    try {
      const amount_myr = data.currency === 'MYR' ? data.amount : data.amount * data.exchange_rate;
      const transactionDateStr = format(data.transaction_date, 'yyyy-MM-dd');

      let receiptUrl: string | null = null;

      if (transaction) {
        // Upload receipt if there's a new file
        if (receiptFile) {
          receiptUrl = await uploadReceipt(transaction.id);
        }

        const payload: Record<string, any> = {
          transaction_date: transactionDateStr,
          type: data.type,
          ledger_type: data.ledger_type,
          category_id: data.category_id || null,
          category_name: data.category_name,
          summary: data.summary,
          amount: data.amount,
          currency: data.currency,
          account_type: data.account_type,
          exchange_rate: data.exchange_rate,
          amount_myr,
          project_id: data.ledger_type === 'project' ? (data.project_id || null) : null,
          remark_1: data.remark_1 || null,
          remark_2: data.remark_2 || null,
          ...(receiptUrl && { receipt_url_1: receiptUrl }),
        };

        await updateTransactionFull(transaction.id, payload, {
          project_id: transaction.project_id,
          amount_myr: transaction.amount_myr,
          type: transaction.type,
        });

        toast.success('记录已更新');
      } else {
        const input = {
          transaction_date: transactionDateStr,
          type: data.type as 'income' | 'expense',
          ledger_type: data.ledger_type,
          category_name: data.category_name,
          summary: data.summary,
          amount: data.amount,
          currency: data.currency,
          account_type: data.account_type,
          exchange_rate: data.exchange_rate,
          amount_myr,
          project_id: data.ledger_type === 'project' ? (data.project_id || null) : null,
          remark_1: data.remark_1 || null,
          remark_2: data.remark_2 || null,
          created_by: user?.id || null,
          tenant_id: tenant?.id || '',
        };

        const insertedData = await createTransactionWithBalance(input);

        // Upload receipt after getting the transaction ID
        if (receiptFile && insertedData) {
          receiptUrl = await uploadReceipt(insertedData.id);
          if (receiptUrl) {
            await updateTransactionReceiptUrl(insertedData.id, receiptUrl);
          }
        }

        // Check approval threshold for expenses
        if (data.type === 'expense' && insertedData && user?.id) {
          const needsApproval = await checkApprovalThreshold({
            amount: data.amount,
            currency: data.currency,
            requestType: 'expense',
            recordTable: 'transactions',
            recordId: insertedData.id,
            requestedBy: user.id,
          });
          if (needsApproval) {
            toast.info('该笔支出已触发审批流程');
          }
        }

        toast.success('记录已添加');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? t('form.editRecord') : t('form.newRecord')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 类型选择 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('form.type')}</Label>
              <Select 
                value={watch('type')} 
                onValueChange={(value: TransactionType) => setValue('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{t('transactions.income')}</SelectItem>
                  <SelectItem value="expense">{t('transactions.expense')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('form.ledger')}</Label>
              <Select 
                value={watch('ledger_type')} 
                onValueChange={(value: LedgerType) => {
                  setValue('ledger_type', value);
                  if (value !== 'project') {
                    setValue('project_id', undefined);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_daily">{t('transactions.companyDaily')}</SelectItem>
                  <SelectItem value="project">{t('transactions.projectRelated')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 项目选择(如果是项目相关) */}
          {ledgerType === 'project' && (
            <div>
              <Label>{t('form.relatedProject')}</Label>
              <Select 
                value={watch('project_id') || ''} 
                onValueChange={(value) => setValue('project_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      {t('projects.noProjects')}
                    </div>
                  ) : (
                    projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_code} - {project.project_name}
                        {project.status && project.status !== 'in_progress' && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({project.status === 'completed' ? t('projects.completed') : t('projects.paused')})
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 日期和分类 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('form.date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !transactionDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transactionDate ? format(transactionDate, 'yyyy-MM-dd') : t('common.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={transactionDate}
                    onSelect={(date) => date && setValue('transaction_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.transaction_date && <p className="text-destructive text-sm mt-1">{errors.transaction_date.message}</p>}
            </div>
            <div>
              <Label>{t('form.category')}</Label>
              <Select 
                value={watch('category_id') || ''} 
                onValueChange={(value) => {
                  const cat = currentCategories.find(c => c.id === value);
                  setValue('category_id', value);
                  if (cat) setValue('category_name', cat.name);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('form.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input 
                className="mt-2" 
                placeholder={t('form.orInputCategory')} 
                {...register('category_name')}
              />
              {errors.category_name && <p className="text-destructive text-sm mt-1">{errors.category_name.message}</p>}
            </div>
          </div>

          {/* 摘要 */}
          <div>
            <Label>{t('form.summary')}</Label>
            <Input {...register('summary')} placeholder={t('form.summaryPlaceholder')} />
            {errors.summary && <p className="text-destructive text-sm mt-1">{errors.summary.message}</p>}
          </div>

          {/* 金额信息 */}
          <div className="grid grid-cols-3 gap-4">
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
              <Label>{t('form.account')} <span className="text-destructive">*</span></Label>
              <Select 
                value={watch('account_type') || ''} 
                onValueChange={(value: AccountType) => setValue('account_type', value)}
              >
                <SelectTrigger className={!watch('account_type') ? 'text-muted-foreground' : ''}>
                  <SelectValue placeholder={t('form.selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('account.cash')}</SelectItem>
                  <SelectItem value="bank">{t('account.bank')}</SelectItem>
                </SelectContent>
              </Select>
              {!watch('account_type') && errors.account_type && (
                <p className="text-destructive text-sm mt-1">{t('validation.accountRequired')}</p>
              )}
            </div>
            <div>
              <Label>{t('form.amount')}</Label>
              <Input type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
              {amount > 0 && (
                <p className="text-xs text-muted-foreground mt-1 p-2 bg-muted/50 rounded">
                  {formatChineseAmount(amount, currency)}
                </p>
              )}
              {balanceWarning && (
                <p className="text-warning text-sm mt-1 p-2 bg-warning/10 rounded border border-warning/20">
                  ⚠️ {balanceWarning}
                </p>
              )}
            </div>
          </div>

          {currency !== 'MYR' && (
            <div className="space-y-3">
              {/* 自动/手动开关 */}
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    {t('form.exchangeRate')}
                    {useAutoRate && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={fetchExchangeRate}
                        disabled={fetchingRate}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className={cn("w-4 h-4", fetchingRate && "animate-spin")} />
                      </Button>
                    )}
                  </Label>
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
                      }
                    }}
                    onBlur={syncRateToForm}
                    disabled={useAutoRate && fetchingRate}
                  />
                </div>
                <div className="flex items-end">
                  <div className="p-3 bg-muted rounded-lg flex-1">
                    <span className="text-muted-foreground">{t('form.myrEquivalent')}: </span>
                    <span className="font-bold">RM {calculateMYR().toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 票据上传 */}
          <div>
            <Label>{t('form.receiptOptional')}</Label>
            
            {/* Existing receipt preview button */}
            {existingReceiptUrl && !receiptFile && (
              <div className="mt-2 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewDialogOpen(true)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {t('form.viewExistingReceipt')}
                </Button>
              </div>
            )}
            
            <div className="mt-2">
              <ImageUploader
                onFileSelect={handleReceiptSelect}
                onRemove={removeReceipt}
                previewUrl={receiptPreview}
                uploading={uploadingReceipt}
                uploadProgress={uploadProgress}
                maxSizeMB={10}
                compressImages={true}
                compressionQuality={0.8}
              />
              
              {/* Retry status */}
              {retryCount > 0 && uploadingReceipt && (
                <p className="text-sm text-warning mt-2">
                  {t('upload.retrying').replace('{current}', String(retryCount)).replace('{max}', '3')}
                </p>
              )}
              
              {/* Upload error */}
              {uploadError && !uploadingReceipt && (
                <p className="text-sm text-destructive mt-2">
                  {t('upload.failed')}: {uploadError}
                </p>
              )}
            </div>
          </div>

          {/* Existing receipt preview dialog */}
          <ImagePreviewDialog
            open={previewDialogOpen}
            onOpenChange={setPreviewDialogOpen}
            imageUrl={existingReceiptUrl}
            title={t('transactions.receiptPreview')}
          />

          {/* 备注 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('form.remark1')}</Label>
              <Textarea {...register('remark_1')} placeholder={t('form.optional')} rows={2} />
            </div>
            <div>
              <Label>{t('form.remark2')}</Label>
              <Textarea {...register('remark_2')} placeholder={t('form.optional')} rows={2} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('form.cancel')}</Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('form.saving') : t('form.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
