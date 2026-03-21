import { useState, useMemo } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Package, Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasingService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useResponsive } from '@/hooks/useResponsive';
import { useGlobalExchangeRates } from '@/hooks/useGlobalExchangeRates';
import { useQSuppliers } from '@/hooks/useQSuppliers';

export default function PurchasingMaterialsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const { rates } = useGlobalExchangeRates();
  const { suppliers } = useQSuppliers();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>({});
  const [tabFilter, setTabFilter] = useState<'all' | 'cost' | 'purchasing'>('all');
  const { sortConfig, requestSort, sortData } = useSortableTable<any>();

  const cnyToMyr = rates.cnyToMyr || 0.65;

  const { data: shippingRate = 0 } = useQuery({
    queryKey: ['q_cost_settings_shipping'],
    queryFn: () => purchasingService.fetchShippingRate(),
    enabled: !!user,
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['q_materials_purchasing'],
    queryFn: () => purchasingService.fetchPurchasingMaterials(),
    enabled: !!user,
  });

  const tabFiltered = materials.filter((m: any) => tabFilter === 'all' ? true : m.materialType === tabFilter);
  const searched = tabFiltered.filter((m: any) => m.name.includes(search) || m.code.includes(search));
  const sorted = sortData(searched, (item: any, key: string) => {
    switch (key) {
      case 'name': return item.name;
      case 'code': return item.code;
      case 'defaultPrice': return item.defaultPrice;
      case 'priceCny': return item.priceCny;
      case 'wastePct': return item.wastePct;
      case 'volumeCbm': return item.volumeCbm;
      default: return (item as any)[key];
    }
  });

  const save = useMutation({
    mutationFn: (m: any) => purchasingService.saveMaterial(m, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_materials_purchasing'] });
      queryClient.invalidateQueries({ queryKey: ['q_materials_cost'] });
      toast({ title: t('mat.materialSaved') });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: t('mat.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => purchasingService.deactivateMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_materials_purchasing'] });
      queryClient.invalidateQueries({ queryKey: ['q_materials_cost'] });
      toast({ title: t('mat.materialDeleted') });
      setDeleteId(null);
    },
  });

  const getSupplierName = (id: string | null) => {
    if (!id) return '-';
    return suppliers.find(s => s.id === id)?.name || '-';
  };

  const renderMobileCards = () => (
    <div className="space-y-2">{sorted.map((m: any, i: number) => {
      const priceCnyRm = m.priceCny * cnyToMyr;
      const shippingCost = m.volumeCbm * shippingRate;
      return (
        <Card key={m.id}>
          <CardContent className="p-3 flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{m.name}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {m.code && <Badge variant="outline" className="text-[10px]">{m.code}</Badge>}
                <Badge variant="secondary" className="text-[10px]">{m.unit}</Badge>
                <Badge variant={m.materialType === 'cost' ? 'default' : 'secondary'} className="text-[10px]">
                  {m.materialType === 'cost' ? t('pmat.costType') : t('pmat.purchasingType')}
                </Badge>
              </div>
              <div className="text-xs mt-1 space-x-3">
                <span>RM {m.defaultPrice.toFixed(2)}</span>
                {m.priceCny > 0 && <span>¥{m.priceCny.toFixed(2)}</span>}
                {m.wastePct > 0 && <span>{m.wastePct}%</span>}
              </div>
            </div>
            <div className="flex gap-1 shrink-0 ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(m); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      );
    })}</div>
  );

  const renderTable = () => (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">#</TableHead>
            <SortableTableHead sortKey="code" sortConfig={sortConfig} onSort={requestSort}>{t('pmat.codeLabel')}</SortableTableHead>
            <SortableTableHead sortKey="name" sortConfig={sortConfig} onSort={requestSort}>{t('pmat.nameLabel')}</SortableTableHead>
            <TableHead>{t('pmat.unitLabel')}</TableHead>
            <SortableTableHead sortKey="wastePct" sortConfig={sortConfig} onSort={requestSort}>{t('purchasing.wastePct')}</SortableTableHead>
            <SortableTableHead sortKey="defaultPrice" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('pmat.priceLabel')}</SortableTableHead>
            <SortableTableHead sortKey="priceCny" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('purchasing.priceCNY')}</SortableTableHead>
            <TableHead className="text-right">{t('purchasing.priceCNYRM')}</TableHead>
            <TableHead className="text-right">{t('purchasing.volumeCBM')}</TableHead>
            <TableHead className="text-right">{t('purchasing.shippingCost')}</TableHead>
            <TableHead className="text-right">{t('purchasing.totalUnitPrice')}</TableHead>
            <TableHead>{t('purchasing.defaultSupplier')}</TableHead>
            <TableHead>{t('purchasing.source')}</TableHead>
            <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((m: any, i: number) => {
            const priceCnyRm = m.priceCny * cnyToMyr;
            const shippingCost = m.volumeCbm * shippingRate;
            const totalPrice = priceCnyRm + shippingCost;
            return (
              <TableRow key={m.id}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell><span className="font-mono text-xs">{m.code || '-'}</span></TableCell>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.unit}</TableCell>
                <TableCell>{m.wastePct > 0 ? `${m.wastePct}%` : '-'}</TableCell>
                <TableCell className="text-right font-medium">RM {m.defaultPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right">{m.priceCny > 0 ? `¥${m.priceCny.toFixed(2)}` : '-'}</TableCell>
                <TableCell className="text-right">{m.priceCny > 0 ? `RM ${priceCnyRm.toFixed(2)}` : '-'}</TableCell>
                <TableCell className="text-right">{m.volumeCbm > 0 ? m.volumeCbm.toFixed(4) : '-'}</TableCell>
                <TableCell className="text-right">{m.volumeCbm > 0 ? `RM ${shippingCost.toFixed(2)}` : '-'}</TableCell>
                <TableCell className="text-right font-medium">{m.priceCny > 0 ? `RM ${totalPrice.toFixed(2)}` : '-'}</TableCell>
                <TableCell className="text-xs">{getSupplierName(m.defaultSupplierId)}</TableCell>
                <TableCell>
                  <Badge variant={m.materialType === 'cost' ? 'default' : 'secondary'} className="text-[10px]">
                    {m.materialType === 'cost' ? t('purchasing.costSync') : t('pmat.purchasingType')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(m); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MobilePageShell title={t('pmat.title')} icon={<Package className="w-5 h-5" />} backTo="/purchasing"
      headerActions={
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => { queryClient.invalidateQueries({ queryKey: ['q_materials_purchasing'] }); toast({ title: t('purchasing.autoSync') }); }}>
            <RefreshCw className="w-3.5 h-3.5" /> {t('purchasing.autoSync')}
          </Button>
          <Button size="sm" className="h-8 gap-1" onClick={() => { setEditing({ name: '', code: '', specification: '', unit: '个', defaultPrice: 0, notes: '', materialType: 'cost', wastePct: 0, priceCny: 0, volumeCbm: 0, defaultSupplierId: '' }); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" /> {t('common.add')}
          </Button>
        </div>
      }>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span>{t('purchasing.exchangeRate')}: CNY→MYR = {cnyToMyr.toFixed(4)}</span>
          <span>|</span>
          <span>{t('purchasing.shippingCost')}: RM {shippingRate}/CBM</span>
        </div>

        <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">{t('pmat.tabAll')}</TabsTrigger>
            <TabsTrigger value="cost">{t('pmat.tabCost')}</TabsTrigger>
            <TabsTrigger value="purchasing">{t('pmat.tabPurchasing')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('pmat.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
        : searched.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('pmat.noMaterials')}</p></div>
        : isMobile ? renderMobileCards() : renderTable()}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?.id ? t('pmat.editMaterial') : t('pmat.addMaterial')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('pmat.materialTypeLabel')}</Label>
              <RadioGroup value={editing?.materialType || 'cost'} onValueChange={v => setEditing({...editing, materialType: v})} className="flex gap-4 mt-1">
                <div className="flex items-center space-x-2"><RadioGroupItem value="cost" id="type-cost" /><Label htmlFor="type-cost" className="font-normal">{t('pmat.costType')}</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="purchasing" id="type-purchasing" /><Label htmlFor="type-purchasing" className="font-normal">{t('pmat.purchasingType')}</Label></div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('pmat.nameLabel')}</Label><Input value={editing?.name || ''} onChange={e => setEditing({...editing, name: e.target.value})} /></div>
              <div><Label>{t('pmat.codeLabel')}</Label><Input value={editing?.code || ''} onChange={e => setEditing({...editing, code: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('pmat.specLabel')}</Label><Input value={editing?.specification || ''} onChange={e => setEditing({...editing, specification: e.target.value})} /></div>
              <div><Label>{t('pmat.unitLabel')}</Label><Input value={editing?.unit || ''} onChange={e => setEditing({...editing, unit: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('pmat.priceLabel')}</Label><Input type="number" value={editing?.defaultPrice || 0} onChange={e => setEditing({...editing, defaultPrice: Number(e.target.value)})} /></div>
              <div><Label>{t('purchasing.priceCNY')}</Label><Input type="number" value={editing?.priceCny || 0} onChange={e => setEditing({...editing, priceCny: Number(e.target.value)})} /></div>
              <div><Label>{t('purchasing.wastePct')}</Label><Input type="number" value={editing?.wastePct || 0} onChange={e => setEditing({...editing, wastePct: Number(e.target.value)})} /></div>
            </div>
            <div><Label>{t('purchasing.volumeCBM')}</Label><Input type="number" step="0.0001" value={editing?.volumeCbm || 0} onChange={e => setEditing({...editing, volumeCbm: Number(e.target.value)})} /></div>
            <div><Label>{t('mat.remark')}</Label><Input value={editing?.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => save.mutate(editing)} disabled={!editing?.name || save.isPending}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('pmat.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('pmat.deleteDesc')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && del.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}