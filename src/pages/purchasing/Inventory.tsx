import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Warehouse, Search, Plus, Minus, Clock, AlertTriangle, Package, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasingService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';
import { format } from 'date-fns';

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjusting, setAdjusting] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMaterialId, setHistoryMaterialId] = useState<string | null>(null);
  const { sortConfig, requestSort, sortData } = useSortableTable<any>();

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['q_inventory'],
    queryFn: () => purchasingService.fetchInventory(),
    enabled: !!user,
  });

  const { data: historyTxs = [] } = useQuery({
    queryKey: ['q_inventory_transactions', historyMaterialId],
    queryFn: () => purchasingService.fetchInventoryTransactions(historyMaterialId!),
    enabled: !!historyMaterialId && historyOpen,
  });

  const adjustMutation = useMutation({
    mutationFn: () => purchasingService.adjustInventory(adjusting, adjustType, adjustQty, adjustNotes, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_inventory'] });
      queryClient.invalidateQueries({ queryKey: ['q_inventory_transactions'] });
      toast({ title: t('inv.adjusted') });
      setAdjustOpen(false);
    },
    onError: (e: any) => toast({ title: t('inv.adjustFailed'), description: e.message, variant: 'destructive' }),
  });

  const filtered = inventory.filter((i: any) => i.materialName.includes(search) || i.materialCode.includes(search));
  const sorted = sortData(filtered, (item: any, key: string) => {
    switch (key) {
      case 'materialCode': return item.materialCode;
      case 'materialName': return item.materialName;
      case 'currentQuantity': return item.currentQuantity;
      case 'minQuantity': return item.minQuantity;
      default: return (item as any)[key];
    }
  });

  const materialTypes = inventory.length;
  const lowStockCount = inventory.filter((i: any) => i.currentQuantity <= i.minQuantity && i.minQuantity > 0).length;
  const totalValue = inventory.reduce((s: number, i: any) => s + i.currentQuantity * i.unitPrice, 0);

  const openAdjust = (item: any, type: 'in' | 'out') => {
    setAdjusting(item); setAdjustQty(0); setAdjustType(type); setAdjustNotes(''); setAdjustOpen(true);
  };

  const renderMobileCards = () => (
    <div className="space-y-2">{sorted.map((item: any, i: number) => {
      const isLow = item.currentQuantity <= item.minQuantity && item.minQuantity > 0;
      return (
        <Card key={item.id}>
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{i + 1}.</span>
                  {item.materialCode && <Badge variant="outline" className="text-[10px] font-mono">{item.materialCode}</Badge>}
                  <p className="font-medium text-sm">{item.materialName}</p>
                  {isLow && <Badge variant="destructive" className="text-[10px]">{t('inv.lowStock')}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('inv.stock')}: {item.currentQuantity} {item.unit}
                  {item.minQuantity > 0 && ` · ${t('inv.minStock')}: ${item.minQuantity}`}
                </p>
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openAdjust(item, 'in')}><Plus className="w-3 h-3" /></Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openAdjust(item, 'out')}><Minus className="w-3 h-3" /></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setHistoryMaterialId(item.materialId); setHistoryOpen(true); }}><Clock className="w-3 h-3" /></Button>
              </div>
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
            <SortableTableHead sortKey="materialCode" sortConfig={sortConfig} onSort={requestSort}>{t('purchasing.materialCode')}</SortableTableHead>
            <SortableTableHead sortKey="materialName" sortConfig={sortConfig} onSort={requestSort}>{t('cost.materialNameCol')}</SortableTableHead>
            <TableHead>{t('cost.unitCol')}</TableHead>
            <SortableTableHead sortKey="currentQuantity" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('inv.stock')}</SortableTableHead>
            <SortableTableHead sortKey="minQuantity" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('inv.minStock')}</SortableTableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead className="w-[130px]">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item: any, i: number) => {
            const isLow = item.currentQuantity <= item.minQuantity && item.minQuantity > 0;
            return (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell><span className="font-mono text-xs">{item.materialCode || '-'}</span></TableCell>
                <TableCell className="font-medium">{item.materialName}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right font-medium">{item.currentQuantity}</TableCell>
                <TableCell className="text-right">{item.minQuantity || '-'}</TableCell>
                <TableCell>
                  {isLow ? (
                    <Badge variant="destructive" className="text-[10px]">{t('inv.lowStock')}</Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px]">{t('purchasing.normal')}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-0.5 px-2" onClick={() => openAdjust(item, 'in')}>
                      <Plus className="w-3 h-3" /> {t('purchasing.stockIn')}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-0.5 px-2" onClick={() => openAdjust(item, 'out')}>
                      <Minus className="w-3 h-3" /> {t('purchasing.stockOut')}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setHistoryMaterialId(item.materialId); setHistoryOpen(true); }}>
                      <Clock className="w-3.5 h-3.5" />
                    </Button>
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
    <MobilePageShell title={t('inv.title')} icon={<Warehouse className="w-5 h-5" />} backTo="/purchasing">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card-v2"><div className="flex items-center gap-3"><Package className="w-8 h-8 text-primary/20" /><div><p className="text-lg font-bold">{materialTypes}</p><p className="text-[10px] text-muted-foreground">{t('purchasing.materialTypes')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-destructive/20" /><div><p className="text-lg font-bold text-destructive">{lowStockCount}</p><p className="text-[10px] text-muted-foreground">{t('purchasing.lowStockWarning')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><DollarSign className="w-8 h-8 text-primary/20" /><div><p className="text-lg font-bold">RM {(totalValue / 1000).toFixed(1)}K</p><p className="text-[10px] text-muted-foreground">{t('purchasing.totalStockValue')}</p></div></div></div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('inv.searchMaterial')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
        : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('inv.noInventory')}</p>
            <p className="text-xs mt-1">{t('inv.noInventoryHint')}</p>
          </div>
        ) : isMobile ? renderMobileCards() : renderTable()}
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{adjustType === 'in' ? t('inv.inbound') : t('inv.outbound')} - {adjusting?.materialName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('inv.currentStock')}: {adjusting?.currentQuantity} {adjusting?.unit}</p>
            <div><Label>{t('cost.quantity')}</Label><Input type="number" min={0} value={adjustQty} onChange={e => setAdjustQty(Number(e.target.value))} /></div>
            <div><Label>{t('po.notes')}</Label><Input value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} placeholder={t('inv.adjustReason')} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => adjustMutation.mutate()} disabled={adjustQty <= 0 || adjustMutation.isPending}>{t('inv.confirmAdjust')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('purchasing.history')}</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {historyTxs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">{t('purchasing.noDataYet')}</p> : historyTxs.map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Badge variant={tx.transaction_type?.includes('in') ? 'default' : 'secondary'} className="text-[10px]">
                    {tx.transaction_type?.includes('in') ? t('inv.inbound') : t('inv.outbound')}
                  </Badge>
                  <span>{tx.notes || '-'}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{tx.quantity}</span>
                  <span className="text-muted-foreground ml-2">{tx.created_at ? format(new Date(tx.created_at), 'MM-dd HH:mm') : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </MobilePageShell>
  );
}