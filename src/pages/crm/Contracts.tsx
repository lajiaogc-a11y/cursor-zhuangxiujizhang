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
import { Plus, Search, Eye, Edit, FileSignature, FileText, Send, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { SignaturePad } from '@/components/crm/SignaturePad';
import { generateContractPdf } from '@/lib/contractPdfExport';
import { ContractPaymentPlan } from '@/components/crm/ContractPaymentPlan';

type Contract = {
  id: string;
  contract_number: string;
  title: string;
  template_id: string | null;
  contact_id: string | null;
  project_id: string | null;
  content: string;
  status: string;
  total_amount: number;
  currency: string;
  signed_at: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  contacts: { name: string } | null;
  projects: { project_name: string } | null;
};

type Template = { id: string; name: string; content: string; merge_fields: string[] };
type Contact = { id: string; name: string; phone: string | null; email: string | null; address: string | null; company_name: string | null };
type Project = { id: string; project_name: string; project_code: string };

const CONTRACT_STATUSES = ['draft', 'sent', 'signed', 'active', 'completed', 'cancelled'] as const;

const statusConfig: Record<string, { color: string; icon: typeof FileText }> = {
  draft: { color: 'bg-muted text-muted-foreground', icon: FileText },
  sent: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: Send },
  signed: { color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: FileSignature },
  active: { color: 'bg-primary/10 text-primary', icon: CheckCircle },
  completed: { color: 'bg-muted text-muted-foreground', icon: CheckCircle },
  cancelled: { color: 'bg-destructive/10 text-destructive', icon: FileText },
};

export default function CRMContracts() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [signerName, setSignerName] = useState('');

  const [form, setForm] = useState({
    title: '', template_id: '', contact_id: '', project_id: '',
    content: '', total_amount: '', currency: 'MYR', effective_date: '', expiry_date: '', notes: '',
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', tenantId],
    queryFn: () => crmService.fetchContracts(tenantId!),
    enabled: !!tenantId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['contract_templates_select', tenantId],
    queryFn: () => crmService.fetchContractTemplatesForSelect(tenantId!),
    enabled: !!tenantId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['contacts_for_contracts', tenantId],
    queryFn: () => crmService.fetchCustomersForSelect(tenantId!),
    enabled: !!tenantId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects_for_contracts', tenantId],
    queryFn: () => crmService.fetchProjectsForSelect(tenantId!),
    enabled: !!tenantId,
  });

  const generateContractNumber = () => {
    const prefix = 'CT';
    const date = format(new Date(), 'yyyyMMdd');
    const seq = String(contracts.length + 1).padStart(3, '0');
    return `${prefix}-${date}-${seq}`;
  };

  const applyMergeFields = (content: string, contactId: string, projectId: string) => {
    const customer = customers.find((c: any) => c.id === contactId);
    const project = projects.find((p: any) => p.id === projectId);
    let result = content;
    if (customer) {
      result = result.replace(/\{\{customer_name\}\}/g, customer.name || '');
      result = result.replace(/\{\{customer_phone\}\}/g, customer.phone || '');
      result = result.replace(/\{\{customer_email\}\}/g, customer.email || '');
      result = result.replace(/\{\{customer_address\}\}/g, customer.address || '');
    }
    if (project) {
      result = result.replace(/\{\{project_name\}\}/g, project.project_name || '');
      result = result.replace(/\{\{project_address\}\}/g, '');
    }
    result = result.replace(/\{\{contract_number\}\}/g, form.title ? generateContractNumber() : '');
    result = result.replace(/\{\{contract_date\}\}/g, format(new Date(), 'yyyy-MM-dd'));
    result = result.replace(/\{\{total_amount\}\}/g, form.total_amount || '0');
    result = result.replace(/\{\{currency\}\}/g, form.currency);
    return result;
  };

  const onTemplateChange = (templateId: string) => {
    const tpl = templates.find((t: any) => t.id === templateId);
    if (tpl) {
      let content = tpl.content;
      if (form.contact_id) content = applyMergeFields(content, form.contact_id, form.project_id);
      setForm(p => ({ ...p, template_id: templateId, content }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await crmService.saveContract(tenantId!, user!.id, {
        title: form.title,
        contract_number: editing?.contract_number || generateContractNumber(),
        template_id: form.template_id || null,
        contact_id: form.contact_id || null,
        project_id: form.project_id || null,
        content: form.content,
        total_amount: parseFloat(form.total_amount) || 0,
        currency: form.currency,
        effective_date: form.effective_date || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      }, editing?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowDialog(false);
      setEditing(null);
      toast.success(editing ? t('common.updateSuccess') : t('common.createSuccess'));
    },
    onError: () => toast.error(t('common.operationFailed')),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await crmService.updateContractStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success(t('common.updateSuccess'));
    },
  });

  const signMutation = useMutation({
    mutationFn: async ({ contractId, signerName: name, signatureData }: { contractId: string; signerName: string; signatureData: string }) => {
      await crmService.signContract(tenantId!, contractId, name, signatureData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowSignDialog(false);
      setSigningContract(null);
      setSignerName('');
      toast.success(t('crm.signSuccess'));
    },
    onError: () => toast.error(t('common.operationFailed')),
  });

  const handleExportPdf = async (contract: Contract) => {
    const sigs = await crmService.fetchContractSignatures(contract.id);
    generateContractPdf({
      contractNumber: contract.contract_number,
      title: contract.title,
      customerName: contract.contacts?.name || '-',
      content: contract.content,
      totalAmount: contract.total_amount,
      currency: contract.currency,
      effectiveDate: contract.effective_date,
      expiryDate: contract.expiry_date,
      signatures: sigs.map((s: any) => ({
        signerName: s.signer_name,
        signerRole: s.signer_role || 'customer',
        signatureData: s.signature_data,
        signedAt: s.signed_at ? format(new Date(s.signed_at), 'yyyy-MM-dd HH:mm') : '',
      })),
    });
    toast.success(t('crm.pdfExported'));
  };

  const filtered = useMemo(() => {
    return contracts.filter(c => {
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.contract_number.toLowerCase().includes(search.toLowerCase()) ||
        c.contacts?.name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [contracts, search, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', template_id: '', contact_id: '', project_id: '', content: '', total_amount: '', currency: 'MYR', effective_date: '', expiry_date: '', notes: '' });
    setShowDialog(true);
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    setForm({
      title: c.title, template_id: c.template_id || '', contact_id: c.contact_id || '',
      project_id: c.project_id || '', content: c.content, total_amount: String(c.total_amount),
      currency: c.currency, effective_date: c.effective_date || '', expiry_date: c.expiry_date || '', notes: c.notes || '',
    });
    setShowDialog(true);
  };

  const getStatusLabel = (status: string) => t(`crm.status_${status}`);

  const stats = useMemo(() => ({
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    active: contracts.filter(c => ['signed', 'active'].includes(c.status)).length,
    totalAmount: contracts.filter(c => ['signed', 'active', 'completed'].includes(c.status))
      .reduce((sum, c) => sum + (c.total_amount || 0), 0),
  }), [contracts]);

  return (
    <MobilePageShell title={t('crm.contractManagement')} backTo="/crm">
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">{t('crm.contractManagement')}</h1>
          <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />{t('crm.newContract')}</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{t('crm.totalContracts')}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.draft}</p>
            <p className="text-xs text-muted-foreground">{t('crm.draftContracts')}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.active}</p>
            <p className="text-xs text-muted-foreground">{t('crm.activeContracts')}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('crm.contractValue')}</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('crm.searchContracts')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('crm.allStatuses')}</SelectItem>
              {CONTRACT_STATUSES.map(s => <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileSignature className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">{t('crm.noContracts')}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('crm.contractNo')}</TableHead>
                  <TableHead>{t('crm.contractTitle')}</TableHead>
                  <TableHead>{t('crm.customer')}</TableHead>
                  <TableHead className="text-right">{t('crm.amount')}</TableHead>
                  <TableHead>{t('crm.contractStatus')}</TableHead>
                  <TableHead>{t('common.createdAt')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.contract_number}</TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{c.contacts?.name || '-'}</TableCell>
                    <TableCell className="text-right">{c.currency} {c.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[c.status]?.color || ''}>
                        {getStatusLabel(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(c.created_at), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewContract(c)}><Eye className="w-3.5 h-3.5" /></Button>
                        {c.status === 'draft' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => updateStatusMutation.mutate({ id: c.id, status: 'sent' })}>
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {c.status === 'sent' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatusMutation.mutate({ id: c.id, status: 'signed' })}>
                            <FileSignature className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* View Dialog */}
        <Dialog open={!!viewContract} onOpenChange={() => setViewContract(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewContract?.title}</DialogTitle>
            </DialogHeader>
            {viewContract && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">{t('crm.contractNo')}:</span> {viewContract.contract_number}</div>
                  <div><span className="text-muted-foreground">{t('crm.customer')}:</span> {viewContract.contacts?.name || '-'}</div>
                  <div><span className="text-muted-foreground">{t('crm.amount')}:</span> {viewContract.currency} {viewContract.total_amount.toLocaleString()}</div>
                  <div><span className="text-muted-foreground">{t('crm.contractStatus')}:</span> <Badge className={statusConfig[viewContract.status]?.color}>{getStatusLabel(viewContract.status)}</Badge></div>
                </div>
                <div className="border rounded p-4 bg-muted/30 whitespace-pre-wrap text-sm font-mono max-h-48 overflow-y-auto">{viewContract.content || t('crm.noContent')}</div>
                {['signed', 'active', 'completed'].includes(viewContract.status) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{t('crm.paymentPlan')}</h3>
                    <ContractPaymentPlan
                      contractId={viewContract.id}
                      contractTotal={viewContract.total_amount}
                      contractCurrency={viewContract.currency}
                    />
                  </div>
                )}
                <div className="flex gap-2 justify-between">
                  <Button variant="outline" size="sm" onClick={() => handleExportPdf(viewContract)}>
                    <Download className="w-4 h-4 mr-1" />{t('crm.exportPdf')}
                  </Button>
                  <div className="flex gap-2">
                    {viewContract.status === 'draft' && (
                      <Button onClick={() => { updateStatusMutation.mutate({ id: viewContract.id, status: 'sent' }); setViewContract(null); }}>
                        <Send className="w-4 h-4 mr-1" />{t('crm.sendContract')}
                      </Button>
                    )}
                    {viewContract.status === 'sent' && (
                      <Button onClick={() => {
                        setSigningContract(viewContract);
                        setSignerName(viewContract.contacts?.name || '');
                        setShowSignDialog(true);
                        setViewContract(null);
                      }}>
                        <FileSignature className="w-4 h-4 mr-1" />{t('crm.signContract')}
                      </Button>
                    )}
                    {viewContract.status === 'signed' && (
                      <Button onClick={() => { updateStatusMutation.mutate({ id: viewContract.id, status: 'active' }); setViewContract(null); }}>
                        <CheckCircle className="w-4 h-4 mr-1" />{t('crm.activateContract')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? t('crm.editContract') : t('crm.newContract')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('crm.contractTitle')}</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <Label>{t('crm.useTemplate')}</Label>
                  <Select value={form.template_id} onValueChange={onTemplateChange}>
                    <SelectTrigger><SelectValue placeholder={t('crm.selectTemplate')} /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('crm.customer')}</Label>
                  <Select value={form.contact_id} onValueChange={v => setForm(p => ({ ...p, contact_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t('crm.selectCustomer')} /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('crm.project')}</Label>
                  <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t('crm.selectProject')} /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.project_code} - {p.project_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('crm.amount')}</Label>
                  <Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} />
                </div>
                <div>
                  <Label>{t('common.currency')}</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MYR">MYR</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('crm.effectiveDate')}</Label>
                  <Input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} />
                </div>
                <div>
                  <Label>{t('crm.expiryDate')}</Label>
                  <Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>{t('crm.contractContent')}</Label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder={t('crm.contractContentPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('common.remarks')}</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.title || saveMutation.isPending}
                >
                  {saveMutation.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sign Dialog */}
        <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{t('crm.signContract')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('crm.signerName')}</Label>
                <Input value={signerName} onChange={e => setSignerName(e.target.value)} />
              </div>
              <SignaturePad
                onSave={(dataUrl) => {
                  if (!signingContract || !signerName) return;
                  signMutation.mutate({
                    contractId: signingContract.id,
                    signerName,
                    signatureData: dataUrl,
                  });
                }}
                onCancel={() => setShowSignDialog(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobilePageShell>
  );
}
