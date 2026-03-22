import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Package, Plus, Pencil, Trash2, Search, Ship, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQMaterials, type QMaterial } from '@/hooks/useQMaterials';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useGlobalExchangeRates } from '@/hooks/useGlobalExchangeRates';

export default function CostMaterialsPage() {
  const { materials, loading } = useQMaterials('cost');
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const { settings } = useCompanySettings();
  const { rates } = useGlobalExchangeRates();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>({});

  const shippingRate = settings.taxSettings?.shippingRatePerCbm || 0;
  const cnyToMyr = rates.cnyToMyr || 0.65;

  // Load suppliers for dropdown
  const { data: suppliers = [] } = useQuery({
    queryKey: ['q_active_suppliers_cost', tenantId],
    queryFn: () => costService.fetchActiveSuppliers(),
    enabled: !!user && !!tenantId,
  });

  const filtered = materials.filter(m =>
    m.nameZh.includes(search) || m.materialCode.includes(search) || (m.spec || '').includes(search)
  );

  const save = useMutation({
    mutationFn: async (m: any) => costService.saveMaterial(m, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_materials_cost', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_materials_purchasing', tenantId] });
      toast({ title: t('cost.materialSaved') });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: t('cost.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => costService.deactivateMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_materials_cost', tenantId] });
      toast({ title: t('cost.materialDeleted') });
      setDeleteId(null);
    },
  });

  const openEdit = (m?: QMaterial) => {
    setEditing(m || { nameZh: '', materialCode: '', spec: '', unit: 'pcs', defaultPrice: 0, defaultWastePct: 5, priceCny: 0, volumeCbm: 0, defaultSupplierId: null, notes: '' });
    setDialogOpen(true);
  };

  const calcChinaPriceRM = (m: QMaterial) => m.priceCny * cnyToMyr;
  const calcShipping = (m: QMaterial) => m.volumeCbm * shippingRate;
  const calcTotalWithShipping = (m: QMaterial) => calcChinaPriceRM(m) + calcShipping(m);

  const renderMobileCards = () => (
    <div className="space-y-2">{filtered.map((m, idx) => (
      <Card key={m.id}>
        <CardContent className="p-3 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{idx + 1}. {m.nameZh}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {m.materialCode && <Badge variant="outline" className="text-[10px]">{m.materialCode}</Badge>}
              <Badge variant="secondary" className="text-[10px]">{m.unit}</Badge>
              {m.spec && <span className="text-[10px] text-muted-foreground">{m.spec}</span>}
            </div>
            <div className="text-xs mt-1 space-y-0.5">
              <p>RM {m.defaultPrice.toFixed(2)} | CNY {m.priceCny.toFixed(2)}</p>
              <p>{t('cost.wastePct')}: {m.defaultWastePct}% | CBM: {m.volumeCbm}</p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </CardContent>
      </Card>
    ))}</div>
  );

  const renderTable = () => (
    <div className="border rounded-md overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-center">{t('cost.rowNo')}</TableHead>
            <TableHead>{t('cost.materialCode')}</TableHead>
            <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">{t('cost.materialNameCol')}</TableHead>
            <TableHead>{t('cost.specCol')}</TableHead>
            <TableHead>{t('cost.unitCol')}</TableHead>
            <TableHead className="text-right">{t('cost.wastePct')}</TableHead>
            <TableHead className="text-right">{t('cost.priceRM')}</TableHead>
            <TableHead className="text-right">{t('cost.priceCNY')}</TableHead>
            <TableHead className="text-right">{t('cost.priceCnyToRm')}</TableHead>
            <TableHead className="text-right">{t('cost.volumeCbm')}</TableHead>
            <TableHead className="text-right">{t('cost.intlShipping')}</TableHead>
            <TableHead className="text-right">{t('cost.priceWithShipping')}</TableHead>
            <TableHead>{t('cost.defaultSupplier')}</TableHead>
            <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((m, idx) => (
            <TableRow key={m.id}>
              <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{m.materialCode || '--'}</Badge></TableCell>
              <TableCell className="sticky left-0 bg-card z-10 font-medium">{m.nameZh}</TableCell>
              <TableCell className="text-muted-foreground">{m.spec || '--'}</TableCell>
              <TableCell>{m.unit}</TableCell>
              <TableCell className="text-right">{m.defaultWastePct}%</TableCell>
              <TableCell className="text-right">{m.defaultPrice.toFixed(2)}</TableCell>
              <TableCell className="text-right">{m.priceCny.toFixed(2)}</TableCell>
              <TableCell className="text-right">{calcChinaPriceRM(m).toFixed(2)}</TableCell>
              <TableCell className="text-right">{m.volumeCbm > 0 ? m.volumeCbm.toFixed(4) : '--'}</TableCell>
              <TableCell className="text-right">{calcShipping(m) > 0 ? calcShipping(m).toFixed(2) : '--'}</TableCell>
              <TableCell className="text-right font-medium">{calcTotalWithShipping(m) > 0 ? calcTotalWithShipping(m).toFixed(2) : '--'}</TableCell>
              <TableCell className="text-muted-foreground text-xs max-w-[100px] truncate">{m.defaultSupplierName || '--'}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MobilePageShell title={t('cost.materialLib')} icon={<Package className="w-5 h-5" />} backTo="/cost"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => openEdit()}><Plus className="w-4 h-4" /> {t('common.add')}</Button>}>
      <div className="p-4 space-y-4">
        {/* Header info bar */}
        <div className="flex flex-wrap gap-4 items-center text-sm bg-muted/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Ship className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">{t('cost.shippingRateCbm')}:</span>
            <span className="font-semibold">RM {shippingRate.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">{t('cost.exchangeRateCny')}:</span>
            <span className="font-semibold">1 CNY = {cnyToMyr.toFixed(4)} MYR</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('cost.searchMaterial')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {loading ? <AppSectionLoading label={t('common.loading')} compact />
        : filtered.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('cost.noMaterials')}</p></div>
        : isMobile ? renderMobileCards() : renderTable()}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing?.id ? t('cost.editMaterial') : t('cost.addMaterial')}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cost.materialNameCol')}</Label><Input value={editing?.nameZh || ''} onChange={e => setEditing({...editing, nameZh: e.target.value})} /></div>
              <div><Label>{t('cost.materialCode')}</Label><Input value={editing?.materialCode || ''} onChange={e => setEditing({...editing, materialCode: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cost.specCol')}</Label><Input value={editing?.spec || ''} onChange={e => setEditing({...editing, spec: e.target.value})} /></div>
              <div><Label>{t('cost.unitCol')}</Label><Input value={editing?.unit || ''} onChange={e => setEditing({...editing, unit: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cost.wastePct')}</Label><Input type="number" value={editing?.defaultWastePct ?? 5} onChange={e => setEditing({...editing, defaultWastePct: Number(e.target.value)})} /></div>
              <div><Label>{t('cost.priceRM')}</Label><Input type="number" value={editing?.defaultPrice || 0} onChange={e => setEditing({...editing, defaultPrice: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cost.priceCNY')}</Label><Input type="number" value={editing?.priceCny || 0} onChange={e => setEditing({...editing, priceCny: Number(e.target.value)})} /></div>
              <div><Label>{t('cost.volumeCbm')}</Label><Input type="number" step="0.0001" value={editing?.volumeCbm || 0} onChange={e => setEditing({...editing, volumeCbm: Number(e.target.value)})} /></div>
            </div>
            <div>
              <Label>{t('cost.defaultSupplier')}</Label>
              <Select value={editing?.defaultSupplierId || 'none'} onValueChange={v => setEditing({...editing, defaultSupplierId: v === 'none' ? null : v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">--</SelectItem>
                  {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t('purchasing.notes')}</Label><Input value={editing?.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => save.mutate(editing)} disabled={!editing?.nameZh || save.isPending}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('cost.deleteMatDesc')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && del.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
