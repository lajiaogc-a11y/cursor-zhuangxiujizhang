import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMeasurementUnits } from '@/services/quotation.service';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useProductCategories } from '@/hooks/useProductCategories';
import { Package, Plus, Pencil, Trash2, Search, Download, Upload, FileSpreadsheet, Building2, User, Lock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useResponsive } from '@/hooks/useResponsive';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQProducts } from '@/hooks/useQProducts';
import { useToast } from '@/hooks/use-toast';
import { PRICE_TIER_LABELS, type Product } from '@/types/quotation';
import { useI18n } from '@/lib/i18n';
import { useSystemCurrency, CURRENCY_OPTIONS } from '@/hooks/useSystemCurrency';
import { useAuth } from '@/lib/auth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as XLSX from 'xlsx';

interface MeasurementUnit {
  id: string;
  code: string;
  name_zh: string;
  name_en: string;
}

type ProductTab = 'company' | 'my';

const emptyProduct = (isCompany: boolean): Omit<Product, 'id'> => ({
  nameZh: '', nameEn: '', unit: 'unit', unitPrice: 0,
  priceNormal: undefined, priceMedium: undefined, priceAdvanced: undefined,
  category: '', description: '', descriptionEn: '', isCompanyProduct: isCompany,
});

export default function ProductsPage() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useQProducts();
  const { categories } = useProductCategories();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const { user, userRole } = useAuth();
  const { systemCurrency } = useSystemCurrency();
  const { isMobile, isTablet } = useResponsive();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<ProductTab>('company');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<(Omit<Product, 'id'> & { id?: string }) | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === 'admin';

  const { data: measurementUnits = [] } = useQuery({
    queryKey: ['q_measurement_units'],
    queryFn: () => fetchMeasurementUnits() as Promise<MeasurementUnit[]>,
    enabled: !!user,
  });

  const getUnitLabel = (code: string) => {
    const unit = measurementUnits.find(u => u.code === code);
    if (!unit) return code;
    return language === 'zh' ? unit.name_zh : unit.name_en;
  };

  const getCategoryName = (code: string) => {
    const cat = categories.find(c => c.code === code);
    if (!cat) return code;
    return language === 'zh' ? cat.name_zh : cat.name_en;
  };

  const currencySymbol = CURRENCY_OPTIONS.find(c => c.value === systemCurrency)?.symbol || 'RM';

  const companyProducts = useMemo(() => products.filter(p => p.isCompanyProduct), [products]);
  const myProducts = useMemo(() => products.filter(p => !p.isCompanyProduct && p.createdBy === user?.id), [products, user]);

  const currentProducts = activeTab === 'company' ? companyProducts : myProducts;

  const filtered = currentProducts.filter(p => {
    const matchesSearch = p.nameZh.includes(search) || p.nameEn.toLowerCase().includes(search.toLowerCase()) || (p.category || '').includes(search);
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from current products for filter
  const availableCategories = useMemo(() => {
    const cats = new Set(currentProducts.map(p => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [currentProducts]);

  const canEdit = activeTab === 'company' ? isAdmin : true;

  const openAdd = () => {
    const isCompany = activeTab === 'company' && isAdmin;
    setEditingProduct(emptyProduct(isCompany));
    setDialogOpen(true);
  };
  const openEdit = (p: Product) => { setEditingProduct({ ...p }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editingProduct) return;
    const { id, ...data } = editingProduct as any;
    // Auto-set unitPrice from priceNormal since default price field was removed
    data.unitPrice = data.priceNormal ?? data.unitPrice ?? 0;
    if (id) {
      await updateProduct.mutateAsync({ id, ...data });
    } else {
      await addProduct.mutateAsync(data);
    }
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async () => {
    if (deleteId) await deleteProduct.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const setField = (key: string, value: any) =>
    setEditingProduct(prev => prev ? { ...prev, [key]: value } : prev);

  // --- Excel export/import ---
  const handleExport = () => {
    if (currentProducts.length === 0) {
      toast({ title: t('qp.noExportData'), variant: 'destructive' });
      return;
    }
    const header = [t('qp.excelNameZh'), t('qp.excelNameEn'), t('qp.excelUnit'), t('qp.excelDefaultPrice'), t('qp.excelPriceNormal'), t('qp.excelPriceMedium'), t('qp.excelPriceAdvanced'), t('qp.excelCategory'), t('qp.excelDesc'), t('qp.excelDescEn')];
    const rows = currentProducts.map(p => [
      p.nameZh, p.nameEn || '', p.unit, p.unitPrice,
      p.priceNormal ?? '', p.priceMedium ?? '', p.priceAdvanced ?? '',
      p.category || '', p.description || '', p.descriptionEn || '',
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, t('qp.excelSheetProducts'));

    const templateNote = [
      [t('qp.excelTemplateTitle')],
      [t('qp.excelColumn'), t('qp.excelColumnDesc'), t('qp.excelRequired')],
      [t('qp.excelNameZh'), t('qp.descProductNameZh'), t('qp.excelYes')],
      [t('qp.excelNameEn'), t('qp.descProductNameEn'), t('qp.excelNo')],
      [t('qp.excelUnit'), measurementUnits.map(u => u.code).join(', '), `${t('qp.excelNo')}(${t('qp.descDefaultUnit')})`],
      [t('qp.excelDefaultPrice'), t('qp.descDefaultPrice'), `${t('qp.excelNo')}(${t('qp.descDefault0')})`],
      [t('qp.excelPriceNormal'), t('qp.descNormalPrice'), t('qp.excelNo')],
      [t('qp.excelPriceMedium'), t('qp.descMediumPrice'), t('qp.excelNo')],
      [t('qp.excelPriceAdvanced'), t('qp.descAdvancedPrice'), t('qp.excelNo')],
      [t('qp.excelCategory'), t('qp.descCategoryCode'), t('qp.excelNo')],
      [t('qp.excelDesc'), t('qp.descChineseDesc'), t('qp.excelNo')],
      [t('qp.excelDescEn'), t('qp.descEnglishDesc'), t('qp.excelNo')],
    ];
    const wsTemplate = XLSX.utils.aoa_to_sheet(templateNote);
    wsTemplate['!cols'] = [{ wch: 15 }, { wch: 55 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsTemplate, t('qp.excelSheetTemplate'));

    XLSX.writeFile(wb, `${t('qp.excelSheetProducts')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: t('qp.exported').replace('{count}', String(currentProducts.length)) });
  };

  const handleDownloadTemplate = () => {
    const header = [t('qp.excelNameZh'), t('qp.excelNameEn'), t('qp.excelUnit'), t('qp.excelDefaultPrice'), t('qp.excelPriceNormal'), t('qp.excelPriceMedium'), t('qp.excelPriceAdvanced'), t('qp.excelCategory'), t('qp.excelDesc'), t('qp.excelDescEn')];
    const example = ['电视柜', 'TV Cabinet', 'unit', '1500', '1200', '1500', '1800', 'A', '定制电视柜', 'Custom TV Cabinet'];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, example]);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, t('qp.excelSheetProducts'));
    XLSX.writeFile(wb, `${t('qp.importTemplateName')}.xlsx`);
    toast({ title: t('qp.templateDownloaded') });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) {
        toast({ title: t('qp.emptyFileError'), variant: 'destructive' });
        return;
      }

      const dataRows = rows.slice(1).filter(row => row[0] && String(row[0]).trim());
      if (dataRows.length === 0) {
        toast({ title: t('qp.noValidRows'), variant: 'destructive' });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const validUnitCodes = measurementUnits.map(u => u.code);
      const isCompany = activeTab === 'company' && isAdmin;

      for (const row of dataRows) {
        try {
          const nameZh = String(row[0] || '').trim();
          if (!nameZh) continue;

          const product: Omit<Product, 'id'> = {
            nameZh,
            nameEn: String(row[1] || '').trim(),
            unit: String(row[2] || 'unit').trim(),
            unitPrice: Number(row[3]) || 0,
            priceNormal: row[4] !== '' && row[4] != null ? Number(row[4]) : undefined,
            priceMedium: row[5] !== '' && row[5] != null ? Number(row[5]) : undefined,
            priceAdvanced: row[6] !== '' && row[6] != null ? Number(row[6]) : undefined,
            category: String(row[7] || '').trim(),
            description: String(row[8] || '').trim(),
            descriptionEn: String(row[9] || '').trim(),
            isCompanyProduct: isCompany,
          };

          if (!validUnitCodes.includes(product.unit)) product.unit = 'unit';

          await addProduct.mutateAsync(product);
          successCount++;
        } catch {
          errorCount++;
        }
      }
      toast({ title: t('qp.importSuccessFail').replace('{success}', String(successCount)).replace('{fail}', String(errorCount)) });
    } catch {
      toast({ title: t('qp.importFailed'), variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderActions = (p: Product) => {
    if (!canEdit) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-1.5"><Lock className="w-3.5 h-3.5 text-muted-foreground/40" /></div>
          </TooltipTrigger>
          <TooltipContent><p>{t('qp.noEditPermission')}</p></TooltipContent>
        </Tooltip>
      );
    }
    return (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 active:scale-95 transition-transform" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive active:scale-95 transition-transform" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    );
  };

  return (
    <MobilePageShell title={t('quotation.products')} icon={<Package className="w-5 h-5" />} backTo="/quotation">
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('company')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'company'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('qp.companyProducts')}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] min-w-[20px] justify-center">{companyProducts.length}</Badge>
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'my'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t('qp.myProducts')}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] min-w-[20px] justify-center">{myProducts.length}</Badge>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('qp.searchProducts')} className="pl-9" />
            </div>
            {availableCategories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] sm:w-[180px]">
                  <Filter className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  <SelectValue placeholder={t('qp.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('qp.allCategories') || '全部分类'}</SelectItem>
                  {availableCategories.map(code => (
                    <SelectItem key={code} value={code!}>{getCategoryName(code!)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            {canEdit && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><FileSpreadsheet className="w-4 h-4 mr-1" />Excel</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExport}><Download className="w-4 h-4 mr-2" />{t('qp.exportProducts')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />{t('qp.importFromExcel')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadTemplate}><FileSpreadsheet className="w-4 h-4 mr-2" />{t('qp.downloadTemplate')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />{t('qp.addProduct')}</Button>
              </>
            )}
            {!canEdit && activeTab === 'company' && (
              <Button size="sm" variant="outline" disabled>
                <Lock className="w-3.5 h-3.5 mr-1" />{t('qp.noEditPermission')}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{search || categoryFilter !== 'all' ? t('qp.noMatch') : t('qp.noProducts')}</p>
          </div>
        ) : isMobile ? (
          /* ── Mobile: Compact Card Layout ── */
          <div className="space-y-2">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-card px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-primary">{p.category ? getCategoryName(p.category).charAt(0) : '?'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate leading-tight">{p.nameZh}</p>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                      {p.nameEn || p.description || '\u00A0'}
                    </p>
                  </div>
                  <span className="text-[18px] font-bold text-amber-400 shrink-0 tabular-nums">
                    {currencySymbol}{(p.priceNormal ?? p.unitPrice).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] h-5 rounded-md px-1.5">
                      {getUnitLabel(p.unit)}
                    </Badge>
                    {p.category && (
                      <Badge variant="secondary" className="text-[10px] h-5 rounded-md px-1.5">
                        {getCategoryName(p.category)}
                      </Badge>
                    )}
                  </div>
                  {canEdit ? (
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 active:scale-95 transition-transform" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive active:scale-95 transition-transform" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : isTablet ? (
          /* ── Tablet ── */
          <div className="border rounded-lg overflow-hidden">
            <Table compact>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>{t('qp.nameZh')}</TableHead>
                  <TableHead>{t('qp.nameEn')}</TableHead>
                  <TableHead className="w-20">{t('qp.unit')}</TableHead>
                  <TableHead className="w-28">{t('qp.category')}</TableHead>
                  <TableHead className="w-28 text-right">{t('qp.normal')}</TableHead>
                  <TableHead className="w-24">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p, idx) => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-sm">{p.nameZh}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.nameEn || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{getUnitLabel(p.unit)}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.category ? <span className="text-sm">{getCategoryName(p.category)}</span> : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-400">
                      {currencySymbol}{(p.priceNormal ?? p.unitPrice).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 active:scale-95 transition-transform" onClick={() => openEdit(p)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive active:scale-95 transition-transform" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* ── Desktop: Full table ── */
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('qp.nameZh')}</TableHead>
                  <TableHead>{t('qp.nameEn')}</TableHead>
                  <TableHead>{t('qp.unit')}</TableHead>
                  <TableHead>{t('qp.category')}</TableHead>
                  <TableHead className="text-right">{t('qp.normal')}</TableHead>
                  <TableHead className="text-right">{t('qp.medium')}</TableHead>
                  <TableHead className="text-right">{t('qp.advanced')}</TableHead>
                  <TableHead className="w-24">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.nameZh}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.nameEn || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{getUnitLabel(p.unit)}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.category ? <span className="text-sm">{getCategoryName(p.category)}</span> : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.priceNormal != null ? `${currencySymbol}${p.priceNormal.toFixed(2)}` : `${currencySymbol}${p.unitPrice.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.priceMedium != null ? `${currencySymbol}${p.priceMedium.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.priceAdvanced != null ? `${currencySymbol}${p.priceAdvanced.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>{renderActions(p)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct && 'id' in editingProduct && editingProduct.id ? t('qp.editProduct') : t('qp.addProduct')}</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('qp.nameZh')} *</Label>
                  <Input value={editingProduct.nameZh} onChange={e => setField('nameZh', e.target.value)} />
                </div>
                <div>
                  <Label>{t('qp.nameEn')}</Label>
                  <Input value={editingProduct.nameEn} onChange={e => setField('nameEn', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('qp.unit')}</Label>
                  <Select value={editingProduct.unit} onValueChange={v => setField('unit', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {measurementUnits.map(u => (
                        <SelectItem key={u.id} value={u.code}>{u.name_zh} ({u.name_en})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('qp.category')}</Label>
                  <Select value={editingProduct.category || ''} onValueChange={v => setField('category', v)}>
                    <SelectTrigger><SelectValue placeholder={t('qp.selectCategory')} /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.code}>{c.name_zh} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>{t('qp.priceNormal')}</Label>
                  <Input type="number" value={editingProduct.priceNormal ?? ''} onChange={e => setField('priceNormal', e.target.value ? Number(e.target.value) : undefined)} />
                </div>
                <div>
                  <Label>{t('qp.priceMedium')}</Label>
                  <Input type="number" value={editingProduct.priceMedium ?? ''} onChange={e => setField('priceMedium', e.target.value ? Number(e.target.value) : undefined)} />
                </div>
                <div>
                  <Label>{t('qp.priceAdvanced')}</Label>
                  <Input type="number" value={editingProduct.priceAdvanced ?? ''} onChange={e => setField('priceAdvanced', e.target.value ? Number(e.target.value) : undefined)} />
                </div>
              </div>
              <div>
                <Label>{t('qp.descZh')}</Label>
                <Input value={editingProduct.description || ''} onChange={e => setField('description', e.target.value)} />
              </div>
              <div>
                <Label>{t('qp.descEn')}</Label>
                <Input value={editingProduct.descriptionEn || ''} onChange={e => setField('descriptionEn', e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!editingProduct?.nameZh || addProduct.isPending || updateProduct.isPending}>
              {addProduct.isPending || updateProduct.isPending ? t('qp.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('qp.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('qp.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
