import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, Plus, Trash2, Download, Paperclip, History, Package, Users, ChevronRight, MoreVertical, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { AppChromeLoading } from '@/components/layout/AppChromeLoading';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function BreakdownDetailPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { settings: companySettings } = useCompanySettings();

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ materialId: '', methodId: '', quantity: 1, wastePct: 5, unitPrice: 0 });
  const [saveVersionOpen, setSaveVersionOpen] = useState(false);
  const [versionDesc, setVersionDesc] = useState('');
  const [tab, setTab] = useState('bom');

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    draft: { label: t('cost.draft'), variant: 'secondary' },
    submitted: { label: t('cost.submitted'), variant: 'default' },
    approved: { label: t('cost.approved'), variant: 'outline' },
  };

  const { data: breakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ['q_project_breakdown', tenantId, quotationId],
    queryFn: async () => {
      const data = await costService.fetchBreakdownDetail(quotationId!);
      return {
        id: data.id, quotationId: data.quotation_id, name: data.name || t('bd.unnamed'),
        status: data.status || 'draft', quotedAmount: Number(data.quoted_amount) || 0,
        totalMaterialCost: Number(data.total_material_cost) || 0, totalLaborCost: Number(data.total_labor_cost) || 0,
        totalCost: Number(data.total_cost) || 0, estimatedProfit: Number(data.estimated_profit) || 0,
        managementFeePct: Number(data.management_fee_pct) || 0, taxPct: Number(data.tax_pct) || 0, createdAt: data.created_at,
      };
    },
    enabled: !!quotationId && !!user && !!tenantId,
  });

  // Fetch quotation items JSON to resolve quotation_item_id to product names
  const { data: quotationItemNameMap = {} } = useQuery({
    queryKey: ['q_quotation_item_names', tenantId, breakdown?.quotationId],
    queryFn: () => costService.fetchQuotationItemNames(breakdown!.quotationId),
    enabled: !!breakdown?.quotationId && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['q_breakdown_items', tenantId, quotationId],
    queryFn: async () => {
      const data = await costService.fetchBreakdownItems(quotationId!);
      return data.map((item: any) => ({
        id: item.id, materialId: item.material_id, materialName: item.q_materials?.name || t('cost.unknown'),
        materialCode: item.q_materials?.code || '', materialUnit: item.q_materials?.unit || '',
        methodId: item.method_id, methodCode: item.q_methods?.method_code || '', methodName: item.q_methods?.name_zh || '',
        quotationItemId: item.quotation_item_id || '',
        quantity: Number(item.quantity) || 0, netQuantity: Number(item.net_quantity) || 0,
        wastePct: Number(item.waste_pct) || 0, quantityWithWaste: Number(item.quantity_with_waste) || 0,
        purchaseQuantity: Number(item.purchase_quantity) || 0, unitPrice: Number(item.unit_price) || 0,
        estimatedCost: Number(item.estimated_cost) || 0,
      }));
    },
    enabled: !!quotationId && !!tenantId,
  });

  const methodIds = useMemo(() => [...new Set(items.filter(i => i.methodId).map(i => i.methodId))] as string[], [items]);
  const sortedMethodIds = useMemo(() => [...methodIds].sort(), [methodIds]);
  const { data: laborRates = [] } = useQuery({
    queryKey: ['q_labor_rates', tenantId, sortedMethodIds],
    queryFn: () => costService.fetchLaborRatesByMethods(methodIds),
    enabled: methodIds.length > 0 && !!tenantId,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['q_breakdown_versions', tenantId, quotationId],
    queryFn: async () => {
      const data = await costService.fetchBreakdownVersions(quotationId!);
      return data.map((v: any) => ({ id: v.id, versionNumber: v.version_number, totalMaterialCost: Number(v.total_material_cost) || 0, totalLaborCost: Number(v.total_labor_cost) || 0, totalCost: Number(v.total_cost) || 0, changeDescription: v.change_description || '', createdAt: v.created_at }));
    },
    enabled: !!quotationId && !!tenantId && tab === 'versions',
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['q_breakdown_attachments', tenantId, quotationId],
    queryFn: () => costService.fetchBreakdownAttachments(quotationId!),
    enabled: !!quotationId && !!tenantId && tab === 'attachments',
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['q_materials_bd_select', tenantId],
    queryFn: () => costService.fetchMaterialsSelect(),
    enabled: !!user && !!tenantId && addItemOpen,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ['q_methods_bd_select', tenantId],
    queryFn: async () => {
      const data = await costService.fetchMethodsSelect();
      return data.map((m: any) => ({ id: m.id, name: m.name_zh }));
    },
    enabled: !!user && !!tenantId && addItemOpen,
  });

  const itemsTotal = useMemo(() => items.reduce((s, i) => s + i.estimatedCost, 0), [items]);
  const laborTotal = useMemo(() => {
    let total = 0;
    items.forEach(item => { if (!item.methodId) return; const rates = laborRates.filter(lr => lr.methodId === item.methodId); rates.forEach(lr => { total += lr.hourlyRate * lr.hoursPerUnit * item.quantity; }); });
    return total;
  }, [items, laborRates]);

  const totalCost = itemsTotal + laborTotal;
  const sstPct = companySettings?.taxSettings?.sstPct ?? 0;
  const sstAmount = totalCost * sstPct / 100;
  const totalCostWithSST = totalCost + sstAmount;
  const profit = (breakdown?.quotedAmount || 0) - totalCostWithSST;
  const profitRate = breakdown?.quotedAmount ? (profit / breakdown.quotedAmount * 100) : 0;

  const addItem = useMutation({
    mutationFn: async () => {
      const netQty = newItem.quantity; const qtyWithWaste = netQty * (1 + newItem.wastePct / 100);
      const purchaseQty = Math.ceil(qtyWithWaste); const estimatedCost = purchaseQty * newItem.unitPrice;
      await costService.addBreakdownItem({
        project_breakdown_id: quotationId, material_id: newItem.materialId || null, method_id: newItem.methodId || null,
        quantity: netQty, net_quantity: netQty, waste_pct: newItem.wastePct, quantity_with_waste: qtyWithWaste,
        purchase_quantity: purchaseQty, unit_price: newItem.unitPrice, estimated_cost: estimatedCost,
        tenant_id: tenant?.id,
      });
      await costService.recalcBreakdownTotals(quotationId!, laborTotal, breakdown?.quotedAmount || 0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_breakdown_items', tenantId, quotationId] });
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdown', tenantId, quotationId] });
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdowns', tenantId] });
      toast({ title: t('bd.materialAdded') }); setAddItemOpen(false);
      setNewItem({ materialId: '', methodId: '', quantity: 1, wastePct: 5, unitPrice: 0 });
    },
    onError: (e: any) => toast({ title: t('bd.addFailed'), description: e.message, variant: 'destructive' }),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      await costService.deleteBreakdownItem(itemId);
      await costService.recalcBreakdownTotals(quotationId!, laborTotal, breakdown?.quotedAmount || 0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_breakdown_items', tenantId, quotationId] });
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdown', tenantId, quotationId] });
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdowns', tenantId] });
      toast({ title: t('bd.deleted') }); setDeleteItemId(null);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const update: any = { status };
      if (status === 'submitted') { update.submitted_to_procurement_at = new Date().toISOString(); update.submitted_to_procurement_by = user?.id; }
      await costService.updateBreakdownStatus(quotationId!, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdown', tenantId, quotationId] });
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdowns', tenantId] });
      toast({ title: t('bd.statusUpdated') });
    },
  });

  const saveVersion = useMutation({
    mutationFn: async () => {
      const nextVersion = (versions[0]?.versionNumber || 0) + 1;
      const itemsJson = items.map(i => ({ materialId: i.materialId, materialName: i.materialName, quantity: i.quantity, wastePct: i.wastePct, purchaseQuantity: i.purchaseQuantity, unitPrice: i.unitPrice, estimatedCost: i.estimatedCost }));
      await costService.saveBreakdownVersion({ project_breakdown_id: quotationId, version_number: nextVersion, items: itemsJson, total_material_cost: itemsTotal, total_labor_cost: laborTotal, total_cost: totalCost, change_description: versionDesc, created_by: user?.id, tenant_id: tenant?.id });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_breakdown_versions', tenantId, quotationId] }); toast({ title: t('bd.versionSaved') }); setSaveVersionOpen(false); setVersionDesc(''); },
  });

  const submitToProcurement = useMutation({
    mutationFn: () => costService.submitBreakdownToProcurement(quotationId!, items, itemsTotal, breakdown?.name || '', user?.id, tenant?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdown', tenantId, quotationId] });
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdowns', tenantId] });
      toast({ title: t('bd.procSubmitted') });
    },
    onError: (e: any) => toast({ title: t('bd.procFailed'), description: e.message, variant: 'destructive' }),
  });

  async function recalcBreakdown() {
    await costService.recalcBreakdownTotals(quotationId!, laborTotal, breakdown?.quotedAmount || 0);
  }

  function exportExcel() {
    const wsData = [
      [t('bd.excelMaterialCode'), t('bd.excelMaterialName'), t('bd.excelMethod'), t('bd.excelQty'), t('bd.excelUnit'), t('bd.excelWaste'), t('bd.excelPurchaseQty'), t('bd.excelUnitPrice'), t('bd.excelEstCost')],
      ...items.map(i => [i.materialCode, i.materialName, i.methodName, i.quantity, i.materialUnit, i.wastePct, i.purchaseQuantity, i.unitPrice, i.estimatedCost]),
      [], ['', '', '', '', '', '', '', t('bd.excelMaterialTotal'), itemsTotal],
      ['', '', '', '', '', '', '', t('bd.excelLaborTotal'), laborTotal],
      ['', '', '', '', '', '', '', t('bd.excelTotalCost'), totalCost],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('bd.excelSheet'));
    XLSX.writeFile(wb, `${t('bd.excelFileName')}_${breakdown?.name || 'export'}.xlsx`);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      await costService.uploadBreakdownAttachment(quotationId!, file, user?.id);
      queryClient.invalidateQueries({ queryKey: ['q_breakdown_attachments', tenantId, quotationId] });
      toast({ title: t('bd.fileUploaded') });
    } catch (err: any) {
      toast({ title: t('bd.uploadFailed'), description: err.message, variant: 'destructive' });
    }
  }

  if (loadingBreakdown) return <AppChromeLoading label={t('common.loading')} />;

  if (!breakdown) return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">{t('bd.notFound')}</p>
      <Button onClick={() => navigate('/cost/budget')}>{t('bd.backToList')}</Button>
    </div>
  );

  const st = statusMap[breakdown.status] || statusMap.draft;
  const isDraft = breakdown.status === 'draft';

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/cost/budget')}><ChevronRight className="w-4 h-4 rotate-180" /></Button>
            <Calculator className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm truncate max-w-[180px]">{breakdown.name}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportExcel}><Download className="w-4 h-4 mr-2" />{t('bd.exportExcel')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSaveVersionOpen(true)}><History className="w-4 h-4 mr-2" />{t('bd.saveVersion')}</DropdownMenuItem>
              {isDraft && (
                <DropdownMenuItem onClick={() => submitToProcurement.mutate()} disabled={items.length === 0}><Package className="w-4 h-4 mr-2" />{t('bd.submitProcurement')}</DropdownMenuItem>
              )}
              {breakdown.status === 'submitted' && (
                <DropdownMenuItem onClick={() => updateStatus.mutate('approved')}>{t('bd.approvePass')}</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="p-4 space-y-4 animate-page-enter">
        <div className="grid grid-cols-2 gap-2">
          <div className="stat-card-v2"><div><p className="text-sm font-bold">RM {breakdown.quotedAmount.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{t('bd.quotedAmount')}</p></div></div>
          <div className="stat-card-v2"><div><p className="text-sm font-bold">RM {itemsTotal.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{t('bd.materialCost')}</p></div></div>
          <div className="stat-card-v2"><div><p className="text-sm font-bold">RM {laborTotal.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{t('bd.laborCost')}</p></div></div>
          {sstPct > 0 && <Card><CardContent className="p-2.5"><p className="text-[10px] text-muted-foreground">SST ({sstPct}%)</p><p className="text-sm font-bold">RM {sstAmount.toLocaleString()}</p></CardContent></Card>}
          <Card><CardContent className="p-2.5"><p className="text-[10px] text-muted-foreground">{t('bd.estimatedProfit')}</p>
            <div className="flex items-center gap-1.5"><p className={`text-sm font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{profitRate.toFixed(1)}%</p><Badge variant={st.variant} className="text-[10px]">{st.label}</Badge></div>
          </CardContent></Card>
        </div>

        {breakdown.quotedAmount > 0 && (
          <Card><CardContent className="p-3">
            <div className="flex justify-between text-xs mb-1"><span>{t('bd.costRatio')}</span><span>{Math.min(100, (totalCost / breakdown.quotedAmount * 100)).toFixed(1)}%</span></div>
            <Progress value={Math.min(100, totalCost / breakdown.quotedAmount * 100)} className="h-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{t('bd.materialLabel')} RM {itemsTotal.toLocaleString()}</span>
              <span>{t('bd.laborLabel')} RM {laborTotal.toLocaleString()}</span>
              <span>{t('bd.remaining')} RM {Math.max(0, profit).toLocaleString()}</span>
            </div>
          </CardContent></Card>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="bom" className="text-xs">{t('bd.bomTab')}</TabsTrigger>
            <TabsTrigger value="labor" className="text-xs">{t('bd.laborTab')}</TabsTrigger>
            <TabsTrigger value="attachments" className="text-xs">{t('bd.attachmentsTab')}</TabsTrigger>
            <TabsTrigger value="versions" className="text-xs">{t('bd.versionsTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="bom" className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">{t('bd.bomTitle')} ({items.length})</h3>
              {isDraft && <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setAddItemOpen(true)}><Plus className="w-3.5 h-3.5" /> {t('bd.addBtn')}</Button>}
            </div>
            {loadingItems ? <AppSectionLoading label={t('common.loading')} compact />
            : items.length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">{t('bd.noBomItems')}</p>
            : <ResponsiveTable
                mobileView={
                  <div className="space-y-2">
                    {items.map((item) => (
                      <Card key={item.id}><CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              {item.materialCode && <Badge variant="outline" className="text-[10px]">{item.materialCode}</Badge>}
                              <p className="text-sm font-medium">{item.materialName}</p>
                            </div>
                            {item.methodName && <p className="text-[10px] text-muted-foreground">{t('bd.method')} {item.methodName}</p>}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                              <span>{t('bd.quantity')} {item.quantity} {item.materialUnit}</span>
                              <span>{t('bd.waste')} {item.wastePct}%</span>
                              <span>{t('bd.purchaseQty')} {item.purchaseQuantity}</span>
                              <span>{t('bd.unitPriceLabel')} RM {item.unitPrice.toFixed(2)}</span>
                            </div>
                            <p className="text-xs font-semibold mt-1">{t('bd.estimated')} RM {item.estimatedCost.toFixed(2)}</p>
                          </div>
                          {isDraft && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteItemId(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                        </div>
                      </CardContent></Card>
                    ))}
                    <Card className="bg-muted/50"><CardContent className="p-3 flex justify-between text-sm font-semibold"><span>{t('bd.materialTotal')}</span><span>RM {itemsTotal.toLocaleString()}</span></CardContent></Card>
                  </div>
                }
                desktopView={
                  <div className="border rounded-lg overflow-hidden">
                    <Table compact>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>{t('bd.quotationItem')}</TableHead>
                          <TableHead>{t('cost.methodCode')}</TableHead>
                          <TableHead>{t('cost.methodName')}</TableHead>
                          <TableHead>{t('bd.excelMaterialCode')}</TableHead>
                          <TableHead>{t('bd.excelMaterialName')}</TableHead>
                          <TableHead>{t('bd.excelUnit')}</TableHead>
                          <TableHead className="text-right">{t('bd.usagePerUnit')}</TableHead>
                          <TableHead className="text-right">{t('bd.excelQty')}</TableHead>
                          <TableHead className="text-right">{t('bd.netQty')}</TableHead>
                          <TableHead className="text-right">{t('bd.excelWaste')}</TableHead>
                          <TableHead className="text-right">{t('bd.excelPurchaseQty')}</TableHead>
                          <TableHead className="text-right">{t('bd.excelUnitPrice')}</TableHead>
                          <TableHead className="text-right">{t('bd.excelEstCost')}</TableHead>
                          {isDraft && <TableHead className="w-12"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{quotationItemNameMap[item.quotationItemId] || item.quotationItemId || '-'}</TableCell>
                            <TableCell>{item.methodCode ? <Badge variant="outline" className="text-[10px]">{item.methodCode}</Badge> : '--'}</TableCell>
                            <TableCell className="text-muted-foreground">{item.methodName || '--'}</TableCell>
                            <TableCell>{item.materialCode ? <Badge variant="outline" className="text-[10px]">{item.materialCode}</Badge> : '--'}</TableCell>
                            <TableCell>{item.materialName}</TableCell>
                            <TableCell>{item.materialUnit || '--'}</TableCell>
                            <TableCell className="text-right font-mono">{item.quantity > 0 && item.netQuantity > 0 ? (item.netQuantity / item.quantity).toFixed(1) : '0'}</TableCell>
                            <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono">{item.netQuantity.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{item.wastePct}%</TableCell>
                            <TableCell className="text-right font-mono">{item.purchaseQuantity}</TableCell>
                            <TableCell className="text-right font-mono">{item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-amber-500">{item.estimatedCost.toFixed(2)}</TableCell>
                            {isDraft && <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteItemId(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>}
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={isDraft ? 13 : 13} className="text-right">{t('bd.materialTotal')}</TableCell>
                          <TableCell className="text-right font-mono">RM {itemsTotal.toLocaleString()}</TableCell>
                          {isDraft && <TableCell />}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                }
              />}
          </TabsContent>

          <TabsContent value="labor" className="mt-3">
            <h3 className="text-sm font-semibold mb-2">{t('bd.laborDetail')}</h3>
            {items.filter(i => i.methodId).length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">{t('bd.noMethodItems')}</p>
            : (() => {
                const laborItems = items.filter(i => i.methodId).flatMap(item => {
                  const rates = laborRates.filter(lr => lr.methodId === item.methodId);
                  return rates.map(lr => ({
                    key: `${item.id}_${lr.id}`, quotationItemId: item.quotationItemId, methodCode: item.methodCode, methodName: item.methodName,
                    workerType: lr.workerType, quantity: item.quantity, hoursPerUnit: lr.hoursPerUnit,
                    totalHours: lr.hoursPerUnit * item.quantity,
                    hourlyRate: lr.hourlyRate, totalCost: lr.hourlyRate * lr.hoursPerUnit * item.quantity,
                  }));
                });
                return <ResponsiveTable
                  mobileView={
                    <div className="space-y-2">
                      {items.filter(i => i.methodId).map((item) => {
                        const rates = laborRates.filter(lr => lr.methodId === item.methodId);
                        const itemLabor = rates.reduce((s, lr) => s + lr.hourlyRate * lr.hoursPerUnit * item.quantity, 0);
                        return (
                          <Card key={item.id}><CardContent className="p-3">
                            <p className="text-sm font-medium">{item.materialName} - {item.methodName}</p>
                            <p className="text-xs text-muted-foreground">{t('bd.quantity')} {item.quantity}</p>
                            {rates.length > 0 ? (
                              <div className="mt-1 space-y-0.5">{rates.map(lr => (
                                <div key={lr.id} className="flex justify-between text-xs">
                                  <span>{lr.workerType}: {lr.hoursPerUnit}h × RM{lr.hourlyRate}/h × {item.quantity}</span>
                                  <span className="font-medium">RM {(lr.hourlyRate * lr.hoursPerUnit * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}</div>
                            ) : <p className="text-[10px] text-muted-foreground mt-1">{t('bd.noLaborRate')}</p>}
                            <p className="text-xs font-semibold mt-1 text-right">{t('bd.laborSubtotal')} RM {itemLabor.toFixed(2)}</p>
                          </CardContent></Card>
                        );
                      })}
                      <Card className="bg-muted/50"><CardContent className="p-3 flex justify-between text-sm font-semibold"><span>{t('bd.laborTotal')}</span><span>RM {laborTotal.toLocaleString()}</span></CardContent></Card>
                    </div>
                  }
                  desktopView={
                    <div className="border rounded-lg overflow-hidden">
                      <Table compact>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>{t('bd.quotationItem')}</TableHead>
                            <TableHead>{t('cost.methodCode')}</TableHead>
                            <TableHead>{t('cost.methodName')}</TableHead>
                            <TableHead className="text-right">{t('bd.excelQty')}</TableHead>
                            <TableHead>{t('cost.workerType')}</TableHead>
                            <TableHead className="text-right">{t('cost.hoursPerUnit')}</TableHead>
                            <TableHead className="text-right">{t('bd.totalHours')}</TableHead>
                            <TableHead className="text-right">{t('cost.hourlyRate')} (RM)</TableHead>
                            <TableHead className="text-right">{t('bd.laborCostRM')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {laborItems.map((lr, idx) => (
                            <TableRow key={lr.key}>
                              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{quotationItemNameMap[lr.quotationItemId] || lr.quotationItemId || '-'}</TableCell>
                              <TableCell>{lr.methodCode ? <Badge variant="outline" className="text-[10px]">{lr.methodCode}</Badge> : '--'}</TableCell>
                              <TableCell>{lr.methodName}</TableCell>
                              <TableCell className="text-right font-mono">{lr.quantity}</TableCell>
                              <TableCell>{lr.workerType}</TableCell>
                              <TableCell className="text-right font-mono">{lr.hoursPerUnit}</TableCell>
                              <TableCell className="text-right font-mono">{lr.totalHours.toFixed(1)}</TableCell>
                              <TableCell className="text-right font-mono">{lr.hourlyRate.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold text-amber-500">{lr.totalCost.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={7} className="text-right">{t('bd.laborTotal')}</TableCell>
                            <TableCell className="text-right font-mono">{laborItems.reduce((s, l) => s + l.totalHours, 0).toFixed(1)}</TableCell>
                            <TableCell />
                            <TableCell className="text-right font-mono">RM {laborTotal.toLocaleString()}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  }
                />;
              })()}
          </TabsContent>

          <TabsContent value="attachments" className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">{t('bd.attachments')} ({attachments.length})</h3>
              <label>
                <input type="file" className="hidden" onChange={handleFileUpload} />
                <Button size="sm" className="h-7 text-xs gap-1" asChild><span><Upload className="w-3.5 h-3.5" /> {t('bd.upload')}</span></Button>
              </label>
            </div>
            {attachments.length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">{t('bd.noAttachments')}</p>
            : <div className="space-y-2">{attachments.map((a: any) => (
              <Card key={a.id}><CardContent className="p-3 flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{a.file_size ? `${(a.file_size / 1024).toFixed(1)} KB` : ''} · {format(new Date(a.created_at), 'yyyy-MM-dd HH:mm')}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7" asChild><a href={a.file_url} target="_blank" rel="noopener noreferrer">{t('bd.view')}</a></Button>
              </CardContent></Card>
            ))}</div>}
          </TabsContent>

          <TabsContent value="versions" className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">{t('bd.versionRecords')} ({versions.length})</h3>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setSaveVersionOpen(true)}><History className="w-3.5 h-3.5" /> {t('bd.saveVersion')}</Button>
            </div>
            {versions.length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">{t('bd.noVersions')}</p>
            : <div className="space-y-2">{versions.map((v: any) => (
              <Card key={v.id}><CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div><p className="text-sm font-medium">{t('bd.versionLabel')} {v.versionNumber}</p><p className="text-[10px] text-muted-foreground">{format(new Date(v.createdAt), 'yyyy-MM-dd HH:mm')}</p>{v.changeDescription && <p className="text-xs text-muted-foreground mt-1">{v.changeDescription}</p>}</div>
                  <div className="text-right text-xs"><p>{t('bd.materialLabel2')} RM {v.totalMaterialCost.toLocaleString()}</p><p>{t('bd.laborLabel2')} RM {v.totalLaborCost.toLocaleString()}</p><p className="font-semibold">{t('bd.totalLabel')} RM {v.totalCost.toLocaleString()}</p></div>
                </div>
              </CardContent></Card>
            ))}</div>}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('bd.addMaterial')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('bd.materialRequired')}</Label>
              <Select value={newItem.materialId} onValueChange={v => { const mat = materials.find((m: any) => m.id === v); setNewItem({ ...newItem, materialId: v, unitPrice: Number(mat?.default_price) || 0 }); }}>
                <SelectTrigger><SelectValue placeholder={t('bd.selectMaterial')} /></SelectTrigger>
                <SelectContent>{materials.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('bd.methodLabel')}</Label>
              <Select value={newItem.methodId} onValueChange={v => setNewItem({ ...newItem, methodId: v })}>
                <SelectTrigger><SelectValue placeholder={t('bd.selectMethod')} /></SelectTrigger>
                <SelectContent>{methods.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('bd.qtyLabel')}</Label><Input type="number" min={0} value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })} /></div>
              <div><Label>{t('bd.wastePct')}</Label><Input type="number" min={0} max={100} value={newItem.wastePct} onChange={e => setNewItem({ ...newItem, wastePct: Number(e.target.value) })} /></div>
              <div><Label>{t('bd.priceLabel')}</Label><Input type="number" min={0} step={0.01} value={newItem.unitPrice} onChange={e => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })} /></div>
            </div>
            <div className="bg-muted rounded-lg p-2 text-xs space-y-0.5">
              <p>{t('bd.wasteQty')} {(newItem.quantity * (1 + newItem.wastePct / 100)).toFixed(2)}</p>
              <p>{t('bd.purchaseQtyCeil')} {Math.ceil(newItem.quantity * (1 + newItem.wastePct / 100))}</p>
              <p className="font-semibold">{t('bd.estimatedCost')} RM {(Math.ceil(newItem.quantity * (1 + newItem.wastePct / 100)) * newItem.unitPrice).toFixed(2)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => addItem.mutate()} disabled={!newItem.materialId || newItem.quantity <= 0 || addItem.isPending}>{t('common.add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('bd.deleteConfirm')}</AlertDialogTitle><AlertDialogDescription>{t('bd.deleteItemDesc')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteItemId && deleteItem.mutate(deleteItemId)} className="bg-destructive text-destructive-foreground">{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={saveVersionOpen} onOpenChange={setSaveVersionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('bd.versionSaveTitle')}</DialogTitle></DialogHeader>
          <div><Label>{t('bd.versionDesc')}</Label><Textarea value={versionDesc} onChange={e => setVersionDesc(e.target.value)} placeholder={t('bd.versionDescPlaceholder')} rows={3} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setSaveVersionOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => saveVersion.mutate()} disabled={saveVersion.isPending}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
