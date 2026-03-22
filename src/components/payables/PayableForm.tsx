import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPayable, updatePayable } from '@/services/payables.service';
import { fetchLatestExchangeRate } from '@/services/transactions.service';
import { fetchProjectsForSelect } from '@/services/projects.service';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { checkApprovalThreshold } from '@/lib/approvalCheck';

interface PayableFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
  defaultRecordType?: 'payable' | 'receivable';
}

export function PayableForm({ open, onOpenChange, onSuccess, editData, defaultRecordType = 'payable' }: PayableFormProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [rateInput, setRateInput] = useState('1');
  const [useAutoRate, setUseAutoRate] = useState(true);
  const [recordType, setRecordType] = useState<'payable' | 'receivable'>(defaultRecordType);
  
  const [form, setForm] = useState({
    payable_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    description: '',
    total_amount: '',
    currency: 'MYR' as string,
    exchange_rate: '1',
    project_id: '',
    due_date: '',
    remark: '',
  });

  const isReceivable = recordType === 'receivable';

  useEffect(() => {
    if (editData) {
      setRecordType(editData.record_type || 'payable');
      setForm({
        payable_date: editData.payable_date || '',
        supplier_name: editData.supplier_name || '',
        description: editData.description || '',
        total_amount: String(editData.total_amount || ''),
        currency: editData.currency || 'MYR',
        exchange_rate: String(editData.exchange_rate || 1),
        project_id: editData.project_id || '',
        due_date: editData.due_date || '',
        remark: editData.remark || '',
      });
      setRateInput(String(editData.exchange_rate || 1));
      setUseAutoRate(false);
    } else {
      setRecordType(defaultRecordType);
      setForm({
        payable_date: new Date().toISOString().split('T')[0],
        supplier_name: '', description: '', total_amount: '',
        currency: 'MYR', exchange_rate: '1', project_id: '', due_date: '', remark: '',
      });
      setRateInput('1');
      setUseAutoRate(true);
    }
  }, [editData, open, defaultRecordType]);

  useEffect(() => {
    fetchProjectsForSelect().then(data => setProjects(data));
  }, []);

  const fetchExchangeRate = async () => {
    if (form.currency === 'MYR') {
      setForm(f => ({ ...f, exchange_rate: '1' }));
      setRateInput('1');
      return;
    }
    setFetchingRate(true);
    try {
      const rate = await fetchLatestExchangeRate(form.currency, 'MYR', tenant?.id);
      if (rate) {
        setForm(f => ({ ...f, exchange_rate: rate.toString() }));
        setRateInput(rate.toString());
        toast.success(t('toast.rateUpdated'));
      }
    } finally {
      setFetchingRate(false);
    }
  };

  useEffect(() => {
    if (useAutoRate && form.currency !== 'MYR') {
      fetchExchangeRate();
    } else if (form.currency === 'MYR') {
      setForm(f => ({ ...f, exchange_rate: '1' }));
      setRateInput('1');
    }
  }, [form.currency, useAutoRate]);

  const syncRateToForm = () => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) {
      const formatted = Number(val.toFixed(4));
      setForm(f => ({ ...f, exchange_rate: formatted.toString() }));
      setRateInput(formatted.toString());
    }
  };

  const calculateMYR = () => {
    const amount = parseFloat(form.total_amount) || 0;
    if (form.currency === 'MYR') return amount;
    const rate = parseFloat(rateInput) || parseFloat(form.exchange_rate) || 1;
    return amount * rate;
  };

  const handleSubmit = async () => {
    if (!form.supplier_name || !form.description || !form.total_amount) {
      toast.error(t('common.error'));
      return;
    }
    setLoading(true);
    const amount = parseFloat(form.total_amount);
    const rate = parseFloat(form.exchange_rate) || 1;
    const amountMyr = form.currency === 'MYR' ? amount : amount * rate;

    const record: any = {
      payable_date: form.payable_date,
      supplier_name: form.supplier_name,
      description: form.description,
      total_amount: amount,
      currency: form.currency,
      exchange_rate: rate,
      total_amount_myr: amountMyr,
      unpaid_amount: amount,
      unpaid_amount_myr: amountMyr,
      project_id: form.project_id || null,
      due_date: form.due_date || null,
      remark: form.remark || null,
      record_type: recordType,
    };

    let error;
    if (editData) {
      record.unpaid_amount = amount - (editData.paid_amount || 0);
      record.unpaid_amount_myr = amountMyr - (editData.paid_amount_myr || 0);
      record.status = record.unpaid_amount <= 0 ? 'paid' : (editData.paid_amount > 0 ? 'partial' : 'pending');
      try { await updatePayable(editData.id, record); } catch (e) { error = e; }
    } else {
      record.created_by = user?.id;
      record.tenant_id = tenant?.id;
      let insertedId: string | null = null;
      try { insertedId = await createPayable(record); } catch (e) { error = e; }
      
      // Check approval threshold for new payables
      if (!error && insertedId && user?.id) {
        const needsApproval = await checkApprovalThreshold({
          amount,
          currency: form.currency,
          requestType: 'payable',
          recordTable: 'payables',
          recordId: insertedId,
          requestedBy: user.id,
        });
        if (needsApproval) {
          toast.info('该笔应付已触发审批流程');
        }
      }
    }

    setLoading(false);
    if (error) {
      toast.error(t('common.error'));
    } else {
      toast.success(t('common.success'));
      onOpenChange(false);
      onSuccess();
    }
  };

  const dialogTitle = editData
    ? (isReceivable ? t('payables.editReceivable') : t('payables.editPayable'))
    : (isReceivable ? t('payables.newReceivable') : t('payables.newPayable'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editData && (
            <div>
              <Label>{t('payables.recordType')}</Label>
              <Select value={recordType} onValueChange={v => setRecordType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payable">{t('payables.payable')}</SelectItem>
                  <SelectItem value="receivable">{t('payables.receivable')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('payables.payableDate')}</Label>
              <Input type="date" value={form.payable_date} onChange={e => setForm(f => ({ ...f, payable_date: e.target.value }))} />
            </div>
            <div>
              <Label>{t('payables.dueDate')}</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>{isReceivable ? t('payables.customerName') : t('payables.supplierName')}</Label>
            <Input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} />
          </div>
          <div>
            <Label>{t('payables.description')}</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('payables.totalAmount')}</Label>
              <Input type="number" step="0.01" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
            </div>
            <div>
              <Label>{t('transactions.currency')}</Label>
              <Select value={form.currency} onValueChange={v => {
                setForm(f => ({ ...f, currency: v }));
                if (v === 'MYR') {
                  setForm(f => ({ ...f, exchange_rate: '1' }));
                  setRateInput('1');
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MYR">MYR</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.currency !== 'MYR' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button type="button" variant={useAutoRate ? 'default' : 'outline'} size="sm" onClick={() => { setUseAutoRate(true); fetchExchangeRate(); }} className="text-xs">
                  {t('form.autoRate')}
                </Button>
                <Button type="button" variant={!useAutoRate ? 'default' : 'outline'} size="sm" onClick={() => setUseAutoRate(false)} className="text-xs">
                  {t('form.manualRate')}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    {t('transactions.exchangeRate')} ({form.currency} → MYR)
                    {useAutoRate && (
                      <Button type="button" variant="ghost" size="sm" onClick={fetchExchangeRate} disabled={fetchingRate} className="h-6 w-6 p-0">
                        {fetchingRate ? <ChromeLoadingSpinner variant="muted" className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    )}
                  </Label>
                  <Input
                    type="text" inputMode="decimal" value={rateInput}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === '' || /^\d*\.?\d{0,4}$/.test(inputValue)) {
                        setRateInput(inputValue);
                        setUseAutoRate(false);
                      }
                    }}
                    onBlur={syncRateToForm}
                    disabled={useAutoRate && fetchingRate}
                  />
                </div>
                <div>
                  <Label>{t('form.myrEquivalent')}</Label>
                  <div className="h-10 flex items-center px-3 border rounded-md bg-muted text-sm">
                    RM {calculateMYR().toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>{t('payables.project')}</Label>
            <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder={t('payables.noProject')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('payables.noProject')}</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_code} - {p.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('common.remark')}</Label>
            <Textarea value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
