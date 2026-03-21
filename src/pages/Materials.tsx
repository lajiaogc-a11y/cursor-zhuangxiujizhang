import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMaterials, upsertMaterial, deleteMaterial, type Material } from '@/services/settings.service';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Package, Eye } from 'lucide-react';
import { MaterialPriceComparison } from '@/components/materials/MaterialPriceComparison';

// Material type imported from service

const CATEGORIES = ['板材', '五金', '油漆', '电工', '水管', '瓷砖', '石材', '木材', '胶水', '其他'];
const UNITS = ['个', '件', '米', '平方米', '公斤', '包', '桶', '箱', '套', '卷', '片', '块'];

export default function Materials() {
  const { hasPermission } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = hasPermission('feature.edit');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const [form, setForm] = useState({
    name: '', code: '', category: '其他', unit: '个',
    specification: '', brand: '', default_price: 0,
    currency: 'MYR', min_stock: 0, notes: '',
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['q_materials'],
    queryFn: fetchMaterials,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const { id, ...rest } = values;
      await upsertMaterial(rest, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_materials'] });
      setDialogOpen(false);
      setEditingMaterial(null);
      toast({ title: editingMaterial ? t('mat.materialUpdated') : t('mat.materialAdded') });
    },
    onError: (err: any) => toast({ title: t('mat.operationFailed'), description: err.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_materials'] });
      toast({ title: t('mat.materialDeleted') });
    },
    onError: (err: any) => toast({ title: t('mat.deleteFailed'), description: err.message, variant: 'destructive' }),
  });

  // deleteMut defined above

  const openAdd = () => {
    setEditingMaterial(null);
    setForm({ name: '', code: '', category: '其他', unit: '个', specification: '', brand: '', default_price: 0, currency: 'MYR', min_stock: 0, notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditingMaterial(m);
    setForm({
      name: m.name, code: m.code || '', category: m.category, unit: m.unit,
      specification: m.specification || '', brand: m.brand || '',
      default_price: m.default_price, currency: m.currency,
      min_stock: m.min_stock, notes: m.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: t('mat.enterName'), variant: 'destructive' });
      return;
    }
    upsertMutation.mutate({ ...form, id: editingMaterial?.id });
  };

  const filtered = materials.filter(m => {
    const matchSearch = !search || m.name.includes(search) || m.code?.includes(search) || m.brand?.includes(search);
    const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalCount = materials.length;
  const activeCount = materials.filter(m => m.is_active).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          {canEdit && (
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />{t('mat.addMaterial')}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">{t('mat.totalMaterials')}</p>
            <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">{t('mat.active')}</p>
            <p className="text-2xl font-bold text-primary">{activeCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">{t('mat.categoryCount')}</p>
            <p className="text-2xl font-bold text-foreground">{new Set(materials.map(m => m.category)).size}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">{t('mat.brandCount')}</p>
            <p className="text-2xl font-bold text-foreground">{new Set(materials.filter(m => m.brand).map(m => m.brand)).size}</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('mat.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('mat.allCategories')}</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('mat.name')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('mat.code')}</TableHead>
                  <TableHead>{t('mat.category')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('mat.specification')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('mat.brand')}</TableHead>
                  <TableHead>{t('mat.unit')}</TableHead>
                  <TableHead className="text-right">{t('mat.defaultPrice')}</TableHead>
                  <TableHead className="text-center">{t('common.status')}</TableHead>
                  {canEdit && <TableHead className="text-center">{t('common.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('mat.noMaterials')}</TableCell></TableRow>
                ) : filtered.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{m.code || '-'}</TableCell>
                    <TableCell><Badge variant="secondary">{m.category}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{m.specification || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.brand || '-'}</TableCell>
                    <TableCell>{m.unit}</TableCell>
                    <TableCell className="text-right">{m.currency} {m.default_price.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={m.is_active ? 'default' : 'outline'}>{m.is_active ? t('mat.enabled') : t('mat.disabled')}</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedMaterial(m); setPriceDialogOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm(t('mat.confirmDeleteMaterial'))) deleteMut.mutate(m.id); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? t('mat.editMaterial') : t('mat.addMaterial')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('mat.materialName')}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>{t('mat.code')}</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder={t('mat.optional')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('mat.category')}</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('mat.unit')}</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('mat.specification')}</Label><Input value={form.specification} onChange={e => setForm(f => ({ ...f, specification: e.target.value }))} placeholder={t('mat.specPlaceholder')} /></div>
              <div><Label>{t('mat.brand')}</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>{t('mat.defaultPrice')}</Label><Input type="number" value={form.default_price} onChange={e => setForm(f => ({ ...f, default_price: Number(e.target.value) }))} /></div>
              <div><Label>{t('mat.currency')}</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYR">MYR</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('mat.minStock')}</Label><Input type="number" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>{t('mat.remark')}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? t('mat.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price Comparison Dialog */}
      {selectedMaterial && (
        <MaterialPriceComparison
          material={selectedMaterial}
          open={priceDialogOpen}
          onOpenChange={setPriceDialogOpen}
        />
      )}
    </MainLayout>
  );
}