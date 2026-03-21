import { useState, useMemo } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { FileText, Plus, Search, Eye, Trash2, ChevronRight, Package, CreditCard, TruckIcon, MoreVertical } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { useQPurchaseOrders } from '@/hooks/useQPurchaseOrders';
import { useQSuppliers } from '@/hooks/useQSuppliers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasingService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { format } from 'date-fns';

export default function OrdersPage() {
  const { orders, loading } = useQPurchaseOrders();
  const { suppliers } = useQSuppliers();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newOrder, setNewOrder] = useState({ supplierId: '', notes: '', deliveryDate: '' });
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ materialId: '', quantity: 1, unitPrice: 0, notes: '' });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: 0, paymentMethod: 'bank_transfer', referenceNo: '', notes: '' });
  const { sortConfig, requestSort, sortData } = useSortableTable<any>();

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: t('po.statusDraft'), variant: 'secondary' },
    ordered: { label: t('po.statusOrdered'), variant: 'default' },
    partial_received: { label: t('po.statusPartialReceived'), variant: 'outline' },
    received: { label: t('po.statusReceived'), variant: 'default' },
    submitted_to_finance: { label: t('po.statusSubmitted'), variant: 'outline' },
    archived: { label: t('po.statusArchived'), variant: 'outline' },
  };

  const statusFlow: Record<string, string[]> = {
    draft: ['ordered'],
    ordered: ['received'],
    received: ['submitted_to_finance'],
    submitted_to_finance: ['archived'],
  };

  // Stats
  const stats = useMemo(() => ({
    draft: orders.filter(o => o.status === 'draft').length,
    ordered: orders.filter(o => o.status === 'ordered').length,
    receiving: orders.filter(o => o.status === 'partial_received' || o.status === 'ordered').length,
    totalAmount: orders.reduce((s, o) => s + o.totalAmount, 0),
    pendingPay: orders.filter(o => o.paymentStatus === 'unpaid' || o.paymentStatus === 'partial').reduce((s, o) => s + (o.totalAmount - o.paidAmount), 0),
  }), [orders]);

  const statusFiltered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);
  const filtered = statusFiltered.filter(o =>
    o.orderNo.includes(search) || (o.supplierName || '').includes(search)
  );
  const sorted = sortData(filtered, (item: any, key: string) => {
    switch (key) {
      case 'orderNo': return item.orderNo;
      case 'supplierName': return item.supplierName;
      case 'totalAmount': return item.totalAmount;
      case 'createdAt': return item.createdAt;
      case 'status': return item.status;
      default: return (item as any)[key];
    }
  });

  const detailOrder = orders.find(o => o.id === detailId);

  const { data: orderItems = [] } = useQuery({
    queryKey: ['q_purchase_order_items', detailId],
    queryFn: () => purchasingService.fetchOrderItems(detailId!),
    enabled: !!detailId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['q_purchase_payments', detailId],
    queryFn: () => purchasingService.fetchOrderPayments(detailId!),
    enabled: !!detailId,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['q_materials_po_select'],
    queryFn: () => purchasingService.fetchActiveMaterials(),
    enabled: !!user,
  });

  const createOrderMut = useMutation({
    mutationFn: async () => {
      const no = `PO-${format(new Date(), 'yyyyMMdd')}-${String(orders.length + 1).padStart(3, '0')}`;
      await purchasingService.createOrder(newOrder, no, user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders'] });
      toast({ title: t('po.orderCreated') });
      setCreateOpen(false);
      setNewOrder({ supplierId: '', notes: '', deliveryDate: '' });
    },
    onError: (e: any) => toast({ title: t('po.createFailed'), description: e.message, variant: 'destructive' }),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      await purchasingService.addOrderItem(detailId!, {
        materialId: newItem.materialId, quantity: newItem.quantity,
        unitPrice: newItem.unitPrice, notes: newItem.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_purchase_order_items', detailId] });
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders'] });
      toast({ title: t('po.materialAdded') });
      setAddItemOpen(false);
      setNewItem({ materialId: '', quantity: 1, unitPrice: 0, notes: '' });
    },
    onError: (e: any) => toast({ title: t('po.addFailed'), description: e.message, variant: 'destructive' }),
  });

  const deleteItemMut = useMutation({
    mutationFn: async (itemId: string) => {
      await purchasingService.deleteOrderItem(itemId, detailId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_purchase_order_items', detailId] });
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders'] });
      toast({ title: t('po.deleted') });
    },
  });

  const addPayment = useMutation({
    mutationFn: async () => {
      await purchasingService.addOrderPayment(detailId!, {
        amount: newPayment.amount, paymentMethod: newPayment.paymentMethod,
        referenceNo: newPayment.referenceNo, notes: newPayment.notes,
      }, user?.id);
      const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0) + newPayment.amount;
      const order = orders.find(o => o.id === detailId);
      await purchasingService.updateOrderPaymentStatus(detailId!, totalPaid, order?.totalAmount || 0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_purchase_payments', detailId] });
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders'] });
      toast({ title: t('po.paymentRecorded') });
      setPaymentOpen(false);
      setNewPayment({ amount: 0, paymentMethod: 'bank_transfer', referenceNo: '', notes: '' });
    },
    onError: (e: any) => toast({ title: t('po.paymentFailed'), description: e.message, variant: 'destructive' }),
  });

  const { submitToFinance } = useQPurchaseOrders();

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      if (status === 'submitted_to_finance') { await submitToFinance(orderId); return; }
      await purchasingService.updateOrderStatus(orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders'] });
      toast({ title: t('po.statusUpdated') });
    },
  });

  const deleteOrderMut = useMutation({
    mutationFn: async (id: string) => {
      await purchasingService.deleteOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders'] });
      toast({ title: t('po.orderDeleted') }); setDeleteId(null); setDetailId(null);
    },
  });

  const itemsTotal = orderItems.reduce((s: number, i: any) => s + i.totalPrice, 0);
  const paymentsTotal = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  // ===== DETAIL VIEW =====
  if (detailId && detailOrder) {
    const st = statusMap[detailOrder.status] || statusMap.draft;
    const nextStatuses = statusFlow[detailOrder.status] || [];
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 h-12">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailId(null)}><ChevronRight className="w-4 h-4 rotate-180" /></Button>
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{detailOrder.orderNo}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nextStatuses.map(ns => (
                  <DropdownMenuItem key={ns} onClick={() => updateStatus.mutate({ orderId: detailId!, status: ns })}>{t('po.changeTo')} {statusMap[ns]?.label}</DropdownMenuItem>
                ))}
                {detailOrder.status === 'draft' && <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(detailId!)}>{t('po.deleteOrder')}</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Card><CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <Badge variant={st.variant}>{st.label}</Badge>
              <span className="text-xs text-muted-foreground">{format(new Date(detailOrder.createdAt), 'yyyy-MM-dd')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">{t('po.supplier')}</span> {detailOrder.supplierName || t('po.noSupplier')}</div>
              <div><span className="text-muted-foreground">{t('po.deliveryDate')}</span> {detailOrder.deliveryDate || t('po.notSet')}</div>
              <div><span className="text-muted-foreground">{t('po.totalAmount')}</span> <span className="font-semibold">RM {itemsTotal.toFixed(2)}</span></div>
              <div><span className="text-muted-foreground">{t('po.paidAmount')}</span> <span className="font-semibold">RM {paymentsTotal.toFixed(2)}</span></div>
            </div>
            {detailOrder.notes && <p className="text-xs text-muted-foreground">{detailOrder.notes}</p>}
          </CardContent></Card>

          <Tabs defaultValue="items">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="items" className="text-xs">{t('po.materialItems')} ({orderItems.length})</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs">{t('po.payments')} ({payments.length})</TabsTrigger>
              <TabsTrigger value="receiving" className="text-xs">{t('po.receiving')}</TabsTrigger>
            </TabsList>
            <TabsContent value="items" className="space-y-2 mt-3">
              {detailOrder.status === 'draft' && <Button size="sm" className="w-full gap-1" onClick={() => setAddItemOpen(true)}><Plus className="w-4 h-4" /> {t('po.addMaterial')}</Button>}
              {orderItems.length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">{t('po.noMaterialItems')}</p> : (
                <div className="space-y-2">
                  {orderItems.map((item: any) => (
                    <Card key={item.id}><CardContent className="p-3"><div className="flex justify-between items-start"><div className="flex-1">
                      <p className="text-sm font-medium">{item.materialName}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{item.quantity} {item.unit} × RM {item.unitPrice.toFixed(2)}</span>
                        <span className="font-semibold text-foreground">= RM {item.totalPrice.toFixed(2)}</span>
                      </div>
                      {item.receivedQuantity > 0 && <p className="text-xs mt-0.5">{t('po.received')} {item.receivedQuantity} {item.unit}</p>}
                    </div>
                    {detailOrder.status === 'draft' && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItemMut.mutate(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div></CardContent></Card>
                  ))}
                  <div className="text-right text-sm font-semibold pr-2">{t('po.totalLabel')}: RM {itemsTotal.toFixed(2)}</div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="payments" className="space-y-2 mt-3">
              <Button size="sm" className="w-full gap-1" onClick={() => { setNewPayment({ amount: Math.max(0, itemsTotal - paymentsTotal), paymentMethod: 'bank_transfer', referenceNo: '', notes: '' }); setPaymentOpen(true); }}>
                <CreditCard className="w-4 h-4" /> {t('po.recordPayment')}
              </Button>
              {payments.length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">{t('po.noPayments')}</p> : (
                <div className="space-y-2">
                  {payments.map((p: any) => (
                    <Card key={p.id}><CardContent className="p-3"><div className="flex justify-between items-center">
                      <div><p className="text-sm font-semibold">RM {Number(p.amount).toFixed(2)}</p><p className="text-xs text-muted-foreground">{p.payment_method || ''} {p.reference_no ? `· ${p.reference_no}` : ''}</p></div>
                      <span className="text-xs text-muted-foreground">{format(new Date(p.payment_date), 'yyyy-MM-dd')}</span>
                    </div></CardContent></Card>
                  ))}
                  <div className="flex justify-between text-sm pr-2"><span className="text-muted-foreground">{t('po.paidTotalLabel')}:</span><span className="font-semibold">RM {paymentsTotal.toFixed(2)} / RM {itemsTotal.toFixed(2)}</span></div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="receiving" className="mt-3">
              <div className="space-y-2">
                {orderItems.length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">{t('po.addFirst')}</p> : orderItems.map((item: any) => (
                  <Card key={item.id}><CardContent className="p-3"><div className="flex justify-between items-center">
                    <div><p className="text-sm font-medium">{item.materialName}</p><p className="text-xs text-muted-foreground">{t('po.ordered')} {item.quantity} · {t('po.received')} {item.receivedQuantity} · {t('po.remaining')} {item.quantity - item.receivedQuantity}</p></div>
                    {item.receivedQuantity >= item.quantity ? <Badge variant="default" className="text-[10px]">{t('po.allReceived')}</Badge> : <Badge variant="secondary" className="text-[10px]">{item.receivedQuantity > 0 ? t('po.partialReceived') : t('po.pendingReceive')}</Badge>}
                  </div></CardContent></Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs for detail view */}
        <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
          <DialogContent><DialogHeader><DialogTitle>{t('po.addPurchaseMaterial')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t('po.selectMaterial')} *</Label>
                <Select value={newItem.materialId} onValueChange={v => { const mat = materials.find((m: any) => m.id === v); setNewItem({ ...newItem, materialId: v, unitPrice: Number(mat?.default_price) || 0 }); }}>
                  <SelectTrigger><SelectValue placeholder={t('po.selectMaterial')} /></SelectTrigger>
                  <SelectContent>{materials.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t('po.quantity')}</Label><Input type="number" min={1} value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })} /></div>
                <div><Label>{t('po.unitPrice')}</Label><Input type="number" min={0} step={0.01} value={newItem.unitPrice} onChange={e => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })} /></div>
              </div>
              <p className="text-sm text-right">{t('po.subtotal')}: <span className="font-semibold">RM {(newItem.quantity * newItem.unitPrice).toFixed(2)}</span></p>
              <div><Label>{t('po.notes')}</Label><Input value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setAddItemOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => addItem.mutate()} disabled={!newItem.materialId || newItem.quantity <= 0 || addItem.isPending}>{t('common.add')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogContent><DialogHeader><DialogTitle>{t('po.recordPayment')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('po.pendingAmount')}: RM {Math.max(0, itemsTotal - paymentsTotal).toFixed(2)}</p>
              <div><Label>{t('po.amountRM')}</Label><Input type="number" min={0} step={0.01} value={newPayment.amount} onChange={e => setNewPayment({ ...newPayment, amount: Number(e.target.value) })} /></div>
              <div><Label>{t('po.paymentMethod')}</Label>
                <Select value={newPayment.paymentMethod} onValueChange={v => setNewPayment({ ...newPayment, paymentMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="bank_transfer">{t('po.bankTransfer')}</SelectItem><SelectItem value="cash">{t('po.cash')}</SelectItem><SelectItem value="cheque">{t('po.cheque')}</SelectItem><SelectItem value="credit">{t('po.credit')}</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>{t('po.referenceNo')}</Label><Input value={newPayment.referenceNo} onChange={e => setNewPayment({ ...newPayment, referenceNo: e.target.value })} /></div>
              <div><Label>{t('po.notes')}</Label><Input value={newPayment.notes} onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setPaymentOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => addPayment.mutate()} disabled={newPayment.amount <= 0 || addPayment.isPending}>{t('po.confirmPayment')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('po.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('po.deleteOrderDesc')}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteOrderMut.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ===== LIST VIEW =====
  const renderListTable = () => (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">#</TableHead>
            <SortableTableHead sortKey="orderNo" sortConfig={sortConfig} onSort={requestSort}>{t('po.title')}</SortableTableHead>
            <SortableTableHead sortKey="supplierName" sortConfig={sortConfig} onSort={requestSort}>{t('po.supplier')}</SortableTableHead>
            <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort}>{t('common.status')}</SortableTableHead>
            <TableHead>{t('purchasing.paymentStatus')}</TableHead>
            <SortableTableHead sortKey="totalAmount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('po.totalAmount')}</SortableTableHead>
            <TableHead className="text-right">{t('purchasing.paidAmount')}</TableHead>
            <SortableTableHead sortKey="createdAt" sortConfig={sortConfig} onSort={requestSort}>{t('common.date')}</SortableTableHead>
            <TableHead>{t('po.deliveryDate')}</TableHead>
            <TableHead className="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((o: any, i: number) => {
            const st = statusMap[o.status] || statusMap.draft;
            return (
              <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(o.id)}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{o.orderNo}</TableCell>
                <TableCell>{o.supplierName || t('po.noSupplier')}</TableCell>
                <TableCell><Badge variant={st.variant} className="text-[10px]">{st.label}</Badge></TableCell>
                <TableCell>
                  {o.paymentStatus === 'paid' && <Badge variant="default" className="text-[10px]">{t('po.paid')}</Badge>}
                  {o.paymentStatus === 'partial' && <Badge variant="outline" className="text-[10px]">{t('po.partialPaid')}</Badge>}
                  {o.paymentStatus === 'unpaid' && <Badge variant="destructive" className="text-[10px]">{t('purchasing.unpaidBadge')}</Badge>}
                </TableCell>
                <TableCell className="text-right font-semibold">RM {o.totalAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right">RM {o.paidAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{format(new Date(o.createdAt), 'yyyy-MM-dd')}</TableCell>
                <TableCell className="text-xs">{o.deliveryDate || '-'}</TableCell>
                <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const renderListCards = () => (
    <div className="space-y-2">{sorted.map((o: any) => {
      const st = statusMap[o.status] || statusMap.draft;
      return (
        <Card key={o.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setDetailId(o.id)}>
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{o.orderNo}</p>
                  <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                  {o.paymentStatus === 'unpaid' && <Badge variant="destructive" className="text-[10px]">{t('purchasing.unpaidBadge')}</Badge>}
                  {o.paymentStatus === 'partial' && <Badge variant="outline" className="text-[10px]">{t('po.partialPaid')}</Badge>}
                  {o.paymentStatus === 'paid' && <Badge variant="default" className="text-[10px]">{t('po.paid')}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{o.supplierName || t('po.noSupplier')}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{format(new Date(o.createdAt), 'yyyy-MM-dd')}</span>
                  <span className="text-sm font-semibold">RM {o.totalAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2 ml-2" />
            </div>
          </CardContent>
        </Card>
      );
    })}</div>
  );

  return (
    <MobilePageShell title={t('po.title')} icon={<FileText className="w-5 h-5" />} backTo="/purchasing"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> {t('common.new')}</Button>}>
      <div className="p-4 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <Card><CardContent className="p-2.5"><p className="text-[10px] text-muted-foreground">{t('purchasing.draftCount')}</p><p className="text-lg font-bold">{stats.draft}</p></CardContent></Card>
          <Card><CardContent className="p-2.5"><p className="text-[10px] text-muted-foreground">{t('purchasing.orderedCount')}</p><p className="text-lg font-bold">{stats.ordered}</p></CardContent></Card>
          <Card><CardContent className="p-2.5"><p className="text-[10px] text-muted-foreground">{t('purchasing.receivingCount')}</p><p className="text-lg font-bold">{stats.receiving}</p></CardContent></Card>
          <Card><CardContent className="p-2.5"><p className="text-[10px] text-muted-foreground">{t('po.totalAmount')}</p><p className="text-lg font-bold">RM {(stats.totalAmount / 1000).toFixed(1)}K</p></CardContent></Card>
          <Card><CardContent className="p-2.5"><p className="text-[10px] text-muted-foreground">{t('purchasing.pendingPayment')}</p><p className="text-lg font-bold text-destructive">RM {(stats.pendingPay / 1000).toFixed(1)}K</p></CardContent></Card>
        </div>

        {/* Status Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full flex overflow-x-auto">
            <TabsTrigger value="all" className="text-xs flex-1">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs flex-1">{t('po.statusDraft')}</TabsTrigger>
            <TabsTrigger value="ordered" className="text-xs flex-1">{t('po.statusOrdered')}</TabsTrigger>
            <TabsTrigger value="received" className="text-xs flex-1">{t('po.statusReceived')}</TabsTrigger>
            <TabsTrigger value="submitted_to_finance" className="text-xs flex-1">{t('po.statusSubmitted')}</TabsTrigger>
            <TabsTrigger value="archived" className="text-xs flex-1">{t('po.statusArchived')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('po.searchOrders')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {loading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
        : sorted.length === 0 ? <div className="text-center py-12 text-muted-foreground"><FileText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('po.noOrders')}</p><p className="text-xs mt-1">{t('po.noOrdersHint')}</p></div>
        : isMobile ? renderListCards() : renderListTable()}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>{t('po.newOrder')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('po.selectSupplier')}</Label>
              <Select value={newOrder.supplierId} onValueChange={v => setNewOrder({ ...newOrder, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder={t('po.selectSupplier')} /></SelectTrigger>
                <SelectContent>{suppliers.filter(s => s.isActive).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('po.deliveryDate')}</Label><Input type="date" value={newOrder.deliveryDate} onChange={e => setNewOrder({ ...newOrder, deliveryDate: e.target.value })} /></div>
            <div><Label>{t('po.notes')}</Label><Textarea value={newOrder.notes} onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => createOrderMut.mutate()} disabled={createOrderMut.isPending}>{t('common.confirm')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('po.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('po.deleteOrderShort')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteOrderMut.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
