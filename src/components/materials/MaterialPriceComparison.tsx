import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMaterialSupplierPrices, fetchActiveSuppliers, addMaterialSupplierPrice, setPreferredSupplierPrice, deleteMaterialSupplierPrice } from '@/services/settings.service';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Star, Trash2 } from 'lucide-react';

interface Props {
  material: { id: string; name: string; unit: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialPriceComparison({ material, open, onOpenChange }: Props) {
  const { hasPermission } = useAuth();
  const { t } = useI18n();
  const canEdit = hasPermission('feature.edit');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', unit_price: 0, currency: 'MYR', min_order_qty: 1, lead_days: 0 });

  const { data: prices = [] } = useQuery({
    queryKey: ['q_material_prices', material.id],
    queryFn: () => fetchMaterialSupplierPrices(material.id),
    enabled: open,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['q_suppliers_active'],
    queryFn: () => fetchActiveSuppliers(),
    enabled: open && showAddForm,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await addMaterialSupplierPrice({
        material_id: material.id,
        supplier_id: form.supplier_id,
        unit_price: form.unit_price,
        currency: form.currency,
        min_order_qty: form.min_order_qty,
        lead_days: form.lead_days,
        last_quoted_at: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_material_prices', material.id] });
      setShowAddForm(false);
      toast({ title: t('mat.priceAdded') });
    },
    onError: (err: any) => toast({ title: t('common.addFailed'), description: err.message, variant: 'destructive' }),
  });

  const setPreferredMutation = useMutation({
    mutationFn: (priceId: string) => setPreferredSupplierPrice(material.id, priceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_material_prices', material.id] });
      toast({ title: t('mat.setPreferredSuccess') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMaterialSupplierPrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_material_prices', material.id] });
      toast({ title: t('mat.priceDeleted') });
    },
  });

  const lowestPrice = prices.length > 0 ? Math.min(...prices.map(p => p.unit_price)) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material.name} — {t('mat.supplierPriceComparison')}</DialogTitle>
        </DialogHeader>

        {prices.length === 0 && !showAddForm ? (
          <p className="text-center text-muted-foreground py-6">{t('mat.noSupplierPrices')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('mat.supplier')}</TableHead>
                <TableHead className="text-right">{t('mat.unitPrice')}</TableHead>
                <TableHead className="text-right">{t('mat.minOrder')}</TableHead>
                <TableHead className="text-center">{t('mat.leadDays')}</TableHead>
                <TableHead className="text-center">{t('mat.quoteDate')}</TableHead>
                {canEdit && <TableHead className="text-center">{t('common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((p, i) => (
                <TableRow key={p.id} className={p.unit_price === lowestPrice ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {p.is_preferred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      <span className="font-medium">{p.q_suppliers?.name || t('mat.unknown')}</span>
                    </div>
                    {p.q_suppliers?.company_name && (
                      <p className="text-xs text-muted-foreground">{p.q_suppliers.company_name}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {p.currency} {p.unit_price.toFixed(2)}/{material.unit}
                    {p.unit_price === lowestPrice && <Badge className="ml-2 text-[10px]" variant="default">{t('mat.lowest')}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{p.min_order_qty} {material.unit}</TableCell>
                  <TableCell className="text-center">{p.lead_days || '-'}</TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">{p.last_quoted_at || '-'}</TableCell>
                  {canEdit && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPreferredMutation.mutate(p.id)} title={t('mat.setPreferred')}>
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm(t('mat.confirmDeletePrice'))) deleteMutation.mutate(p.id); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {canEdit && !showAddForm && (
          <Button variant="outline" onClick={() => setShowAddForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />{t('mat.addSupplierPrice')}
          </Button>
        )}

        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-3">
            <div><Label>{t('mat.supplier')} *</Label>
              <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t('mat.selectSupplier')} /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.company_name ? ` (${s.company_name})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('mat.unitPrice')} *</Label><Input type="number" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: Number(e.target.value) }))} /></div>
              <div><Label>{t('mat.currency')}</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYR">MYR</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('mat.minOrder')}</Label><Input type="number" value={form.min_order_qty} onChange={e => setForm(f => ({ ...f, min_order_qty: Number(e.target.value) }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!form.supplier_id || addMutation.isPending}>{t('common.add')}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}