import { useState, useMemo } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Package, Plus, Trash2, Search, Pencil, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

interface GroupedCategory {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  parentName: string;
  methods: { mappingId: string; methodCode: string; methodName: string }[];
}

export default function CategoryMappingPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [selectedMethodIds, setSelectedMethodIds] = useState<Set<string>>(new Set());

  const { data: mappings = [], isLoading: loadingMappings } = useQuery({
    queryKey: ['q_category_method_mapping', tenantId],
    queryFn: () => costService.fetchCategoryMethodMappings(tenantId!),
    enabled: !!user && !!tenantId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['q_product_categories_select'],
    queryFn: () => costService.fetchProductCategories(),
    enabled: !!user,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ['q_methods_select'],
    queryFn: () => costService.fetchMethodsSelect(),
    enabled: !!user,
  });

  // Build parent name lookup
  const parentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c: any) => map.set(c.id, c.name_zh || ''));
    return map;
  }, [categories]);

  // Group mappings by category
  const grouped: GroupedCategory[] = useMemo(() => {
    const map = new Map<string, GroupedCategory>();
    // Initialize all categories
    categories.forEach((c: any) => {
      const parentName = c.parent_id ? (parentNameMap.get(c.parent_id) || '') : '';
      map.set(c.id, {
        categoryId: c.id,
        categoryCode: c.code || '',
        categoryName: c.name_zh || '',
        parentName,
        methods: [],
      });
    });
    // Fill in mapped methods
    mappings.forEach((m: any) => {
      const g = map.get(m.category_id);
      if (g) {
        g.methods.push({
          mappingId: m.id,
          methodCode: m.q_methods?.method_code || '',
          methodName: m.q_methods?.name_zh || '',
        });
      }
    });
    return Array.from(map.values());
  }, [mappings, categories, parentNameMap]);

  const filtered = grouped.filter(g =>
    g.categoryName.toLowerCase().includes(search.toLowerCase()) ||
    g.categoryCode.toLowerCase().includes(search.toLowerCase()) ||
    g.parentName.toLowerCase().includes(search.toLowerCase()) ||
    g.methods.some(m => m.methodName.includes(search) || m.methodCode.includes(search))
  );

  const configuredCount = grouped.filter(g => g.methods.length > 0).length;

  // Save: sync multi-method selection for a category
  const saveMethods = useMutation({
    mutationFn: async ({ categoryId, methodIds }: { categoryId: string; methodIds: string[] }) =>
      costService.saveCategoryMethods(categoryId, methodIds, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_category_method_mapping'] });
      toast({ title: t('cost.saved') });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: t('cost.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const deleteAllMappings = useMutation({
    mutationFn: (categoryId: string) => costService.deleteCategoryMappings(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_category_method_mapping'] });
      toast({ title: t('cost.deleted') });
      setDeleteCategoryId(null);
    },
  });

  const openEdit = (g: GroupedCategory) => {
    setEditingCategoryId(g.categoryId);
    const existing = mappings
      .filter((m: any) => m.category_id === g.categoryId)
      .map((m: any) => m.method_id as string);
    setSelectedMethodIds(new Set(existing));
    setDialogOpen(true);
  };

  const toggleMethod = (id: string) => {
    setSelectedMethodIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const editingCategory = categories.find((c: any) => c.id === editingCategoryId);

  const desktopTable = (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="w-20">{t('cost.code')}</TableHead>
            <TableHead>{t('cost.mainCategory')}</TableHead>
            <TableHead>{t('cost.subCategory')}</TableHead>
            <TableHead>{t('cost.mappedMethods')}</TableHead>
            <TableHead className="w-28">{t('cost.status')}</TableHead>
            <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((g, idx) => (
            <TableRow key={g.categoryId}>
              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{g.categoryCode || '-'}</Badge></TableCell>
              <TableCell className="font-medium">{g.parentName || g.categoryName}</TableCell>
              <TableCell className="text-muted-foreground">{g.parentName ? g.categoryName : '-'}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {g.methods.length === 0 ? (
                    <span className="text-xs text-muted-foreground">-</span>
                  ) : g.methods.map(m => (
                    <Badge key={m.mappingId} variant="secondary" className="text-[10px]">
                      {m.methodCode} - {m.methodName}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {g.methods.length > 0 ? (
                  <Badge className="text-[10px] bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                    {t('cost.bound')} {g.methods.length}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {t('cost.unconfigured')}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}><Pencil className="w-3.5 h-3.5" /></Button>
                  {g.methods.length > 0 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCategoryId(g.categoryId)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const mobileCards = (
    <div className="space-y-2">
      {filtered.map(g => (
        <Card key={g.categoryId}>
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="text-[10px]">{g.categoryCode || '-'}</Badge>
                  <span className="font-medium text-sm">{g.parentName || g.categoryName}</span>
                </div>
                {g.parentName && <p className="text-xs text-muted-foreground mt-0.5">{g.categoryName}</p>}
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}><Pencil className="w-3.5 h-3.5" /></Button>
                {g.methods.length > 0 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteCategoryId(g.categoryId)}><Trash2 className="w-3.5 h-3.5" /></Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {g.methods.length === 0 ? (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">{t('cost.unconfigured')}</Badge>
              ) : g.methods.map(m => (
                <Badge key={m.mappingId} variant="secondary" className="text-[10px]">{m.methodCode} - {m.methodName}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <MobilePageShell title={t('cost.categoryMapping')} icon={<Package className="w-5 h-5" />} backTo="/cost">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="stat-card-v2"><div className="flex items-center gap-3"><Package className="w-8 h-8 text-primary/20" /><div><p className="text-xl font-bold">{categories.length}</p><p className="text-xs text-muted-foreground">{t('cost.categoryCount')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><Link2 className="w-8 h-8 text-primary/20" /><div><p className="text-xl font-bold">{configuredCount}</p><p className="text-xs text-muted-foreground">{t('cost.configuredCount')}</p></div></div></div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('cost.searchCategoryMethod')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loadingMappings ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
        : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('cost.noCategoryMappings')}</p>
          </div>
        ) : <ResponsiveTable mobileView={mobileCards} desktopView={desktopTable} />}
      </div>

      {/* Multi-method selection dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? `[${editingCategory.code}] ${editingCategory.name_zh}` : t('cost.editCategoryMapping')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">{t('cost.selectMethods')}</Label>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {methods.map((m: any) => (
                <label key={m.id} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={selectedMethodIds.has(m.id)}
                    onCheckedChange={() => toggleMethod(m.id)}
                  />
                  <div>
                    <p className="text-sm font-medium">{m.name_zh}</p>
                    <p className="text-[10px] text-muted-foreground">{m.method_code}</p>
                  </div>
                </label>
              ))}
            </ScrollArea>
            <p className="text-xs text-muted-foreground">{t('cost.selectedCount').replace('{count}', String(selectedMethodIds.size))}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => editingCategoryId && saveMethods.mutate({ categoryId: editingCategoryId, methodIds: Array.from(selectedMethodIds) })}
              disabled={saveMethods.isPending}
            >{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('cost.deleteAllMappingsHint')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteCategoryId && deleteAllMappings.mutate(deleteCategoryId)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
