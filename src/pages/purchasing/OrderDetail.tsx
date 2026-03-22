import { useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppChromeLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Printer, FileDown, FileSpreadsheet, Package, Building2, Calendar, Truck,
  Send, Archive, Upload, Paperclip, Clock, User, Download, Trash2, Eye,
  Plus, CheckCircle2, Edit, Save,
} from 'lucide-react';
import { purchasingService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQPurchaseOrders } from '@/hooks/useQPurchaseOrders';
import { useI18n } from '@/lib/i18n';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface OrderInfo {
  id: string; orderNo: string; supplierId: string | null; supplierName: string; status: string;
  totalAmount: number; deliveryDate: string | null; notes: string | null; createdAt: string;
  paymentStatus: string; paidAmount: number;
}

interface OrderItem {
  id: string; materialId: string | null; materialCode: string; materialName: string; unit: string;
  quantity: number; unitPrice: number; totalPrice: number; receivedQty: number; notes: string | null;
}

interface Attachment {
  id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number | null;
  uploadedBy: string | null; createdAt: string;
}

interface AuditLog {
  id: string; action: string; details: string | null; performedBy: string | null; createdAt: string;
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { submitToFinance, archiveOrder, confirmOrder, logAudit } = useQPurchaseOrders();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STATUS_CONFIG: Record<string, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive' }> = {
    draft: { label: t('od.draft'), variant: 'outline' },
    ordered: { label: t('od.ordered'), variant: 'default' },
    partially_received: { label: t('od.partiallyReceived'), variant: 'secondary' },
    received: { label: t('od.received'), variant: 'default' },
    submitted_to_finance: { label: t('od.submittedToFinance'), variant: 'secondary' },
    archived: { label: t('od.archived'), variant: 'outline' },
  };

  const FILE_TYPE_LABELS: Record<string, string> = {
    invoice: t('od.invoice'), delivery_order: t('od.deliveryOrder'), receipt: t('od.receipt'), photo: t('od.photo'), other: t('od.other'),
  };

  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [confirmOrderOpen, setConfirmOrderOpen] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFileType, setUploadFileType] = useState('invoice');
  const [uploading, setUploading] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addMaterialId, setAddMaterialId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState(0);
  const [addingItem, setAddingItem] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');

  const { data: detailData, isLoading: loading, refetch: fetchAll } = useQuery({
    queryKey: ['orderDetail', tenantId, orderId],
    queryFn: () => purchasingService.fetchOrderDetail(orderId!),
    enabled: !!orderId && !!tenantId,
  });

  const { data: procMaterials = [] } = useQuery({
    queryKey: ['q_materials_detail_select', tenantId],
    queryFn: () => purchasingService.fetchActiveMaterialsWithCode(),
    enabled: addItemOpen && !!tenantId,
  });

  const order = detailData?.order as OrderInfo | undefined;
  const items = (detailData?.items || []) as OrderItem[];
  const attachments = (detailData?.attachments || []) as Attachment[];
  const auditLogs = (detailData?.auditLogs || []) as AuditLog[];

  const isDraft = order?.status === 'draft';
  const totalAmount = useMemo(() => items.reduce((s, i) => s + i.totalPrice, 0), [items]);

  const startEditItem = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditQty(item.quantity);
    setEditPrice(item.unitPrice);
  };

  const saveEditItem = async () => {
    if (!editingItemId || !orderId) return;
    try {
      setSavingItem(true);
      await purchasingService.updateOrderItem(editingItemId, orderId, editQty, editPrice);
      setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey: ['orderDetail', tenantId, orderId] });
    } catch (error: any) {
      toast({ title: t('od.saveFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setSavingItem(false);
    }
  };

  const deleteItem = async () => {
    if (!deletingItemId || !orderId) return;
    try {
      await purchasingService.deleteOrderItem(deletingItemId, orderId);
      setDeletingItemId(null);
      queryClient.invalidateQueries({ queryKey: ['orderDetail', tenantId, orderId] });
      toast({ title: t('od.itemDeleted') });
    } catch (error: any) {
      toast({ title: t('od.deleteFailed'), description: error.message, variant: 'destructive' });
    }
  };

  const handleAddItem = async () => {
    if (!addMaterialId || !orderId) return;
    try {
      setAddingItem(true);
      await purchasingService.addOrderItem(orderId, {
        materialId: addMaterialId, quantity: addQty, unitPrice: addPrice, notes: '',
      });
      setAddItemOpen(false);
      queryClient.invalidateQueries({ queryKey: ['orderDetail', tenantId, orderId] });
      toast({ title: t('od.itemAdded') });
    } catch (error: any) {
      toast({ title: t('od.addFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setAddingItem(false);
    }
  };

  const openAddItem = () => {
    setAddMaterialId('');
    setAddQty(1);
    setAddPrice(0);
    setMaterialSearch('');
    setAddItemOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!orderId) return;
    try {
      setConfirmingOrder(true);
      await confirmOrder(orderId);
      setConfirmOrderOpen(false);
      queryClient.invalidateQueries({ queryKey: ['orderDetail', tenantId, orderId] });
    } catch (error: any) {
      toast({ title: t('od.confirmFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setConfirmingOrder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !orderId) return;
    try {
      setUploading(true);
      for (const file of Array.from(files)) {
        await purchasingService.uploadAttachment(orderId, file, uploadFileType, user?.id);
        await logAudit(orderId, 'attachment_added', t('od.uploadedFileType').replace('{type}', FILE_TYPE_LABELS[uploadFileType]).replace('{name}', file.name));
      }
      toast({ title: t('od.uploadSuccess') });
      setUploadDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['orderDetail', tenantId, orderId] });
    } catch (error: any) {
      toast({ title: t('od.uploadFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (att: Attachment) => {
    try {
      await purchasingService.deleteAttachment({ id: att.id, fileUrl: att.fileUrl });
      toast({ title: t('od.attachmentDeleted') });
      queryClient.invalidateQueries({ queryKey: ['orderDetail', tenantId, orderId] });
    } catch (error: any) {
      toast({ title: t('od.deleteFailed'), description: error.message, variant: 'destructive' });
    }
  };

  const handleSubmitToFinance = async () => {
    if (!orderId) return;
    try { await submitToFinance(orderId); setSubmitConfirmOpen(false); queryClient.invalidateQueries({ queryKey: ['orderDetail', tenantId, orderId] }); }
    catch (error: any) { toast({ title: t('od.submitFailed'), description: error.message, variant: 'destructive' }); }
  };

  const handleArchive = async () => {
    if (!orderId) return;
    try { await archiveOrder(orderId); setArchiveConfirmOpen(false); queryClient.invalidateQueries({ queryKey: ['orderDetail', tenantId, orderId] }); }
    catch (error: any) { toast({ title: t('od.archiveFailed'), description: error.message, variant: 'destructive' }); }
  };

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    if (!order) return;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(`Purchase Order ${order.orderNo}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`${t('od.supplier')}: ${order.supplierName}`, 14, 30);
    doc.text(`${t('od.status')}: ${STATUS_CONFIG[order.status]?.label || order.status}`, 14, 36);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 42);
    if (order.deliveryDate) doc.text(`${t('od.deliveryDate')}: ${order.deliveryDate}`, 14, 48);
    autoTable(doc, {
      startY: 55,
      head: [['#', t('od.materialCode'), t('od.materialName'), t('od.unit'), t('od.qty'), t('od.receivedQty'), t('od.unitPrice'), t('od.total')]],
      body: items.map((item, idx) => [idx + 1, item.materialCode, item.materialName, item.unit, item.quantity, item.receivedQty, item.unitPrice.toFixed(2), item.totalPrice.toFixed(2)]),
      foot: [['', '', '', '', '', '', t('od.total') + ':', `RM ${totalAmount.toFixed(2)}`]],
    });
    doc.save(`${order.orderNo}.pdf`);
  };

  const handleExportExcel = () => {
    if (!order) return;
    const wsData = [
      [t('od.excelOrderNo'), order.orderNo], [t('od.excelSupplier'), order.supplierName],
      [t('od.excelStatus'), STATUS_CONFIG[order.status]?.label || order.status],
      [t('od.excelCreatedDate'), new Date(order.createdAt).toLocaleDateString()],
      [t('od.excelDeliveryDate'), order.deliveryDate || '--'], [],
      [t('od.excelSeqNo'), t('od.excelMaterialCode'), t('od.excelMaterialName'), t('od.excelUnit'), t('od.excelQty'), t('od.excelReceived'), t('od.excelUnitPrice'), t('od.excelTotalPrice'), t('od.excelRemark')],
      ...items.map((item, idx) => [idx + 1, item.materialCode, item.materialName, item.unit, item.quantity, item.receivedQty, item.unitPrice, item.totalPrice, item.notes || '']),
      [], ['', '', '', '', '', '', t('od.excelTotal'), totalAmount, ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('od.excelSheet'));
    XLSX.writeFile(wb, `${order.orderNo}.xlsx`);
  };

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      created: t('od.actionCreated'), updated: t('od.actionUpdated'), received: t('od.actionReceived'),
      submitted_to_finance: t('od.actionSubmitted'), status_changed: t('od.actionStatusChanged'),
      attachment_added: t('od.actionAttachment'), archived: t('od.actionArchived'),
    };
    return map[action] || action;
  };

  const filteredProcMaterials = procMaterials.filter((m: any) => {
    if (!materialSearch) return true;
    const term = materialSearch.toLowerCase();
    return m.code?.toLowerCase().includes(term) || m.name?.toLowerCase().includes(term);
  });

  if (loading) return <AppChromeLoading label={t('common.loading')} />;

  if (!order) return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <Card><CardContent className="py-12 text-center">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('od.orderNotFound')}</p>
        <Button className="mt-4" onClick={() => navigate('/purchasing/orders')}>{t('od.backToList')}</Button>
      </CardContent></Card>
    </div>
  );

  const canReceive = order.status === 'ordered' || order.status === 'partially_received';
  const canSubmitFinance = order.status === 'received';
  const canArchive = order.status === 'submitted_to_finance';

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/purchasing/orders')}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">{order.orderNo}
                <Badge variant={STATUS_CONFIG[order.status]?.variant || 'outline'}>{STATUS_CONFIG[order.status]?.label || order.status}</Badge>
              </h1>
              <p className="text-xs text-muted-foreground">{order.supplierName}</p>
            </div>
          </div>
          {isMobile ? (
            <div className="flex items-center gap-1">
              {isDraft && <Button size="icon" onClick={() => setConfirmOrderOpen(true)}><CheckCircle2 className="w-4 h-4" /></Button>}
              {canReceive && <Button variant="outline" size="icon" onClick={() => navigate(`/purchasing/orders/${orderId}/receiving`)}><Truck className="w-4 h-4" /></Button>}
              {canSubmitFinance && <Button variant="default" size="icon" onClick={() => setSubmitConfirmOpen(true)}><Send className="w-4 h-4" /></Button>}
              <Button variant="outline" size="icon" onClick={() => setUploadDialogOpen(true)}><Upload className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {canReceive && <Button variant="outline" size="sm" onClick={() => navigate(`/purchasing/orders/${orderId}/receiving`)}><Truck className="w-4 h-4 mr-1" />{t('od.receive')}</Button>}
              {canSubmitFinance && <Button size="sm" onClick={() => setSubmitConfirmOpen(true)}><Send className="w-4 h-4 mr-1" />{t('od.submitToFinance')}</Button>}
              {canArchive && <Button variant="outline" size="sm" onClick={() => setArchiveConfirmOpen(true)}><Archive className="w-4 h-4 mr-1" />{t('od.archive')}</Button>}
              <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}><Upload className="w-4 h-4 mr-1" />{t('od.uploadAttachment')}</Button>
              <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />{t('od.print')}</Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}><FileDown className="w-4 h-4 mr-1" />PDF</Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4 mr-1" />Excel</Button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> {t('od.supplier')}</p>
            <p className="font-bold">{order.supplierName}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('od.status')}</p>
            <Badge variant={STATUS_CONFIG[order.status]?.variant || 'outline'} className="mt-1">{STATUS_CONFIG[order.status]?.label || order.status}</Badge>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('od.deliveryDate')}</p>
            <p className="font-bold">{order.deliveryDate || '--'}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('od.totalAmount')}</p>
            <p className="text-2xl font-bold text-primary">RM {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('od.paymentProgress')}</p>
            <p className="font-bold">{order.paidAmount > 0 ? `RM ${order.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : t('od.unpaid')}</p>
            {order.totalAmount > 0 && (
              <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min((order.paidAmount / order.totalAmount) * 100, 100)}%` }} />
              </div>
            )}
          </CardContent></Card>
        </div>

        {order.notes && (
          <Card className="mb-4 bg-muted/50"><CardContent className="py-3"><p className="text-sm text-muted-foreground">{order.notes}</p></CardContent></Card>
        )}

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">{t('od.purchaseItems')} ({items.length})</TabsTrigger>
            <TabsTrigger value="attachments">{t('od.attachments')} ({attachments.length})</TabsTrigger>
            <TabsTrigger value="audit">{t('od.auditLog')}</TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{t('od.materialDetails')} ({items.length} {t('od.items')})</h3>
                  {isDraft && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => setConfirmOrderOpen(true)}><CheckCircle2 className="w-4 h-4 mr-1" />{t('od.confirmOrder')}</Button>
                      <Button size="sm" variant="outline" onClick={openAddItem}><Plus className="w-4 h-4 mr-1" />{t('od.addMaterial')}</Button>
                    </div>
                  )}
                </div>
              </CardContent>
              {isMobile ? (
                <div className="px-4 pb-4 space-y-3">
                  {items.map((item) => (
                    <Card key={item.id} className="bg-muted/30">
                      <CardContent className="py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{item.materialCode}</span>
                          <span className="font-bold text-primary">RM {item.totalPrice.toFixed(2)}</span>
                        </div>
                        <p className="font-medium">{item.materialName}</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div><span className="text-muted-foreground">{t('od.quantity')}: </span>{item.quantity} {item.unit}</div>
                          <div><span className="text-muted-foreground">{t('od.received2')}: </span>{item.receivedQty}</div>
                          <div><span className="text-muted-foreground">{t('od.unitPrice')}: </span>{item.unitPrice.toFixed(2)}</div>
                        </div>
                        {isDraft && (
                          <div className="flex gap-1 pt-1 border-t">
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => startEditItem(item)}><Edit className="w-3 h-3 mr-1" />{t('od.edit')}</Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingItemId(item.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  <div className="text-right font-bold text-primary text-lg pt-2 border-t">{t('od.total')}: RM {totalAmount.toFixed(2)}</div>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">{t('od.seqNo')}</TableHead>
                        <TableHead>{t('od.materialCode')}</TableHead>
                        <TableHead>{t('od.materialName')}</TableHead>
                        <TableHead>{t('od.unit')}</TableHead>
                        <TableHead className="text-right">{t('od.qty')}</TableHead>
                        <TableHead className="text-right">{t('od.receivedQty')}</TableHead>
                        <TableHead className="text-right">{t('od.unitPriceRM')}</TableHead>
                        <TableHead className="text-right">{t('od.totalPriceRM')}</TableHead>
                        <TableHead>{t('od.remark')}</TableHead>
                        {isDraft && <TableHead className="w-[80px]">{t('od.action')}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>{item.materialCode}</TableCell>
                          <TableCell>{item.materialName}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">
                            {editingItemId === item.id ? (
                              <Input type="number" value={editQty} onChange={e => setEditQty(Number(e.target.value) || 0)} className="h-8 w-20 text-right" />
                            ) : item.quantity}
                          </TableCell>
                          <TableCell className="text-right">{item.receivedQty}</TableCell>
                          <TableCell className="text-right">
                            {editingItemId === item.id ? (
                              <Input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value) || 0)} className="h-8 w-24 text-right" step="0.01" />
                            ) : item.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {editingItemId === item.id ? (editQty * editPrice).toFixed(2) : item.totalPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{item.notes || '--'}</TableCell>
                          {isDraft && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {editingItemId === item.id ? (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEditItem} disabled={savingItem}>
                                    <Save className="w-3.5 h-3.5 text-green-600" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditItem(item)}>
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingItemId(item.id)}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell></TableCell>
                        <TableCell colSpan={6} className="text-right">{t('od.total')}</TableCell>
                        <TableCell className="text-right text-primary">RM {totalAmount.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                        {isDraft && <TableCell></TableCell>}
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="attachments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Paperclip className="w-4 h-4" />{t('od.attachmentDocs')}</CardTitle>
                <Button size="sm" onClick={() => setUploadDialogOpen(true)}><Upload className="w-4 h-4 mr-1" />{t('od.upload')}</Button>
              </CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>{t('od.noAttachments')}</p>
                    <Button variant="outline" className="mt-3" onClick={() => setUploadDialogOpen(true)}>{t('od.uploadFile')}</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{att.fileName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">{FILE_TYPE_LABELS[att.fileType] || att.fileType}</Badge>
                              <span>{att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                              <span>{new Date(att.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" asChild><a href={att.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /></a></Button>
                          <Button variant="ghost" size="icon" asChild><a href={att.fileUrl} download><Download className="w-4 h-4" /></a></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteAttachment(att)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" />{t('od.auditLogTitle')}</CardTitle></CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('od.noLogs')}</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{getActionLabel(log.action)}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          {log.details && <p className="text-sm text-muted-foreground mt-1">{log.details}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-3 flex gap-2 print:hidden">
            {isDraft && <Button className="flex-1" onClick={() => setConfirmOrderOpen(true)}><CheckCircle2 className="w-4 h-4 mr-1" />{t('od.confirmOrder')}</Button>}
            {canReceive && <Button className="flex-1" variant="outline" onClick={() => navigate(`/purchasing/orders/${orderId}/receiving`)}><Truck className="w-4 h-4 mr-1" />{t('od.receive')}</Button>}
            {canSubmitFinance && <Button className="flex-1" onClick={() => setSubmitConfirmOpen(true)}><Send className="w-4 h-4 mr-1" />{t('od.submitToFinance')}</Button>}
            {canArchive && <Button className="flex-1" variant="outline" onClick={() => setArchiveConfirmOpen(true)}><Archive className="w-4 h-4 mr-1" />{t('od.archive')}</Button>}
            <Button variant="outline" size="icon" onClick={handleExportPDF}><FileDown className="w-4 h-4" /></Button>
          </div>
        )}
      </main>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('od.addPurchaseItem')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('od.searchMaterial')}</Label>
              <Input placeholder={t('od.searchMaterialPlaceholder')} value={materialSearch} onChange={e => setMaterialSearch(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('od.selectMaterial')}</Label>
              <Select value={addMaterialId} onValueChange={v => {
                setAddMaterialId(v);
                const mat = procMaterials.find((m: any) => m.id === v);
                if (mat) setAddPrice(Number(mat.default_price) || 0);
              }}>
                <SelectTrigger><SelectValue placeholder={t('od.selectMaterialPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {filteredProcMaterials.slice(0, 50).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.code} - {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('od.qty')}</Label>
                <Input type="number" value={addQty} onChange={e => setAddQty(Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>{t('od.unitPriceRM')}</Label>
                <Input type="number" value={addPrice} onChange={e => setAddPrice(Number(e.target.value) || 0)} step="0.01" />
              </div>
            </div>
            {addMaterialId && addQty > 0 && addPrice > 0 && (
              <p className="text-sm text-muted-foreground">{t('od.estimatedTotal')}: <span className="font-bold text-primary">RM {(addQty * addPrice).toFixed(2)}</span></p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddItem} disabled={addingItem || !addMaterialId || addQty <= 0}>
              {addingItem && <ChromeLoadingSpinner variant="muted" className="mr-1 h-4 w-4" />}
              {t('od.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Order Dialog */}
      <AlertDialog open={confirmOrderOpen} onOpenChange={setConfirmOrderOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('od.confirmOrderTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('od.confirmOrderDesc').replace('{orderNo}', order.orderNo)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOrder} disabled={confirmingOrder}>
              {confirmingOrder && <ChromeLoadingSpinner variant="muted" className="mr-1 h-4 w-4" />}
              {t('od.confirmOrder')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deletingItemId} onOpenChange={() => setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('od.deleteItem')}</AlertDialogTitle>
            <AlertDialogDescription>{t('od.deleteItemDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteItem}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('od.uploadAttachmentTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('od.fileType')}</Label>
              <Select value={uploadFileType} onValueChange={setUploadFileType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">{t('od.invoiceLabel')}</SelectItem>
                  <SelectItem value="delivery_order">{t('od.deliveryOrderLabel')}</SelectItem>
                  <SelectItem value="receipt">{t('od.receiptLabel')}</SelectItem>
                  <SelectItem value="photo">{t('od.photoLabel')}</SelectItem>
                  <SelectItem value="other">{t('od.otherLabel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('od.selectFile')}</Label>
              <Input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} disabled={uploading} />
            </div>
            {uploading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><ChromeLoadingSpinner variant="muted" className="h-4 w-4" />{t('od.uploading')}</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit to Finance Confirmation */}
      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('od.submitToFinanceTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('od.submitToFinanceDesc').replace('{orderNo}', order.orderNo)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitToFinance}>{t('od.confirmSubmit')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation */}
      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('od.archiveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('od.archiveDesc').replace('{orderNo}', order.orderNo)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>{t('od.confirmArchive')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
