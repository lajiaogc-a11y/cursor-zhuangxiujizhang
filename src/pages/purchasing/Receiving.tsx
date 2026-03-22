import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppChromeLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Truck, Plus, Package, CheckCircle, Camera, Image,
} from 'lucide-react';
import { purchasingService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQPurchaseOrders } from '@/hooks/useQPurchaseOrders';
import { useI18n } from '@/lib/i18n';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface POItem {
  id: string; materialId: string | null; materialCode: string; materialName: string;
  unit: string; quantity: number; receivedQty: number; remainingQty: number; unitPrice: number;
}

interface ReceivingLine {
  poItemId: string; materialId: string | null; materialCode: string; materialName: string;
  unit: string; orderedQty: number; previouslyReceived: number; receivingNow: number;
  exceptionNotes: string;
}

export default function ReceivingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const isMobile = useIsMobile();
  const { logAudit } = useQPurchaseOrders();
  const { t } = useI18n();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receivingLines, setReceivingLines] = useState<ReceivingLine[]>([]);
  const [receivingNotes, setReceivingNotes] = useState('');
  const [receivingPhotos, setReceivingPhotos] = useState<File[]>([]);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['purchaseReceiving', tenantId, orderId],
    queryFn: () => purchasingService.fetchReceivingPageData(orderId!),
    enabled: !!orderId && !!user && !!tenantId,
  });

  const orderNo = data?.orderNo ?? '';
  const supplierName = data?.supplierName ?? '';
  const poItems = (data?.poItems ?? []) as POItem[];
  const receivings = data?.receivings ?? [];

  const openReceivingDialog = () => {
    setReceivingLines(poItems.filter(i => i.remainingQty > 0).map(i => ({
      poItemId: i.id, materialId: i.materialId, materialCode: i.materialCode,
      materialName: i.materialName, unit: i.unit, orderedQty: i.quantity,
      previouslyReceived: i.receivedQty, receivingNow: i.remainingQty, exceptionNotes: '',
    })));
    setReceivingNotes('');
    setReceivingPhotos([]);
    setDialogOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setReceivingPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleSaveReceiving = async () => {
    const validLines = receivingLines.filter(l => l.receivingNow > 0);
    if (validLines.length === 0) { toast({ title: t('recv.fillQuantity'), variant: 'destructive' }); return; }
    try {
      setSaving(true);
      const receivingNo = await purchasingService.createReceiving(
        orderId!, validLines, receivingNotes, receivingPhotos, poItems, user?.id
      );
      await logAudit(orderId!, 'received', `${t('recv.title')} ${receivingNo} - ${validLines.length} ${t('recv.items')}`);
      toast({ title: t('recv.receivingRecorded'), description: `${t('recv.receivingNo')}: ${receivingNo}` });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['purchaseReceiving', tenantId, orderId] });
      queryClient.invalidateQueries({ queryKey: ['orderDetail', tenantId, orderId] });
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders', tenantId] });
    } catch (error: any) {
      toast({ title: t('recv.receivingFailed'), description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const allReceived = poItems.every(i => i.remainingQty <= 0);
  if (loading) return <AppChromeLoading label={t('common.loading')} />;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/purchasing/orders/${orderId}`)}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2"><Truck className="w-5 h-5 text-primary" />{t('recv.title')}</h1>
              <p className="text-xs text-muted-foreground">{orderNo} · {supplierName}</p>
            </div>
          </div>
          {!allReceived && <Button size="sm" onClick={openReceivingDialog}><Plus className="w-4 h-4 mr-1" /> {t('recv.newReceiving')}</Button>}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 animate-page-enter">
        {allReceived && (
          <Card className="mb-4 bg-green-500/10 border-green-500/30">
            <CardContent className="py-3 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-medium text-green-700 dark:text-green-400">{t('recv.allReceived')}</span></CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="pt-4"><h3 className="font-semibold mb-3">{t('recv.receiveProgress')}</h3></CardContent>
          {isMobile ? (
            <div className="px-4 pb-4 space-y-3">
              {poItems.map((item) => (
                <Card key={item.id} className="bg-muted/30">
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{item.materialCode}</span>
                      {item.remainingQty <= 0 ? <Badge variant="default">{t('recv.completed')}</Badge> : item.receivedQty > 0 ? <Badge variant="secondary">{t('recv.partialReceived')}</Badge> : <Badge variant="outline">{t('recv.pendingReceive')}</Badge>}
                    </div>
                    <p className="font-medium">{item.materialName}</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><span className="text-muted-foreground">{t('recv.orderedQty')} </span>{item.quantity}</div>
                      <div><span className="text-muted-foreground">{t('recv.receivedQty')} </span>{item.receivedQty}</div>
                      <div><span className="text-muted-foreground">{t('recv.pendingQty')} </span>{item.remainingQty}</div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (item.receivedQty / item.quantity) * 100)}%` }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-12 text-center">{t('recv.seq')}</TableHead>
                  <TableHead>{t('recv.materialCode')}</TableHead>
                  <TableHead>{t('recv.materialName')}</TableHead>
                  <TableHead>{t('recv.unit')}</TableHead>
                  <TableHead className="text-right">{t('recv.orderQty')}</TableHead>
                  <TableHead className="text-right">{t('recv.receivedCol')}</TableHead>
                  <TableHead className="text-right">{t('recv.pendingCol')}</TableHead>
                  <TableHead>{t('recv.status')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>{poItems.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono">{item.materialCode}</TableCell>
                    <TableCell>{item.materialName}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{item.receivedQty}</TableCell>
                    <TableCell className="text-right">{item.remainingQty}</TableCell>
                    <TableCell>
                      {item.remainingQty <= 0 ? <Badge variant="default">{t('recv.completed')}</Badge> : item.receivedQty > 0 ? <Badge variant="secondary">{t('recv.partialReceived')}</Badge> : <Badge variant="outline">{t('recv.pendingReceive')}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </ScrollArea>
          )}
        </Card>

        <h3 className="font-semibold mb-3">{t('recv.records')}</h3>
        {receivings.length === 0 ? (
          <Card><CardContent className="py-8 text-center"><Package className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">{t('recv.noRecords')}</p></CardContent></Card>
        ) : (
          <div className="space-y-3">{receivings.map((r: any) => (
            <Card key={r.id}><CardContent className="py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{r.receiving_no}</span>
                <span className="text-sm text-muted-foreground">{r.receiving_date}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {(r.q_purchase_receiving_items || []).map((ri: any, idx: number) => (
                  <span key={ri.id}>{idx > 0 && ' · '}{Number(ri.received_quantity)} {t('recv.items')}</span>
                ))}
              </div>
              {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
            </CardContent></Card>
          ))}</div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('recv.newReceiving')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {isMobile ? (
              <div className="space-y-3">{receivingLines.map((line, idx) => (
                <Card key={line.poItemId} className="bg-muted/30">
                  <CardContent className="py-3 space-y-2">
                    <p className="font-medium text-sm">{line.materialCode} - {line.materialName}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>{t('recv.orderedQty')}: {line.orderedQty}</span><span>{t('recv.receivedQty')}: {line.previouslyReceived}</span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('recv.thisReceiving')}</Label>
                      <Input type="number" min={0} max={line.orderedQty - line.previouslyReceived} value={line.receivingNow}
                        onChange={e => { const val = Math.min(Math.max(0, parseFloat(e.target.value) || 0), line.orderedQty - line.previouslyReceived); const n = [...receivingLines]; n[idx] = { ...line, receivingNow: val }; setReceivingLines(n); }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('recv.exceptionNotes')}</Label>
                      <Input placeholder={t('recv.exceptionPlaceholder')} value={line.exceptionNotes}
                        onChange={e => { const n = [...receivingLines]; n[idx] = { ...line, exceptionNotes: e.target.value }; setReceivingLines(n); }} />
                    </div>
                  </CardContent>
                </Card>
              ))}</div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('recv.materialName')}</TableHead>
                    <TableHead className="text-right">{t('recv.orderedQty')}</TableHead>
                    <TableHead className="text-right">{t('recv.receivedQty')}</TableHead>
                    <TableHead className="text-right w-28">{t('recv.thisReceiving')}</TableHead>
                    <TableHead className="w-40">{t('recv.exceptionNotes')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{receivingLines.map((line, idx) => (
                    <TableRow key={line.poItemId}>
                      <TableCell><span className="font-mono text-sm">{line.materialCode}</span><br /><span className="text-sm text-muted-foreground">{line.materialName}</span></TableCell>
                      <TableCell className="text-right">{line.orderedQty}</TableCell>
                      <TableCell className="text-right">{line.previouslyReceived}</TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} max={line.orderedQty - line.previouslyReceived} value={line.receivingNow} className="w-20 text-right"
                          onChange={e => { const val = Math.min(Math.max(0, parseFloat(e.target.value) || 0), line.orderedQty - line.previouslyReceived); const n = [...receivingLines]; n[idx] = { ...line, receivingNow: val }; setReceivingLines(n); }} />
                      </TableCell>
                      <TableCell>
                        <Input placeholder={t('recv.exceptionPlaceholder')} value={line.exceptionNotes} className="text-sm"
                          onChange={e => { const n = [...receivingLines]; n[idx] = { ...line, exceptionNotes: e.target.value }; setReceivingLines(n); }} />
                      </TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </ScrollArea>
            )}
            <div className="space-y-2">
              <Label>{t('recv.notes')}</Label>
              <Textarea value={receivingNotes} onChange={e => setReceivingNotes(e.target.value)} placeholder={t('recv.notesPlaceholder')} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{t('recv.photos')}</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-1" /> {t('recv.addPhoto')}
                </Button>
                {receivingPhotos.length > 0 && <span className="text-sm text-muted-foreground">{receivingPhotos.length} {t('recv.photosSelected')}</span>}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
              {receivingPhotos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {receivingPhotos.map((f, i) => (
                    <div key={i} className="relative w-16 h-16 rounded border overflow-hidden">
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      <button className="absolute top-0 right-0 bg-destructive text-white text-xs px-1 rounded-bl"
                        onClick={() => setReceivingPhotos(prev => prev.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveReceiving} disabled={saving}>{saving && <ChromeLoadingSpinner variant="muted" className="mr-1 h-4 w-4" />}{t('recv.confirmReceiving')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
