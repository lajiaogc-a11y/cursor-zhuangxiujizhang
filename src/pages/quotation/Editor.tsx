import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { FileText, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useQQuotations, useQQuotationItems } from '@/hooks/useQQuotations';
import { useQProducts } from '@/hooks/useQProducts';
import { useQCustomers } from '@/hooks/useQCustomers';
import { UNIT_LABELS, PRICE_TIER_LABELS, type PriceTier } from '@/types/quotation';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const { quotations, saveQuotation } = useQQuotations();
  const { items, loading: itemsLoading, addItem, updateItem, deleteItem } = useQQuotationItems(id);
  const { products } = useQProducts();
  const { customers } = useQCustomers();

  const quotation = quotations.find(q => q.id === id);
  const [headerOpen, setHeaderOpen] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [priceTier, setPriceTier] = useState<PriceTier>('normal');
  const [quantity, setQuantity] = useState(1);

  const [customerName, setCustomerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (quotation) {
      setCustomerName(quotation.customerName || '');
      setProjectName(quotation.projectNo || '');
      setNotes(quotation.notes || '');
    }
  }, [quotation?.id]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.lineTotal, 0), [items]);

  const handleSaveHeader = async () => {
    if (!id || !quotation) return;
    await saveQuotation.mutateAsync({
      id,
      projectNo: projectName || quotation.projectNo,
      quotationDate: quotation.quotationDate,
      items: quotation.items,
      summary: { subtotal, subtotalUSD: 0, subtotalCNY: 0, discount: 0, grandTotal: subtotal, grandTotalUSD: 0, grandTotalCNY: 0, depositAmount: 0, progressAmount: 0, finalAmount: 0 },
      settings: quotation.settings || { companyName: '', currency: 'MYR', taxSettings: { enableDiscount: false, discountAmount: 0 }, paymentTerms: { deposit: 50, progress: 30, final: 20 }, validityPeriod: 30 },
      costAnalysis: quotation.costAnalysis || { estimatedCost: 0, targetProfitRate: 30, estimatedProfit: 0, actualProfitRate: 0 },
      quotationNotes: notes,
    });
    toast({ title: t('qe.saved') });
  };

  const handleAddProduct = async () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    let unitPrice = product.unitPrice;
    if (priceTier === 'normal' && product.priceNormal != null) unitPrice = product.priceNormal;
    if (priceTier === 'medium' && product.priceMedium != null) unitPrice = product.priceMedium;
    if (priceTier === 'advanced' && product.priceAdvanced != null) unitPrice = product.priceAdvanced;

    await addItem.mutateAsync({
      productId: product.id,
      nameZh: product.nameZh,
      nameEn: product.nameEn,
      unit: product.unit,
      quantity,
      unitPrice,
      category: product.category || '',
      priceTier,
      sortOrder: items.length,
    });
    setAddDialogOpen(false);
    setSelectedProductId('');
    setQuantity(1);
  };

  if (!quotation && !itemsLoading) {
    return (
      <MobilePageShell title={t('qe.quotation')} backTo="/quotation/history">
        <div className="p-8 text-center text-muted-foreground">{t('qe.notFound')}</div>
      </MobilePageShell>
    );
  }

  return (
    <MobilePageShell
      title={quotation?.projectNo || t('qe.loading')}
      
      icon={<FileText className="w-5 h-5" />}
      backTo="/quotation/history"
      headerActions={
        <Button size="sm" onClick={handleSaveHeader} className="h-8 gap-1" disabled={saveQuotation.isPending}>
          <Save className="w-4 h-4" /> {t('qe.save')}
        </Button>
      }
    >
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="p-3 cursor-pointer" onClick={() => setHeaderOpen(!headerOpen)}>
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm">{t('qe.basicInfo')}</CardTitle>
              {headerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          {headerOpen && (
            <CardContent className="p-3 pt-0 space-y-3">
              <div>
                <Label className="text-xs">{t('qe.customerName')}</Label>
                <Select value={customerName} onValueChange={v => setCustomerName(v)}>
                  <SelectTrigger><SelectValue placeholder={t('qe.selectCustomer')} /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.nameZh}>{c.nameZh}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t('qe.projectName')}</Label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder={t('qe.projectNamePlaceholder')} />
              </div>
              <div>
                <Label className="text-xs">{t('qe.notes')}</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">{t('qe.quotationItems')} ({items.length})</h3>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)} className="h-7 text-xs gap-1">
            <Plus className="w-3.5 h-3.5" /> {t('qe.addProduct')}
          </Button>
        </div>

        {itemsLoading ? (
          <AppSectionLoading label={t('common.loading')} compact />
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              {t('qe.noItems')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <Card key={item.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                        <p className="text-sm font-medium truncate">{item.nameZh}</p>
                      </div>
                      {item.nameEn && <p className="text-[10px] text-muted-foreground ml-5">{item.nameEn}</p>}
                      <div className="flex items-center gap-3 mt-1.5 ml-5">
                        <Input type="number" value={item.quantity} onChange={e => updateItem.mutate({ id: item.id, quantity: Number(e.target.value), unitPrice: item.unitPrice })} className="w-16 h-7 text-xs" />
                        <span className="text-xs text-muted-foreground">{language === 'zh' ? (UNIT_LABELS[item.unit]?.zh || item.unit) : (UNIT_LABELS[item.unit]?.en || item.unit)}</span>
                        <span className="text-xs">× RM</span>
                        <Input type="number" value={item.unitPrice} onChange={e => updateItem.mutate({ id: item.id, quantity: item.quantity, unitPrice: Number(e.target.value) })} className="w-20 h-7 text-xs" />
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-semibold">RM {item.lineTotal.toFixed(2)}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive mt-1" onClick={() => deleteItem.mutate(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('qe.subtotal')}</span>
                <span className="text-lg font-bold">RM {subtotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('qe.addProduct')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('qe.selectProduct')}</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger><SelectValue placeholder={t('qe.selectProductPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nameZh} {p.nameEn ? `(${p.nameEn})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('qe.priceTier')}</Label><Select value={priceTier} onValueChange={v => setPriceTier(v as PriceTier)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRICE_TIER_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{language === 'zh' ? v.zh : v.en} ({language === 'zh' ? v.en : v.zh})</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('qe.quantity')}</Label><Input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></div>
            </div>
            {selectedProductId && (() => {
              const p = products.find(x => x.id === selectedProductId);
              if (!p) return null;
              let price = p.unitPrice;
              if (priceTier === 'normal' && p.priceNormal != null) price = p.priceNormal;
              if (priceTier === 'medium' && p.priceMedium != null) price = p.priceMedium;
              if (priceTier === 'advanced' && p.priceAdvanced != null) price = p.priceAdvanced;
              return (<div className="rounded-lg bg-muted p-3 text-sm"><p>{t('qe.unitPrice')}: RM {price.toFixed(2)}</p><p className="font-semibold mt-1">{t('qe.lineTotal')}: RM {(price * quantity).toFixed(2)}</p></div>);
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>{t('qe.cancel')}</Button>
            <Button onClick={handleAddProduct} disabled={!selectedProductId || addItem.isPending}>{t('qe.add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobilePageShell>
  );
}
