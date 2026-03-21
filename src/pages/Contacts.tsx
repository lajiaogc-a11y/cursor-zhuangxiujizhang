import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { formatMoney } from '@/lib/formatCurrency';
import { format } from 'date-fns';
import { Plus, Search, Edit, Trash2, Users, Building2, UserCheck, Eye } from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';
import * as contactsService from '@/services/contacts.service';

type Contact = {
  id: string; contact_type: string; name: string; company_name: string | null;
  email: string | null; phone: string | null; address: string | null;
  tax_id: string | null; default_currency: string | null; notes: string | null;
  is_active: boolean | null; created_at: string;
};

const emptyForm = {
  contact_type: 'customer', name: '', company_name: '', email: '', phone: '',
  address: '', tax_id: '', default_currency: 'MYR', notes: '', is_active: true,
};

export default function Contacts() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: [...queryKeys.contacts, tenantId],
    queryFn: () => contactsService.fetchContacts(tenantId!),
    enabled: !!tenantId,
  });

  const { data: contactInvoices = [] } = useQuery({
    queryKey: ['contact_invoices', detailContact?.id],
    queryFn: () => contactsService.fetchContactInvoices(detailContact!.id),
    enabled: !!detailContact,
  });

  const { data: contactPayables = [] } = useQuery({
    queryKey: ['contact_payables', detailContact?.id],
    queryFn: () => contactsService.fetchContactPayables(detailContact!.name),
    enabled: !!detailContact,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      await contactsService.saveContact({
        ...data,
        created_by: user?.id,
        tenant_id: tenantId,
      }, data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      setDialogOpen(false); setEditingContact(null); setForm(emptyForm);
      toast({ title: t('common.success') });
    },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsService.deleteContact(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.contacts }); toast({ title: t('common.deleteSuccess') }); },
    onError: () => toast({ title: t('common.deleteFailed'), variant: 'destructive' }),
  });

  const filtered = useMemo(() => {
    return (contacts as Contact[]).filter(c => {
      if (typeFilter !== 'all' && c.contact_type !== typeFilter) return false;
      if (search) {
        const kw = search.toLowerCase();
        return c.name.toLowerCase().includes(kw) || (c.company_name || '').toLowerCase().includes(kw) || (c.email || '').toLowerCase().includes(kw) || (c.phone || '').includes(kw);
      }
      return true;
    });
  }, [contacts, search, typeFilter]);

  const stats = useMemo(() => ({
    total: contacts.length,
    customers: (contacts as Contact[]).filter(c => c.contact_type === 'customer' || c.contact_type === 'both').length,
    suppliers: (contacts as Contact[]).filter(c => c.contact_type === 'supplier' || c.contact_type === 'both').length,
  }), [contacts]);

  const openEdit = (c: Contact) => {
    setEditingContact(c);
    setForm({ contact_type: c.contact_type, name: c.name, company_name: c.company_name || '', email: c.email || '', phone: c.phone || '', address: c.address || '', tax_id: c.tax_id || '', default_currency: c.default_currency || 'MYR', notes: c.notes || '', is_active: c.is_active !== false });
    setDialogOpen(true);
  };

  const openNew = () => { setEditingContact(null); setForm(emptyForm); setDialogOpen(true); };

  const typeLabel = (type: string) => ({ customer: t('contacts.customer'), supplier: t('contacts.supplier'), both: t('contacts.both') }[type] || type);
  const typeBadgeVariant = (type: string) => ({ customer: 'default', supplier: 'secondary', both: 'outline' }[type] || 'outline');

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-end gap-4">
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />{t('contacts.newContact')}</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-4"><Users className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">{t('common.all')}</p><p className="text-2xl font-bold">{stats.total}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-4"><UserCheck className="w-8 h-8 text-green-600" /><div><p className="text-sm text-muted-foreground">{t('contacts.customer')}</p><p className="text-2xl font-bold">{stats.customers}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-4"><Building2 className="w-8 h-8 text-blue-600" /><div><p className="text-sm text-muted-foreground">{t('contacts.supplier')}</p><p className="text-2xl font-bold">{stats.suppliers}</p></div></CardContent></Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('contacts.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('contacts.allTypes')}</SelectItem>
              <SelectItem value="customer">{t('contacts.customer')}</SelectItem>
              <SelectItem value="supplier">{t('contacts.supplier')}</SelectItem>
              <SelectItem value="both">{t('contacts.both')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('contacts.name')}</TableHead>
                  <TableHead>{t('contacts.companyName')}</TableHead>
                  <TableHead>{t('contacts.contactType')}</TableHead>
                  <TableHead>{t('contacts.phone')}</TableHead>
                  <TableHead>{t('contacts.email')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">{isLoading ? t('common.loading') : t('contacts.noContacts')}</TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.company_name || '-'}</TableCell>
                    <TableCell><Badge variant={typeBadgeVariant(c.contact_type) as any}>{typeLabel(c.contact_type)}</Badge></TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>{c.email || '-'}</TableCell>
                    <TableCell><Badge variant={c.is_active !== false ? 'default' : 'secondary'}>{c.is_active !== false ? t('contacts.active') : t('contacts.inactive')}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailContact(c)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(c.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingContact ? t('contacts.editContact') : t('contacts.newContact')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('contacts.contactType')}</Label>
              <Select value={form.contact_type} onValueChange={v => setForm(f => ({ ...f, contact_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="customer">{t('contacts.customer')}</SelectItem><SelectItem value="supplier">{t('contacts.supplier')}</SelectItem><SelectItem value="both">{t('contacts.both')}</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>{t('contacts.name')} *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{t('contacts.companyName')}</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('contacts.phone')}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>{t('contacts.email')}</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><Label>{t('contacts.address')}</Label><Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('contacts.taxId')}</Label><Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} /></div>
              <div><Label>{t('contacts.defaultCurrency')}</Label>
                <Select value={form.default_currency} onValueChange={v => setForm(f => ({ ...f, default_currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="MYR">MYR</SelectItem><SelectItem value="CNY">CNY</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{t('contacts.notes')}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>{t('contacts.active')}</Label></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMutation.mutate({ ...form, id: editingContact?.id })} disabled={!form.name.trim()}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Detail Dialog */}
      <Dialog open={!!detailContact} onOpenChange={(open) => { if (!open) setDetailContact(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailContact?.name} — {t('contacts.transactionHistory')}</DialogTitle></DialogHeader>
          <Tabs defaultValue="invoices">
            <TabsList>
              <TabsTrigger value="invoices">{t('invoices.title')} ({contactInvoices.length})</TabsTrigger>
              <TabsTrigger value="payables">{t('payables.title')} ({contactPayables.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="invoices" className="mt-2">
              {contactInvoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('invoices.noInvoices')}</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('invoices.invoiceNumber')}</TableHead>
                    <TableHead>{t('invoices.status')}</TableHead>
                    <TableHead className="text-right">{t('invoices.totalAmount')}</TableHead>
                    <TableHead>{t('common.date')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {contactInvoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                        <TableCell><Badge variant="outline">{inv.status}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{inv.currency} {formatMoney(inv.total_amount, inv.currency)}</TableCell>
                        <TableCell>{format(new Date(inv.issue_date), 'yyyy-MM-dd')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            <TabsContent value="payables" className="mt-2">
              {contactPayables.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('payables.noPayables')}</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('payables.description')}</TableHead>
                    <TableHead>{t('invoices.status')}</TableHead>
                    <TableHead className="text-right">{t('payables.unpaidAmount')}</TableHead>
                    <TableHead>{t('common.date')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {contactPayables.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.description}</TableCell>
                        <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{p.currency} {formatMoney(p.unpaid_amount, p.currency)}</TableCell>
                        <TableCell>{format(new Date(p.payable_date), 'yyyy-MM-dd')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
