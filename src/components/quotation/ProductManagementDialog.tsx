import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Check, Search, Building2, User, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQProducts } from '@/hooks/useQProducts';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useQuery } from '@tanstack/react-query';
import { fetchMeasurementUnits } from '@/services/quotation.service';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Product } from '@/types/quotation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProductTab = 'company' | 'my';

const emptyProduct = (isCompany: boolean): Omit<Product, 'id'> => ({
  nameZh: '', nameEn: '', unit: 'unit', unitPrice: 0,
  priceNormal: undefined, priceMedium: undefined, priceAdvanced: undefined,
  category: '', description: '', descriptionEn: '', isCompanyProduct: isCompany,
});

export function ProductManagementDialog({ open, onOpenChange }: Props) {
  const { products, addProduct, updateProduct, deleteProduct } = useQProducts();
  const { categories } = useProductCategories();
  const { user, userRole } = useAuth();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ProductTab>('company');

  const isAdmin = userRole === 'admin';

  const { data: measurementUnits = [] } = useQuery({
    queryKey: ['q_measurement_units'],
    queryFn: fetchMeasurementUnits,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const unitMap = React.useMemo(() => {
    const map: Record<string, { zh: string; en: string }> = {};
    measurementUnits.forEach(u => { map[u.code] = { zh: u.name_zh, en: u.name_en }; });
    return map;
  }, [measurementUnits]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<Product, 'id'>>(emptyProduct(true));

  const companyProducts = useMemo(() => products.filter(p => p.isCompanyProduct), [products]);
  const myProducts = useMemo(() => products.filter(p => !p.isCompanyProduct && p.createdBy === user?.id), [products, user]);
  const currentProducts = activeTab === 'company' ? companyProducts : myProducts;
  const canEdit = activeTab === 'company' ? isAdmin : true;

  const filtered = currentProducts.filter(p =>
    p.nameZh.toLowerCase().includes(search.toLowerCase()) || (p.nameEn || '').toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (p: Product) => {
    if (!canEdit) return;
    setEditingId(p.id);
    setIsAdding(false);
    setForm({ nameZh: p.nameZh, nameEn: p.nameEn, unit: p.unit, unitPrice: p.unitPrice, priceNormal: p.priceNormal, priceMedium: p.priceMedium, priceAdvanced: p.priceAdvanced, category: p.category, description: p.description, descriptionEn: p.descriptionEn, isCompanyProduct: p.isCompanyProduct });
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    const isCompany = activeTab === 'company' && isAdmin;
    setForm(emptyProduct(isCompany));
  };

  const cancel = () => { setIsAdding(false); setEditingId(null); };

  const handleSave = async () => {
    if (!form.nameZh.trim()) return;
    const saveForm = { ...form, unitPrice: form.priceNormal ?? form.unitPrice ?? 0 };
    if (editingId) {
      await updateProduct.mutateAsync({ id: editingId, ...saveForm });
    } else {
      await addProduct.mutateAsync(saveForm);
    }
    cancel();
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('qp.confirmDelete'))) await deleteProduct.mutateAsync(id);
  };

  const updateField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const renderForm = () => (
    <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border border-border">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">{t('qp.nameZh')} *</Label><Input value={form.nameZh} onChange={e => updateField('nameZh', e.target.value)} className="h-8 text-sm mt-1" /></div>
        <div><Label className="text-xs">{t('qp.nameEn')}</Label><Input value={form.nameEn} onChange={e => updateField('nameEn', e.target.value)} className="h-8 text-sm mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{t('qp.unit')}</Label>
          <Select value={form.unit} onValueChange={v => updateField('unit', v)}>
            <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {measurementUnits.map(u => (
                <SelectItem key={u.code} value={u.code}>{u.name_zh} ({u.name_en})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t('qp.category')}</Label>
          <Select value={form.category || ''} onValueChange={v => updateField('category', v)}>
            <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder={t('qp.selectCategory')} /></SelectTrigger>
            <SelectContent>
              {categories.map(c => (<SelectItem key={c.code} value={c.code}>{c.code}. {c.name_zh}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label className="text-xs">{t('qp.normal')}</Label><Input type="number" min="0" value={form.priceNormal ?? ''} onChange={e => updateField('priceNormal', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-8 text-sm mt-1" placeholder="--" /></div>
        <div><Label className="text-xs">{t('qp.medium')}</Label><Input type="number" min="0" value={form.priceMedium ?? ''} onChange={e => updateField('priceMedium', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-8 text-sm mt-1" placeholder="--" /></div>
        <div><Label className="text-xs">{t('qp.advanced')}</Label><Input type="number" min="0" value={form.priceAdvanced ?? ''} onChange={e => updateField('priceAdvanced', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-8 text-sm mt-1" placeholder="--" /></div>
      </div>
      <div><Label className="text-xs">{t('qp.description')}</Label><Textarea value={form.description || ''} onChange={e => updateField('description', e.target.value)} className="text-sm mt-1 min-h-[50px]" /></div>
      <div><Label className="text-xs">Materials Description (EN)</Label><Textarea value={form.descriptionEn || ''} onChange={e => updateField('descriptionEn', e.target.value)} className="text-sm mt-1 min-h-[50px]" /></div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={cancel} className="h-7 text-xs"><X className="w-3 h-3 mr-1" />{t('common.cancel')}</Button>
        <Button size="sm" onClick={handleSave} disabled={!form.nameZh.trim()} className="h-7 text-xs"><Check className="w-3 h-3 mr-1" />{editingId ? t('common.save') : t('qp.addProduct')}</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('qp.productCatalog')}</span>
            {canEdit && (
              <Button size="sm" onClick={startAdd} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />{t('qp.addProduct')}</Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
          <button
            onClick={() => { setActiveTab('company'); cancel(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'company'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            {t('qp.companyProducts')}
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">{companyProducts.length}</Badge>
          </button>
          <button
            onClick={() => { setActiveTab('my'); cancel(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'my'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {t('qp.myProducts')}
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">{myProducts.length}</Badge>
          </button>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('qp.searchProducts')} className="pl-9 h-8 text-sm" />
        </div>
        {isAdding && renderForm()}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1">
            {filtered.map(p => (
              <div key={p.id}>
                {editingId === p.id ? renderForm() : (
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{p.nameZh}</span>
                        {p.nameEn && <span className="text-xs text-muted-foreground truncate">{p.nameEn}</span>}
                        {p.category && <Badge variant="outline" className="text-[10px] font-mono">{p.category}</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{unitMap[p.unit]?.zh || p.unit}</span>
                        {p.priceNormal != null && <span className="text-primary font-medium">{t('qp.normal')}:{p.priceNormal}</span>}
                        {p.priceMedium != null && <span>{t('qp.medium')}:{p.priceMedium}</span>}
                        {p.priceAdvanced != null && <span>{t('qp.advanced')}:{p.priceAdvanced}</span>}
                      </div>
                      {p.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-1.5"><Lock className="w-3.5 h-3.5 text-muted-foreground/40" /></div>
                          </TooltipTrigger>
                          <TooltipContent><p>{t('qp.noEditPermission')}</p></TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">{t('qp.noProducts')}</p>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
