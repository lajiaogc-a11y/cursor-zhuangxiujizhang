import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Copy, Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatMoney } from '@/lib/formatCurrency';
import { format } from 'date-fns';
import { exportInvoiceToPDF } from '@/lib/invoicePdfExport';
import { queryKeys } from '@/lib/queryKeys';
import * as invoicesService from '@/services/invoices.service';

type Invoice = {
  id: string; invoice_number: string; invoice_type: string; contact_id: string | null;
  status: string; issue_date: string; due_date: string | null; currency: string;
  exchange_rate: number; subtotal: number; tax_amount: number; total_amount: number;
  total_amount_myr: number; notes: string | null; terms: string | null;
  project_id: string | null; created_at: string;
};

type InvoiceItem = {
  id?: string; description: string; quantity: number; unit_price: number;
  tax_rate_id: string | null; tax_amount: number; amount: number; sort_order: number;
};

export default function Invoices() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    invoice_type: 'invoice', invoice_number: '', contact_id: '', status: 'draft',
    issue_date: new Date().toISOString().split('T')[0], due_date: '', currency: 'MYR',
    exchange_rate: 1, notes: '', terms: '', project_id: '',
  });
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0, tax_rate_id: null, tax_amount: 0, amount: 0, sort_order: 0 }]);

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: [...queryKeys.invoices, tenantId],
    queryFn: () => invoicesService.fetchInvoices(tenantId!),
    enabled: !!tenantId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: [...queryKeys.contacts, tenantId, 'invoice-contacts'],
    queryFn: () => invoicesService.fetchContacts(tenantId!),
    enabled: !!tenantId,
  });

  const { data: taxRates = [] } = useQuery({
    queryKey: [...queryKeys.taxRates, tenantId],
    queryFn: () => invoicesService.fetchTaxRates(tenantId!),
    enabled: !!tenantId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list', tenantId],
    queryFn: () => invoicesService.fetchProjects(tenantId!),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const taxAmount = items.reduce((s, i) => s + i.tax_amount, 0);
      const totalAmount = subtotal + taxAmount;
      const invoiceData = {
        invoice_number: form.invoice_number, invoice_type: form.invoice_type,
        contact_id: form.contact_id || null, status: form.status,
        issue_date: form.issue_date, due_date: form.due_date || null,
        currency: form.currency, exchange_rate: form.exchange_rate,
        subtotal, tax_amount: taxAmount, total_amount: totalAmount,
        total_amount_myr: totalAmount * form.exchange_rate,
        notes: form.notes || null, terms: form.terms || null,
        project_id: form.project_id || null,
        created_by: user?.id, tenant_id: tenantId,
      };
      await invoicesService.saveInvoice(invoiceData, items, editing?.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.invoices }); setDialogOpen(false); toast({ title: t('common.success') }); },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesService.deleteInvoice(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.invoices }); toast({ title: t('common.deleteSuccess') }); },
  });

  const filtered = useMemo(() => {
    return invoices.filter((inv: any) => {
      if (typeFilter !== 'all' && inv.invoice_type !== typeFilter) return false;
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (search) {
        const kw = search.toLowerCase();
        const contact = contacts.find((c: any) => c.id === inv.contact_id);
        return inv.invoice_number.toLowerCase().includes(kw) || (contact?.name || '').toLowerCase().includes(kw);
      }
      return true;
    });
  }, [invoices, search, typeFilter, statusFilter, contacts]);

  const updateItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      const qty = field === 'quantity' ? value : next[idx].quantity;
      const price = field === 'unit_price' ? value : next[idx].unit_price;
      next[idx].amount = qty * price;
      if (next[idx].tax_rate_id) {
        const rate = taxRates.find((r: any) => r.id === next[idx].tax_rate_id);
        if (rate) next[idx].tax_amount = next[idx].amount * (rate.rate / 100);
      }
      return next;
    });
  };

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, tax_rate_id: null, tax_amount: 0, amount: 0, sort_order: prev.length }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const generateNumber = () => {
    const prefix = form.invoice_type === 'invoice' ? 'INV' : form.invoice_type === 'quotation' ? 'QUO' : 'REC';
    return `${prefix}-${Date.now().toString().slice(-8)}`;
  };

  const openNew = (type: string) => {
    setEditing(null);
    setForm({ invoice_type: type, invoice_number: '', contact_id: '', status: 'draft', issue_date: new Date().toISOString().split('T')[0], due_date: '', currency: 'MYR', exchange_rate: 1, notes: '', terms: '', project_id: '' });
    setItems([{ description: '', quantity: 1, unit_price: 0, tax_rate_id: null, tax_amount: 0, amount: 0, sort_order: 0 }]);
    setTimeout(() => setForm(f => ({ ...f, invoice_number: generateNumber() })), 0);
    setDialogOpen(true);
  };

  const typeLabel = (type: string) => ({ invoice: t('invoices.invoice'), quotation: t('invoices.quotation'), receipt: t('invoices.receipt') }[type] || type);
  const statusLabel = (s: string) => ({ draft: t('invoices.draft'), sent: t('invoices.sent'), paid: t('invoices.paid'), cancelled: t('invoices.cancelled') }[s] || s);
  const statusVariant = (s: string) => { switch (s) { case 'paid': return 'default'; case 'sent': return 'secondary'; case 'cancelled': return 'destructive'; default: return 'outline'; } };

  const handleExportPDF = async (inv: Invoice) => {
    const contact = contacts.find((c: any) => c.id === inv.contact_id);
    const project = projects.find((p: any) => p.id === inv.project_id);
    const itemsData = await invoicesService.fetchInvoiceItems(inv.id);
    const invoiceItems = itemsData.map((item: any) => {
      const rate = taxRates.find((r: any) => r.id === item.tax_rate_id);
      return { ...item, tax_rate_name: rate ? `${rate.name} (${rate.rate}%)` : undefined };
    });
    exportInvoiceToPDF({
      ...inv, contact: contact || null,
      project: project ? { project_code: project.project_code, project_name: project.project_name } : null,
      items: invoiceItems, language: t('nav.dashboard') === '仪表盘' ? 'zh' : 'en',
    });
    toast({ title: t('common.exportSuccess') });
  };

  const handleConvertToInvoice = async (inv: Invoice) => {
    if (inv.invoice_type !== 'quotation') return;
    try {
      await invoicesService.convertQuotationToInvoice(inv, user?.id, tenantId);
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
      toast({ title: t('invoices.convertSuccess') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); }
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const totalTax = items.reduce((s, i) => s + i.tax_amount, 0);

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-end gap-4">
          <div className="flex gap-2">
            <Button onClick={() => openNew('invoice')}><Plus className="w-4 h-4 mr-1" />{t('invoices.newInvoice')}</Button>
            <Button variant="outline" onClick={() => openNew('quotation')}>{t('invoices.newQuotation')}</Button>
            <Button variant="outline" onClick={() => openNew('receipt')}>{t('invoices.newReceipt')}</Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('invoices.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('invoices.allTypes')}</SelectItem>
              <SelectItem value="invoice">{t('invoices.invoice')}</SelectItem>
              <SelectItem value="quotation">{t('invoices.quotation')}</SelectItem>
              <SelectItem value="receipt">{t('invoices.receipt')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('invoices.allStatuses')}</SelectItem>
              <SelectItem value="draft">{t('invoices.draft')}</SelectItem>
              <SelectItem value="sent">{t('invoices.sent')}</SelectItem>
              <SelectItem value="paid">{t('invoices.paid')}</SelectItem>
              <SelectItem value="cancelled">{t('invoices.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoices.invoiceNumber')}</TableHead>
                  <TableHead>{t('invoices.contact')}</TableHead>
                  <TableHead>{t('contacts.contactType')}</TableHead>
                  <TableHead>{t('invoices.issueDate')}</TableHead>
                  <TableHead>{t('invoices.totalAmount')}</TableHead>
                  <TableHead>{t('invoices.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {isLoading ? t('common.loading') : t('invoices.noInvoices')}
                  </TableCell></TableRow>
                ) : filtered.map((inv: any) => {
                  const contact = contacts.find((c: any) => c.id === inv.contact_id);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{contact?.name || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabel(inv.invoice_type)}</Badge></TableCell>
                      <TableCell>{format(new Date(inv.issue_date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="font-mono">{inv.currency} {formatMoney(inv.total_amount, inv.currency)}</TableCell>
                      <TableCell><Badge variant={statusVariant(inv.status) as any}>{statusLabel(inv.status)}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title={t('invoices.exportPDF')} onClick={() => handleExportPDF(inv)}><Download className="w-4 h-4" /></Button>
                          {inv.invoice_type === 'quotation' && (
                            <Button variant="ghost" size="icon" title={t('invoices.convertToInvoice')} onClick={() => handleConvertToInvoice(inv)}><Copy className="w-4 h-4 text-primary" /></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditing(inv);
                            setForm({
                              invoice_type: inv.invoice_type, invoice_number: inv.invoice_number,
                              contact_id: inv.contact_id || '', status: inv.status,
                              issue_date: inv.issue_date, due_date: inv.due_date || '',
                              currency: inv.currency, exchange_rate: inv.exchange_rate,
                              notes: inv.notes || '', terms: inv.terms || '', project_id: inv.project_id || '',
                            });
                            invoicesService.fetchInvoiceItems(inv.id).then(data => {
                              if (data.length > 0) setItems(data as InvoiceItem[]);
                              else setItems([{ description: '', quantity: 1, unit_price: 0, tax_rate_id: null, tax_amount: 0, amount: 0, sort_order: 0 }]);
                            });
                            setDialogOpen(true);
                          }}><Edit className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(inv.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t('invoices.editInvoice') : typeLabel(form.invoice_type)}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><Label>{t('invoices.invoiceNumber')} *</Label><Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
              <div>
                <Label>{t('invoices.contact')}</Label>
                <Select value={form.contact_id || '_none_'} onValueChange={v => setForm(f => ({ ...f, contact_id: v === '_none_' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder={t('invoices.contact')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— {t('common.none')} —</SelectItem>
                    {contacts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}{c.company_name ? ` (${c.company_name})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('invoices.status')}</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('invoices.draft')}</SelectItem>
                    <SelectItem value="sent">{t('invoices.sent')}</SelectItem>
                    <SelectItem value="paid">{t('invoices.paid')}</SelectItem>
                    <SelectItem value="cancelled">{t('invoices.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('invoices.issueDate')}</Label><Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
              <div><Label>{t('invoices.dueDate')}</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div>
                <Label>{t('transactions.currency')}</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYR">MYR</SelectItem><SelectItem value="CNY">CNY</SelectItem><SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('invoices.relatedProject')}</Label>
              <Select value={form.project_id || '_none_'} onValueChange={v => setForm(f => ({ ...f, project_id: v === '_none_' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder={t('common.selectProject')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— {t('common.none')} —</SelectItem>
                  {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>[{p.project_code}] {p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">{t('invoices.items')}</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />{t('invoices.addItem')}</Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">{idx === 0 && <Label className="text-xs">{t('invoices.description')}</Label>}<Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder={t('invoices.description')} /></div>
                    <div className="col-span-1">{idx === 0 && <Label className="text-xs">{t('invoices.quantity')}</Label>}<Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-2">{idx === 0 && <Label className="text-xs">{t('invoices.unitPrice')}</Label>}<Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-2">{idx === 0 && <Label className="text-xs">{t('tax.rate')}</Label>}
                      <Select value={item.tax_rate_id || 'none'} onValueChange={v => updateItem(idx, 'tax_rate_id', v === 'none' ? null : v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">-</SelectItem>{taxRates.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.rate}%)</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">{idx === 0 && <Label className="text-xs">{t('invoices.amount')}</Label>}<Input readOnly value={item.amount.toFixed(2)} className="bg-muted" /></div>
                    <div className="col-span-2 flex gap-1">
                      {item.tax_amount > 0 && <span className="text-xs text-primary self-center">+{item.tax_amount.toFixed(2)}</span>}
                      {items.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-muted rounded-lg space-y-1 text-sm">
                <div className="flex justify-between"><span>{t('invoices.subtotal')}</span><span className="font-mono">{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-primary"><span>{t('invoices.taxAmount')}</span><span className="font-mono">{totalTax.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>{t('invoices.totalAmount')}</span><span className="font-mono">{(subtotal + totalTax).toFixed(2)}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('invoices.notes')}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              <div><Label>{t('invoices.terms')}</Label><Textarea value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} rows={2} /></div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.invoice_number.trim()}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
