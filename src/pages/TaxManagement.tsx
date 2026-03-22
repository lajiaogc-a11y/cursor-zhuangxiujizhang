import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { settingsService } from '@/services';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Calculator, Percent } from 'lucide-react';

type TaxRate = settingsService.TaxRate;

const emptyForm = { name: '', rate: 0, tax_type: 'SST', is_inclusive: false, is_active: true, description: '' };

export default function TaxManagement() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [calcAmount, setCalcAmount] = useState('');
  const [calcRateId, setCalcRateId] = useState('');

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['tax_rates', tenantId],
    queryFn: () => settingsService.fetchTaxRates(tenantId!),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = {
        name: data.name,
        rate: data.rate,
        tax_type: data.tax_type,
        is_inclusive: data.is_inclusive,
        is_active: data.is_active,
        description: data.description || null,
      };
      await settingsService.saveTaxRate(tenantId!, payload, data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_rates'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: t('common.success') });
    },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteTaxRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_rates'] });
      toast({ title: t('common.deleteSuccess') });
    },
  });

  const openEdit = (r: TaxRate) => {
    setEditing(r);
    setForm({ name: r.name, rate: r.rate, tax_type: r.tax_type, is_inclusive: r.is_inclusive || false, is_active: r.is_active !== false, description: r.description || '' });
    setDialogOpen(true);
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const taxTypeLabel = (type: string) => {
    const m: Record<string, string> = { SST: t('tax.sst'), GST: t('tax.gst'), VAT: t('tax.vat'), custom: t('tax.custom') };
    return m[type] || type;
  };

  // Calculator
  const selectedRate = rates.find(r => r.id === calcRateId);
  const calcResult = useMemo(() => {
    const amount = parseFloat(calcAmount) || 0;
    if (!selectedRate || amount === 0) return { beforeTax: 0, taxAmount: 0, afterTax: 0 };
    const rate = selectedRate.rate / 100;
    if (selectedRate.is_inclusive) {
      const beforeTax = amount / (1 + rate);
      return { beforeTax, taxAmount: amount - beforeTax, afterTax: amount };
    } else {
      const taxAmount = amount * rate;
      return { beforeTax: amount, taxAmount, afterTax: amount + taxAmount };
    }
  }, [calcAmount, selectedRate]);

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-end">
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />{t('tax.newRate')}</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tax Rates Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>{t('tax.rates')}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('tax.name')}</TableHead>
                      <TableHead>{t('tax.type')}</TableHead>
                      <TableHead>{t('tax.rate')}</TableHead>
                      <TableHead>{t('tax.isInclusive')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="p-0"><AppSectionLoading label={t('common.loading')} compact /></TableCell></TableRow>
                    ) : rates.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">{t('tax.noRates')}</TableCell></TableRow>
                    ) : rates.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell><Badge variant="outline">{taxTypeLabel(r.tax_type)}</Badge></TableCell>
                        <TableCell><span className="font-mono">{r.rate}%</span></TableCell>
                        <TableCell>{r.is_inclusive ? t('tax.inclusive') : t('tax.exclusive')}</TableCell>
                        <TableCell><Badge variant={r.is_active !== false ? 'default' : 'secondary'}>
                          {r.is_active !== false ? t('contacts.active') : t('contacts.inactive')}
                        </Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(r.id)}>{t('common.delete')}</AlertDialogAction>
                                </AlertDialogFooter>
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

          {/* Tax Calculator */}
          <div>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" />{t('tax.calculator')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('tax.selectRate')}</Label>
                  <Select value={calcRateId} onValueChange={setCalcRateId}>
                    <SelectTrigger><SelectValue placeholder={t('tax.selectRate')} /></SelectTrigger>
                    <SelectContent>
                      {rates.filter(r => r.is_active !== false).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name} ({r.rate}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{selectedRate?.is_inclusive ? t('tax.afterTax') : t('tax.beforeTax')}</Label>
                  <Input type="number" value={calcAmount} onChange={e => setCalcAmount(e.target.value)} placeholder="0.00" />
                </div>
                {selectedRate && calcAmount && (
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>{t('tax.beforeTax')}</span>
                      <span className="font-mono">{calcResult.beforeTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-primary">
                      <span>{t('tax.taxAmount')} ({selectedRate.rate}%)</span>
                      <span className="font-mono">{calcResult.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>{t('tax.afterTax')}</span>
                      <span className="font-mono">{calcResult.afterTax.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('tax.editRate') : t('tax.newRate')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('tax.name')} *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="SST 10%" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('tax.type')}</Label>
                <Select value={form.tax_type} onValueChange={v => setForm(f => ({ ...f, tax_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SST">{t('tax.sst')}</SelectItem>
                    <SelectItem value="GST">{t('tax.gst')}</SelectItem>
                    <SelectItem value="VAT">{t('tax.vat')}</SelectItem>
                    <SelectItem value="custom">{t('tax.custom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('tax.rate')}</Label>
                <Input type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_inclusive} onCheckedChange={v => setForm(f => ({ ...f, is_inclusive: v }))} />
              <Label>{t('tax.isInclusive')}</Label>
            </div>
            <div>
              <Label>{t('tax.description')}</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>{t('contacts.active')}</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMutation.mutate({ ...form, id: editing?.id })} disabled={!form.name.trim()}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
