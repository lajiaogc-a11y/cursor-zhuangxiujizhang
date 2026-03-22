import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchQSuppliers, fetchSupplierPriceCounts, saveQSupplier, deleteQSupplier, type QSupplier } from '@/services/suppliers.service';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Star, Phone } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';

type Supplier = QSupplier;

export default function Suppliers() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const canEdit = hasPermission('feature.edit');

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const [form, setForm] = useState({
    name: '', contact_person: '', phone: '', email: '',
    address: '', company_name: '', payment_terms: '',
    default_currency: 'MYR', rating: 0, notes: '',
  });

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['q_suppliers', tenantId],
    queryFn: () => fetchQSuppliers(tenantId!),
    enabled: !!tenantId,
  });

  const { data: priceCounts = {} } = useQuery({
    queryKey: ['q_supplier_price_counts', tenantId],
    queryFn: () => fetchSupplierPriceCounts(tenantId!),
    enabled: !!tenantId,
  });

  const upsertMutation = useMutation({
    mutationFn: (values: typeof form & { id?: string }) => saveQSupplier(values, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_suppliers', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_supplier_price_counts', tenantId] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? t('sup.supplierUpdated') : t('sup.supplierAdded') });
    },
    onError: (err: any) => toast({ title: t('sup.operationFailed'), description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_suppliers', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_supplier_price_counts', tenantId] });
      toast({ title: t('sup.supplierDeleted') });
    },
    onError: (err: any) => toast({ title: t('sup.deleteFailed'), description: err.message, variant: 'destructive' }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '', company_name: '', payment_terms: '', default_currency: 'MYR', rating: 0, notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name, contact_person: s.contact_person || '', phone: s.phone || '',
      email: s.email || '', address: s.address || '', company_name: s.company_name || '',
      payment_terms: s.payment_terms || '', default_currency: s.default_currency,
      rating: s.rating, notes: s.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: t('sup.nameRequired'), variant: 'destructive' });
      return;
    }
    upsertMutation.mutate({ ...form, id: editing?.id });
  };

  const filtered = suppliers.filter(s => {
    if (!search) return true;
    return s.name.includes(search) || s.company_name?.includes(search) || s.contact_person?.includes(search) || s.phone?.includes(search);
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          {canEdit && (
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />{t('sup.addSupplier')}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">{t('sup.totalSuppliers')}</p>
            <p className="text-2xl font-bold text-foreground">{suppliers.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">{t('sup.activeSuppliers')}</p>
            <p className="text-2xl font-bold text-primary">{suppliers.filter(s => s.is_active).length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">{t('sup.quotedMaterials')}</p>
            <p className="text-2xl font-bold text-foreground">{Object.values(priceCounts).reduce((a, b) => a + b, 0)}</p>
          </CardContent></Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('sup.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sup.supplier')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('sup.contactPerson')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('sup.phone')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('sup.paymentTerms')}</TableHead>
                  <TableHead className="text-center">{t('sup.quotedCount')}</TableHead>
                  <TableHead className="text-center">{t('sup.rating')}</TableHead>
                  <TableHead className="text-center">{t('sup.statusLabel')}</TableHead>
                  {canEdit && <TableHead className="text-center">{t('od.action')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="p-0"><AppSectionLoading label={t('common.loading')} compact /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      {s.company_name && <div className="text-xs text-muted-foreground">{s.company_name}</div>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{s.contact_person || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {s.phone ? <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span> : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{s.payment_terms || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{priceCounts[s.id] || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`w-3 h-3 ${n <= s.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.is_active ? 'default' : 'outline'}>{s.is_active ? t('sup.active') : t('sup.inactive')}</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm(t('sup.deleteConfirm'))) deleteMutation.mutate(s.id); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('sup.editSupplier') : t('sup.addSupplier')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('sup.supplierName')}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>{t('sup.companyName')}</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('sup.contactPerson')}</Label><Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
              <div><Label>{t('sup.phone')}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div><Label>{t('sup.email')}</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>{t('sup.address')}</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('sup.paymentTermsLabel')}</Label><Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} placeholder={t('sup.paymentTermsPlaceholder')} /></div>
              <div><Label>{t('sup.defaultCurrency')}</Label>
                <Select value={form.default_currency} onValueChange={v => setForm(f => ({ ...f, default_currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYR">MYR</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{t('sup.ratingLabel')}</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setForm(f => ({ ...f, rating: n }))}
                    className="focus:outline-none">
                    <Star className={`w-6 h-6 cursor-pointer transition-colors ${n <= form.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30 hover:text-yellow-400'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div><Label>{t('sup.notes')}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
                {upsertMutation.isPending && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
