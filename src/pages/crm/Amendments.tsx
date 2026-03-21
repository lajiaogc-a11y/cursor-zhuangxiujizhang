import { useState, useMemo } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import { useAuth } from '@/lib/auth';
import { crmService } from '@/services';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, Check, X, FileEdit, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-destructive/10 text-destructive',
};

export default function CRMAmendments() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewingAmendment, setReviewingAmendment] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');

  const [form, setForm] = useState({
    contract_id: '', title: '', description: '', amount_change: '',
  });

  const { data: amendments = [], isLoading } = useQuery({
    queryKey: ['contract_amendments', tenantId],
    queryFn: () => crmService.fetchAmendments(tenantId!),
    enabled: !!tenantId,
  });

  const { data: activeContracts = [] } = useQuery({
    queryKey: ['active_contracts_for_amendments', tenantId],
    queryFn: () => crmService.fetchActiveContracts(tenantId!),
    enabled: !!tenantId,
  });

  const generateAmendmentNumber = (contractNumber: string) => {
    const count = amendments.filter((a: any) => a.contracts?.contract_number === contractNumber).length;
    return `${contractNumber}-A${String(count + 1).padStart(2, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const contract = activeContracts.find((c: any) => c.id === form.contract_id);
      if (!contract) throw new Error('Contract not found');
      const amountChange = parseFloat(form.amount_change) || 0;
      await crmService.createAmendment(tenantId!, user!.id, {
        contract_id: form.contract_id,
        amendment_number: generateAmendmentNumber(contract.contract_number),
        title: form.title,
        description: form.description || null,
        amount_change: amountChange,
        new_total_amount: contract.total_amount + amountChange,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_amendments'] });
      setShowDialog(false);
      setForm({ contract_id: '', title: '', description: '', amount_change: '' });
      toast.success(t('common.createSuccess'));
    },
    onError: () => toast.error(t('common.operationFailed')),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, contractId, newTotal }: { id: string; status: string; contractId: string; newTotal: number }) => {
      await crmService.reviewAmendment(user!.id, id, status, reviewNote || null, contractId, newTotal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_amendments'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowReviewDialog(false);
      setReviewingAmendment(null);
      setReviewNote('');
      toast.success(t('common.updateSuccess'));
    },
    onError: () => toast.error(t('common.operationFailed')),
  });

  const filtered = useMemo(() => {
    return amendments.filter((a: any) => {
      const matchSearch = !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.amendment_number.toLowerCase().includes(search.toLowerCase()) ||
        a.contracts?.contract_number?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [amendments, search, statusFilter]);

  const stats = useMemo(() => ({
    total: amendments.length,
    pending: amendments.filter((a: any) => a.status === 'pending').length,
    approved: amendments.filter((a: any) => a.status === 'approved').length,
    totalChange: amendments.filter((a: any) => a.status === 'approved').reduce((sum: number, a: any) => sum + (a.amount_change || 0), 0),
  }), [amendments]);

  const openReview = (amendment: any) => {
    setReviewingAmendment(amendment);
    setReviewNote('');
    setShowReviewDialog(true);
  };

  return (
    <MobilePageShell title={t('crm.amendments')} backTo="/crm">
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">{t('crm.amendments')}</h1>
          <Button onClick={() => setShowDialog(true)} size="sm"><Plus className="w-4 h-4 mr-1" />{t('crm.newAmendment')}</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{t('crm.totalAmendments')}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">{t('crm.pendingAmendments')}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">{t('crm.approvedAmendments')}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalChange >= 0 ? '+' : ''}{stats.totalChange.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('crm.totalAmountChange')}</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('crm.searchAmendments')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('crm.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('crm.amendmentPending')}</SelectItem>
              <SelectItem value="approved">{t('crm.amendmentApproved')}</SelectItem>
              <SelectItem value="rejected">{t('crm.amendmentRejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileEdit className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">{t('crm.noAmendments')}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('crm.amendmentNo')}</TableHead>
                  <TableHead>{t('crm.amendmentTitle')}</TableHead>
                  <TableHead>{t('crm.originalContract')}</TableHead>
                  <TableHead className="text-right">{t('crm.amountChange')}</TableHead>
                  <TableHead className="text-right">{t('crm.newTotal')}</TableHead>
                  <TableHead>{t('crm.contractStatus')}</TableHead>
                  <TableHead>{t('common.createdAt')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.amendment_number}</TableCell>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="text-xs">{a.contracts?.contract_number} - {a.contracts?.title}</TableCell>
                    <TableCell className={`text-right font-medium ${a.amount_change >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {a.amount_change >= 0 ? '+' : ''}{a.amount_change.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{a.new_total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[a.status] || ''}>{t(`crm.amendment_${a.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(a.created_at), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>
                      {a.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => openReview(a)}>
                          <Clock className="w-3.5 h-3.5 mr-1" />{t('crm.review')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Create Amendment Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t('crm.newAmendment')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('crm.originalContract')}</Label>
                <Select value={form.contract_id} onValueChange={v => setForm(p => ({ ...p, contract_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('crm.selectContract')} /></SelectTrigger>
                  <SelectContent>
                    {activeContracts.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.contract_number} - {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('crm.amendmentTitle')}</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={t('crm.amendmentTitlePlaceholder')} />
              </div>
              <div>
                <Label>{t('crm.amountChange')}</Label>
                <Input type="number" value={form.amount_change} onChange={e => setForm(p => ({ ...p, amount_change: e.target.value }))} placeholder={t('crm.amountChangePlaceholder')} />
                {form.contract_id && form.amount_change && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('crm.originalAmount')}: {activeContracts.find((c: any) => c.id === form.contract_id)?.total_amount.toLocaleString()} →{' '}
                    {t('crm.newTotal')}: {((activeContracts.find((c: any) => c.id === form.contract_id)?.total_amount || 0) + (parseFloat(form.amount_change) || 0)).toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <Label>{t('common.description')}</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!form.contract_id || !form.title || createMutation.isPending}>
                  {createMutation.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t('crm.reviewAmendment')}</DialogTitle></DialogHeader>
            {reviewingAmendment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">{t('crm.amendmentNo')}:</span> {reviewingAmendment.amendment_number}</div>
                  <div><span className="text-muted-foreground">{t('crm.originalContract')}:</span> {reviewingAmendment.contracts?.contract_number}</div>
                  <div><span className="text-muted-foreground">{t('crm.amountChange')}:</span>
                    <span className={reviewingAmendment.amount_change >= 0 ? 'text-green-600' : 'text-destructive'}>
                      {' '}{reviewingAmendment.amount_change >= 0 ? '+' : ''}{reviewingAmendment.amount_change.toLocaleString()}
                    </span>
                  </div>
                  <div><span className="text-muted-foreground">{t('crm.newTotal')}:</span> {reviewingAmendment.new_total_amount.toLocaleString()}</div>
                </div>
                {reviewingAmendment.description && (
                  <div className="border rounded p-3 bg-muted/30 text-sm">{reviewingAmendment.description}</div>
                )}
                <div>
                  <Label>{t('crm.reviewNote')}</Label>
                  <Textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder={t('crm.reviewNotePlaceholder')} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="destructive" onClick={() => reviewMutation.mutate({
                    id: reviewingAmendment.id, status: 'rejected',
                    contractId: reviewingAmendment.contract_id, newTotal: reviewingAmendment.new_total_amount,
                  })} disabled={reviewMutation.isPending}>
                    <X className="w-4 h-4 mr-1" />{t('crm.reject')}
                  </Button>
                  <Button onClick={() => reviewMutation.mutate({
                    id: reviewingAmendment.id, status: 'approved',
                    contractId: reviewingAmendment.contract_id, newTotal: reviewingAmendment.new_total_amount,
                  })} disabled={reviewMutation.isPending}>
                    <Check className="w-4 h-4 mr-1" />{t('crm.approve')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobilePageShell>
  );
}
