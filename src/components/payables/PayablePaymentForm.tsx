import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPayablePayment } from '@/services/payables.service';
import { updatePayablePaymentReceipt } from '@/services/projects.service';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { toast } from 'sonner';
import { ImageUploader } from '@/components/ui/image-uploader';
import { useUploadWithRetry } from '@/hooks/useUploadWithRetry';

interface PayablePaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  payable: any;
}

const formatCurrency = (amount: number, currency: string = 'MYR') => {
  const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
  return `${symbols[currency] || ''}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function PayablePaymentForm({ open, onOpenChange, onSuccess, payable }: PayablePaymentFormProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    account_type: 'bank',
    remark: '',
  });

  const {
    uploading: uploadingReceipt,
    progress: uploadProgress,
    error: uploadError,
    uploadWithRetry,
    resetState: resetUploadState,
  } = useUploadWithRetry();

  const isReceivable = payable?.record_type === 'receivable';

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

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error(t('common.error'));
      return;
    }
    setLoading(true);
    const amountMyr = payable.currency === 'MYR' ? amount : amount * (payable.exchange_rate || 1);

    try {
      const insertedId = await createPayablePayment({
        payable_id: payable.id,
        payment_date: form.payment_date,
        amount,
        currency: payable.currency,
        exchange_rate: payable.exchange_rate || 1,
        amount_myr: amountMyr,
        account_type: form.account_type,
        remark: form.remark || null,
        created_by: user?.id,
        tenant_id: tenant?.id,
      });

      if (receiptFile && insertedId) {
        const receiptUrl = await uploadWithRetry(receiptFile, 'payable_payments', insertedId);
        if (receiptUrl) {
          await updatePayablePaymentReceipt(insertedId, receiptUrl);
        }
      }
    } catch {
      setLoading(false);
      toast.error(t('common.error'));
      return;
    }

    setLoading(false);
    toast.success(t('common.success'));
    setForm({ payment_date: new Date().toISOString().split('T')[0], amount: '', account_type: 'bank', remark: '' });
    setReceiptFile(null);
    setReceiptPreview(null);
    resetUploadState();
    onOpenChange(false);
    onSuccess();
  };

  if (!payable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isReceivable ? t('payables.addCollection') : t('payables.addPayment')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current info */}
          <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
            <p className="font-medium">{isReceivable ? t('payables.receivableInfo') : t('payables.currentInfo')}</p>
            <div className="flex justify-between">
              <span>{isReceivable ? t('payables.customerName') : t('payables.supplierName')}</span>
              <span>{payable.supplier_name}</span>
            </div>
            <div className="flex justify-between"><span>{t('payables.totalAmount')}</span><span>{formatCurrency(payable.total_amount, payable.currency)}</span></div>
            <div className="flex justify-between">
              <span>{isReceivable ? t('payables.totalReceived') : t('payables.paidAmount')}</span>
              <span className="text-success">{formatCurrency(payable.paid_amount, payable.currency)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>{isReceivable ? t('payables.remainingUnreceived') : t('payables.remainingAmount')}</span>
              <span className="text-destructive">{formatCurrency(payable.unpaid_amount, payable.currency)}</span>
            </div>
          </div>

          <div>
            <Label>{isReceivable ? t('payables.collectionDate') : t('payables.paymentDate')}</Label>
            <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
          </div>
          <div>
            <Label>{isReceivable ? t('payables.collectionAmount') : t('payables.paymentAmount')} ({payable.currency})</Label>
            <Input type="number" step="0.01" max={payable.unpaid_amount} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <Label>{t('transactions.account')}</Label>
            <Select value={form.account_type} onValueChange={v => setForm(f => ({ ...f, account_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('account.cash')}</SelectItem>
                <SelectItem value="bank">{t('account.bank')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 票据上传 */}
          <div>
            <Label>{t('form.uploadReceipt')}</Label>
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
                variant="compact"
              />
              {uploadError && (
                <p className="text-destructive text-xs mt-1">{uploadError}</p>
              )}
            </div>
          </div>

          <div>
            <Label>{t('common.remark')}</Label>
            <Textarea value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading || uploadingReceipt}>
              {loading ? t('common.loading') : t('common.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
