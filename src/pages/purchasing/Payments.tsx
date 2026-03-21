import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, DollarSign, Plus, Loader2, CreditCard, CheckCircle,
} from 'lucide-react';
import { purchasingService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Payment {
  id: string; paymentDate: string; amount: number; paymentMethod: string;
  referenceNo: string | null; notes: string | null; createdAt: string;
}

export default function PaymentsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    amount: 0, paymentMethod: 'bank_transfer', referenceNo: '', notes: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const { data, isLoading: loading } = useQuery({
    queryKey: ['purchasePayments', orderId],
    queryFn: () => purchasingService.fetchPaymentPageData(orderId!),
    enabled: !!orderId && !!user,
  });

  const orderNo = data?.orderNo ?? '';
  const supplierName = data?.supplierName ?? '';
  const totalAmount = data?.totalAmount ?? 0;
  const payments = data?.payments ?? [];
  const paidAmount = data?.paidAmount ?? 0;

  const remainingAmount = totalAmount - paidAmount;
  const paymentStatus = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

  const getMethodLabel = (m: string) => {
    const map: Record<string, string> = {
      bank_transfer: t('pmts.bankTransfer'), cash: t('pmts.cash'), cheque: t('pmts.cheque'),
      online: t('pmts.online'), other: t('pmts.other'),
    };
    return map[m] || m;
  };

  const openDialog = () => {
    setForm({ amount: remainingAmount, paymentMethod: 'bank_transfer', referenceNo: '', notes: '', paymentDate: new Date().toISOString().split('T')[0] });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (form.amount <= 0) return;
    try {
      setSaving(true);
      await purchasingService.savePayment(orderId!, form, paidAmount, totalAmount, user?.id);
      toast({ title: t('pmts.paymentRecorded') });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['purchasePayments', orderId] });
    } catch (error: any) {
      toast({ title: t('pmts.recordFailed'), description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-background p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/purchasing/orders/${orderId}`)}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" />{t('pmts.title')}</h1>
              <p className="text-xs text-muted-foreground">{orderNo} · {supplierName}</p>
            </div>
          </div>
          {remainingAmount > 0 && <Button size="sm" onClick={openDialog}><Plus className="w-4 h-4 mr-1" /> {t('pmts.addPayment')}</Button>}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 animate-page-enter">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card-v2"><div className="flex items-center gap-3"><DollarSign className="w-8 h-8 text-primary/20" /><div><p className="text-xl font-bold">RM {totalAmount.toFixed(2)}</p><p className="text-xs text-muted-foreground">{t('pmts.totalAmount')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><CheckCircle className="w-8 h-8 text-emerald-500/20" /><div><p className="text-xl font-bold text-emerald-600">{paidAmount.toFixed(2)}</p><p className="text-xs text-muted-foreground">{t('pmts.paidAmount')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><CreditCard className="w-8 h-8 text-amber-500/20" /><div><p className="text-xl font-bold text-amber-600">{remainingAmount.toFixed(2)}</p><p className="text-xs text-muted-foreground">{t('pmts.unpaidAmount')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Badge variant={paymentStatus === 'paid' ? 'default' : paymentStatus === 'partial' ? 'secondary' : 'outline'} className="text-[9px] px-1">{paymentStatus === 'paid' ? '✓' : '…'}</Badge></div><div><Badge variant={paymentStatus === 'paid' ? 'default' : paymentStatus === 'partial' ? 'secondary' : 'outline'} className="mt-1">{paymentStatus === 'paid' ? t('pmts.allPaid') : paymentStatus === 'partial' ? t('pmts.partialPaid') : t('pmts.unpaid')}</Badge><p className="text-xs text-muted-foreground mt-1">{t('pmts.paymentStatus')}</p></div></div></div>
        </div>

        {paymentStatus === 'paid' && (
          <Card className="mb-4 bg-green-500/10 border-green-500/30">
            <CardContent className="py-3 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-medium text-green-700 dark:text-green-400">{t('pmts.allPaidMsg')}</span></CardContent>
          </Card>
        )}

        <h3 className="font-semibold mb-3">{t('pmts.paymentRecords')}</h3>
        {payments.length === 0 ? (
          <Card><CardContent className="py-8 text-center"><CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">{t('pmts.noPayments')}</p></CardContent></Card>
        ) : (
          <Card><ScrollArea className="w-full"><Table>
            <TableHeader><TableRow>
              <TableHead className="w-12 text-center">{t('pmts.seq')}</TableHead>
              <TableHead>{t('pmts.date')}</TableHead>
              <TableHead className="text-right">{t('pmts.amountRM')}</TableHead>
              <TableHead>{t('pmts.method')}</TableHead>
              <TableHead>{t('pmts.refNo')}</TableHead>
              <TableHead>{t('pmts.notes')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{payments.map((p: any, idx: number) => (
              <TableRow key={p.id}>
                <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>{p.paymentDate}</TableCell>
                <TableCell className="text-right font-bold">{p.amount.toFixed(2)}</TableCell>
                <TableCell>{getMethodLabel(p.paymentMethod)}</TableCell>
                <TableCell className="text-muted-foreground">{p.referenceNo || '--'}</TableCell>
                <TableCell className="text-muted-foreground">{p.notes || '--'}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table></ScrollArea></Card>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('pmts.addPayment')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('pmts.payAmountRM')}</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>{t('pmts.payDate')}</Label><Input type="date" value={form.paymentDate} onChange={e => setForm({...form, paymentDate: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>{t('pmts.method')}</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm({...form, paymentMethod: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">{t('pmts.bankTransfer')}</SelectItem>
                  <SelectItem value="cash">{t('pmts.cash')}</SelectItem>
                  <SelectItem value="cheque">{t('pmts.cheque')}</SelectItem>
                  <SelectItem value="online">{t('pmts.online')}</SelectItem>
                  <SelectItem value="other">{t('pmts.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{t('pmts.refNo')}</Label><Input value={form.referenceNo} onChange={e => setForm({...form, referenceNo: e.target.value})} placeholder={t('pmts.refPlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('pmts.notes')}</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{t('pmts.confirmPay')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}