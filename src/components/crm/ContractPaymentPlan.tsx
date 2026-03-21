import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import { useAuth } from '@/lib/auth';
import { crmService } from '@/services';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Check, Trash2, DollarSign } from 'lucide-react';

type PaymentPlan = {
  id: string;
  contract_id: string;
  milestone_name: string;
  percentage: number;
  amount: number;
  currency: string;
  due_date: string | null;
  status: string;
  paid_amount: number;
  paid_at: string | null;
  payment_method: string | null;
  sort_order: number;
  notes: string | null;
};

interface ContractPaymentPlanProps {
  contractId: string;
  contractTotal: number;
  contractCurrency: string;
}

const PRESET_MILESTONES = [
  { name: 'deposit', percentage: 30 },
  { name: 'progress', percentage: 40 },
  { name: 'final', percentage: 30 },
];

export function ContractPaymentPlan({ contractId, contractTotal, contractCurrency }: ContractPaymentPlanProps) {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payingPlan, setPayingPlan] = useState<PaymentPlan | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank');

  const [form, setForm] = useState({
    milestone_name: '', percentage: '', amount: '', due_date: '',
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['contract_payment_plans', contractId],
    queryFn: () => crmService.fetchPaymentPlans(contractId),
  });

  const totalPlanned = plans.reduce((s, p) => s + p.amount, 0);
  const totalPaid = plans.reduce((s, p) => s + p.paid_amount, 0);
  const progressPct = contractTotal > 0 ? Math.round((totalPaid / contractTotal) * 100) : 0;

  const addMutation = useMutation({
    mutationFn: async () => {
      const pct = parseFloat(form.percentage) || 0;
      const amt = form.amount ? parseFloat(form.amount) : contractTotal * (pct / 100);
      await crmService.addPaymentPlan({
        contract_id: contractId,
        milestone_name: form.milestone_name,
        percentage: pct,
        amount: amt,
        currency: contractCurrency,
        due_date: form.due_date || null,
        sort_order: plans.length,
        created_by: user?.id,
        tenant_id: tenant!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_payment_plans', contractId] });
      setShowAdd(false);
      setForm({ milestone_name: '', percentage: '', amount: '', due_date: '' });
      toast.success(t('common.createSuccess'));
    },
    onError: () => toast.error(t('common.operationFailed')),
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!payingPlan) return;
      const amount = parseFloat(payAmount) || 0;
      const newPaid = payingPlan.paid_amount + amount;
      await crmService.recordPaymentPlanPayment(payingPlan.id, newPaid, payingPlan.amount, payMethod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_payment_plans', contractId] });
      setShowPayDialog(false);
      setPayingPlan(null);
      setPayAmount('');
      toast.success(t('crm.paymentRecorded'));
    },
    onError: () => toast.error(t('common.operationFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmService.deletePaymentPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_payment_plans', contractId] });
      toast.success(t('common.deleteSuccess'));
    },
  });

  const applyPreset = async () => {
    const inserts = PRESET_MILESTONES.map((m, i) => ({
      contract_id: contractId,
      milestone_name: t(`crm.milestone_${m.name}`),
      percentage: m.percentage,
      amount: contractTotal * (m.percentage / 100),
      currency: contractCurrency,
      sort_order: i,
      created_by: user?.id,
      tenant_id: tenant!.id,
    }));
    try {
      await crmService.batchInsertPaymentPlans(inserts);
      queryClient.invalidateQueries({ queryKey: ['contract_payment_plans', contractId] });
      toast.success(t('common.createSuccess'));
    } catch {
      toast.error(t('common.operationFailed'));
    }
  };

  const openPay = (plan: PaymentPlan) => {
    setPayingPlan(plan);
    setPayAmount(String(plan.amount - plan.paid_amount));
    setShowPayDialog(true);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-muted text-muted-foreground',
      partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    };
    return <Badge className={colors[status] || ''}>{t(`crm.planStatus_${status}`)}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('crm.collectionProgress')}</span>
          <span className="font-medium">{contractCurrency} {totalPaid.toLocaleString()} / {contractTotal.toLocaleString()} ({progressPct}%)</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Milestones */}
      {plans.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <p className="mb-3">{t('crm.noPaymentPlans')}</p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={applyPreset}>{t('crm.usePreset')}</Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5 mr-1" />{t('crm.addMilestone')}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map(plan => (
            <div key={plan.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{plan.milestone_name}</span>
                  {statusBadge(plan.status)}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                  <span>{plan.percentage}% = {contractCurrency} {plan.amount.toLocaleString()}</span>
                  {plan.due_date && <span>{t('crm.dueDate')}: {plan.due_date}</span>}
                  {plan.paid_amount > 0 && <span>{t('crm.paid')}: {plan.paid_amount.toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                {plan.status !== 'paid' && (
                  <Button size="sm" variant="outline" onClick={() => openPay(plan)}>
                    <DollarSign className="w-3.5 h-3.5 mr-1" />{t('crm.recordPayment')}
                  </Button>
                )}
                {plan.status === 'pending' && plan.paid_amount === 0 && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                    if (confirm(t('common.confirmDelete'))) deleteMutation.mutate(plan.id);
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-muted-foreground">
              {t('crm.planned')}: {contractCurrency} {totalPlanned.toLocaleString()}
              {totalPlanned !== contractTotal && ` (${t('crm.remaining')}: ${(contractTotal - totalPlanned).toLocaleString()})`}
            </span>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />{t('crm.addMilestone')}
            </Button>
          </div>
        </div>
      )}

      {/* Add Milestone Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('crm.addMilestone')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('crm.milestoneName')}</Label>
              <Input value={form.milestone_name} onChange={e => setForm(p => ({ ...p, milestone_name: e.target.value }))}
                placeholder={t('crm.milestoneNamePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('crm.percentage')}</Label>
                <Input type="number" value={form.percentage}
                  onChange={e => {
                    const pct = parseFloat(e.target.value) || 0;
                    setForm(p => ({ ...p, percentage: e.target.value, amount: String(contractTotal * pct / 100) }));
                  }} />
              </div>
              <div>
                <Label>{t('crm.amount')}</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{t('crm.dueDate')}</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!form.milestone_name || addMutation.isPending}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('crm.recordPayment')}</DialogTitle></DialogHeader>
          {payingPlan && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {payingPlan.milestone_name} — {t('crm.outstanding')}: {contractCurrency} {(payingPlan.amount - payingPlan.paid_amount).toLocaleString()}
              </p>
              <div>
                <Label>{t('crm.payAmount')}</Label>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </div>
              <div>
                <Label>{t('crm.paymentMethod')}</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">{t('crm.methodBank')}</SelectItem>
                    <SelectItem value="cash">{t('crm.methodCash')}</SelectItem>
                    <SelectItem value="cheque">{t('crm.methodCheque')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPayDialog(false)}>{t('common.cancel')}</Button>
                <Button onClick={() => payMutation.mutate()} disabled={!payAmount || payMutation.isPending}>
                  <Check className="w-4 h-4 mr-1" />{t('common.confirm')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
