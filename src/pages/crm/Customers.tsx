import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import * as crmService from '@/services/crm.service';
import type { Customer } from '@/services/crm.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Edit, Eye, Phone, MessageCircle, UserPlus, Users, TrendingUp, Clock } from 'lucide-react';


const leadSources = ['referral', 'online', 'social_media', 'walk_in', 'exhibition', 'other'];
const leadStatuses = ['new', 'contacted', 'negotiating', 'quoted', 'signed', 'lost'];

const emptyForm = {
  name: '',
  company_name: '',
  phone: '',
  email: '',
  address: '',
  whatsapp_number: '',
  lead_source: '',
  lead_status: 'new',
  property_address: '',
  property_type: '',
  estimated_budget: '',
  notes: '',
};

export default function CRMCustomers() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(searchParams.get('new') === 'true');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['crm-customers', tenantId],
    queryFn: () => crmService.fetchCustomers(tenantId!),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      await crmService.saveCustomer(tenantId!, user?.id || '', data, data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-customers', tenantId] });
      setDialogOpen(false);
      setEditingCustomer(null);
      setForm(emptyForm);
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (statusFilter !== 'all' && c.lead_status !== statusFilter) return false;
      if (sourceFilter !== 'all' && c.lead_source !== sourceFilter) return false;
      if (search) {
        const kw = search.toLowerCase();
        return c.name.toLowerCase().includes(kw) ||
          (c.company_name || '').toLowerCase().includes(kw) ||
          (c.phone || '').includes(kw);
      }
      return true;
    });
  }, [customers, search, statusFilter, sourceFilter]);

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({
      name: c.name,
      company_name: c.company_name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      whatsapp_number: c.whatsapp_number || '',
      lead_source: c.lead_source || '',
      lead_status: c.lead_status || 'new',
      property_address: c.property_address || '',
      property_type: c.property_type || '',
      estimated_budget: c.estimated_budget?.toString() || '',
      notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    const config: Record<string, { class: string; label: string }> = {
      new: { class: 'bg-blue-500/10 text-blue-500', label: t('crm.statusNew') },
      contacted: { class: 'bg-cyan-500/10 text-cyan-500', label: t('crm.statusContacted') },
      negotiating: { class: 'bg-amber-500/10 text-amber-500', label: t('crm.statusNegotiating') },
      quoted: { class: 'bg-purple-500/10 text-purple-500', label: t('crm.statusQuoted') },
      signed: { class: 'bg-green-500/10 text-green-500', label: t('crm.statusSigned') },
      lost: { class: 'bg-red-500/10 text-red-500', label: t('crm.statusLost') },
    };
    const c = config[status || 'new'] || config.new;
    return <Badge className={c.class}>{c.label}</Badge>;
  };

  const getSourceLabel = (source: string | null) => {
    if (!source) return '-';
    const map: Record<string, string> = {
      referral: t('crm.sourceReferral'),
      online: t('crm.sourceOnline'),
      social_media: t('crm.sourceSocialMedia'),
      walk_in: t('crm.sourceWalkIn'),
      exhibition: t('crm.sourceExhibition'),
      other: t('crm.sourceOther'),
    };
    return map[source] || source;
  };

  const stats = useMemo(() => ({
    total: customers.length,
    new: customers.filter(c => c.lead_status === 'new').length,
    negotiating: customers.filter(c => c.lead_status === 'negotiating' || c.lead_status === 'quoted').length,
    signed: customers.filter(c => c.lead_status === 'signed').length,
  }), [customers]);

  return (
    <MobilePageShell title={t('crm.customerManagement')} backTo="/crm">
      <div className="animate-page-enter space-y-5">
        <div className="flex justify-end">
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />{t('crm.newCustomer')}</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <div><p className="text-xs text-muted-foreground">{t('crm.totalCustomers')}</p><p className="text-xl font-bold">{stats.total}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-blue-500" />
            <div><p className="text-xs text-muted-foreground">{t('crm.statusNew')}</p><p className="text-xl font-bold">{stats.new}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-amber-500" />
            <div><p className="text-xs text-muted-foreground">{t('crm.statusNegotiating')}</p><p className="text-xl font-bold">{stats.negotiating}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Clock className="w-6 h-6 text-green-500" />
            <div><p className="text-xs text-muted-foreground">{t('crm.statusSigned')}</p><p className="text-xl font-bold">{stats.signed}</p></div>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('crm.searchCustomers')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder={t('crm.allStatuses')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('crm.allStatuses')}</SelectItem>
              {leadStatuses.map(s => <SelectItem key={s} value={s}>{getStatusBadge(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder={t('crm.allSources')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('crm.allSources')}</SelectItem>
              {leadSources.map(s => <SelectItem key={s} value={s}>{getSourceLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('crm.customerName')}</TableHead>
                    <TableHead>{t('contacts.companyName')}</TableHead>
                    <TableHead>{t('contacts.phone')}</TableHead>
                    <TableHead>{t('crm.leadSource')}</TableHead>
                    <TableHead>{t('crm.leadStatus')}</TableHead>
                    <TableHead>{t('crm.estimatedBudget')}</TableHead>
                    <TableHead>{t('crm.nextFollowUp')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="p-0"><AppSectionLoading label={t('common.loading')} compact /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{t('crm.noCustomers')}</TableCell></TableRow>
                  ) : filtered.map(c => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/crm/customers/${c.id}`)}>
                      <TableCell className="font-medium whitespace-nowrap">{c.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.company_name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {c.phone || '-'}
                          {c.whatsapp_number && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${c.whatsapp_number?.replace(/\D/g, '')}`, '_blank'); }}>
                              <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{getSourceLabel(c.lead_source)}</TableCell>
                      <TableCell className="whitespace-nowrap">{getStatusBadge(c.lead_status)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {c.estimated_budget ? `RM ${c.estimated_budget.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {c.next_follow_up ? (
                          <span className={new Date(c.next_follow_up) <= new Date() ? 'text-destructive font-medium' : ''}>
                            {c.next_follow_up}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/crm/customers/${c.id}`)}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? t('crm.editCustomer') : t('crm.newCustomer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('crm.customerName')} *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t('contacts.companyName')}</Label>
              <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('contacts.phone')}</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="+60123456789" />
              </div>
            </div>
            <div>
              <Label>{t('contacts.email')}</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('crm.leadSource')}</Label>
                <Select value={form.lead_source} onValueChange={v => setForm(f => ({ ...f, lead_source: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('crm.selectSource')} /></SelectTrigger>
                  <SelectContent>
                    {leadSources.map(s => <SelectItem key={s} value={s}>{getSourceLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('crm.leadStatus')}</Label>
                <Select value={form.lead_status} onValueChange={v => setForm(f => ({ ...f, lead_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map(s => <SelectItem key={s} value={s}>{getStatusBadge(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('crm.propertyAddress')}</Label>
              <Input value={form.property_address} onChange={e => setForm(f => ({ ...f, property_address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('crm.propertyType')}</Label>
                <Input value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))} placeholder={t('crm.propertyTypePlaceholder')} />
              </div>
              <div>
                <Label>{t('crm.estimatedBudget')}</Label>
                <Input type="number" value={form.estimated_budget} onChange={e => setForm(f => ({ ...f, estimated_budget: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{t('contacts.notes')}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMutation.mutate({ ...form, id: editingCustomer?.id })} disabled={!form.name.trim()}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobilePageShell>
  );
}
