import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { FolderTree, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/lib/tenant';
import { useIsMobile } from '@/hooks/use-mobile';
import * as qService from '@/services/quotation.service';

interface Category {
  id: string;
  code: string;
  name_zh: string;
  name_en: string;
  parent_id: string | null;
  sort_order: number;
  is_system: boolean;
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { tenant } = useTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Category>>({});
  const [search, setSearch] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['q_product_categories'],
    queryFn: () => qService.fetchProductCategories() as Promise<Category[]>,
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: (cat: Partial<Category>) => qService.saveProductCategory(cat, tenant?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_product_categories'] });
      toast({ title: t('cat.saved') });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: t('mat.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => qService.deleteProductCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_product_categories'] });
      toast({ title: t('cat.deleted') });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: t('mat.deleteFailed'), description: e.message, variant: 'destructive' }),
  });

  const topLevel = categories.filter(c => !c.parent_id);

  const filtered = categories.filter(c =>
    c.code.includes(search) || c.name_zh.includes(search) || (c.name_en || '').toLowerCase().includes(search.toLowerCase())
  );

  const getParentName = (parentId: string | null) => {
    if (!parentId) return '-';
    const parent = categories.find(c => c.id === parentId);
    return parent ? `${parent.name_zh} (${parent.code})` : '-';
  };

  const renderMobileCards = () => (
    <div className="space-y-3">
      {filtered.map(c => (
        <div key={c.id} className="border rounded-lg p-3 bg-card">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px] shrink-0">{c.code}</Badge>
                <span className="font-medium text-sm truncate">{c.name_zh}</span>
                {c.is_system && <Badge variant="secondary" className="text-[10px] shrink-0">{t('cat.system')}</Badge>}
              </div>
              {c.name_en && <p className="text-xs text-muted-foreground mt-1">{c.name_en}</p>}
              {c.parent_id && <p className="text-xs text-muted-foreground mt-1">{t('cat.parentCategory')}: {getParentName(c.parent_id)}</p>}
            </div>
            <div className="flex gap-1 ml-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setDialogOpen(true); }}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {!c.is_system && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTable = () => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">{t('mat.code')}</TableHead>
            <TableHead>{t('cat.zhName')}</TableHead>
            <TableHead>{t('cat.enName')}</TableHead>
            <TableHead>{t('cat.parentCategory')}</TableHead>
            <TableHead className="w-16">{t('cat.sortOrder')}</TableHead>
            <TableHead className="w-24">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(c => (
            <TableRow key={c.id}>
              <TableCell><Badge variant="outline" className="font-mono text-[10px]">{c.code}</Badge></TableCell>
              <TableCell className="font-medium text-sm">{c.name_zh}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.name_en || '-'}</TableCell>
              <TableCell className="text-sm">{getParentName(c.parent_id)}</TableCell>
              <TableCell className="text-sm">{c.sort_order}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setDialogOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {!c.is_system && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MobilePageShell title={t('cat.title')} titleEn={t('cat.titleEn')} icon={<FolderTree className="w-5 h-5" />} backTo="/quotation"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => { setEditing({ sort_order: categories.length }); setDialogOpen(true); }}><Plus className="w-4 h-4" /> {t('common.add')}</Button>}>
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search')} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('cat.noCategories')}</p>
          </div>
        ) : isMobile ? renderMobileCards() : renderTable()}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? t('cat.editCategory') : t('cat.addCategory')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('mat.code')} Code</Label><Input value={editing.code || ''} onChange={e => setEditing({ ...editing, code: e.target.value })} placeholder={t('cat.codePlaceholder')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cat.zhName')}</Label><Input value={editing.name_zh || ''} onChange={e => setEditing({ ...editing, name_zh: e.target.value })} /></div>
              <div><Label>{t('cat.enName')}</Label><Input value={editing.name_en || ''} onChange={e => setEditing({ ...editing, name_en: e.target.value })} /></div>
            </div>
            <div><Label>{t('cat.parentCategory')}</Label>
              <Select value={editing.parent_id || '_none'} onValueChange={v => setEditing({ ...editing, parent_id: v === '_none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder={t('cat.noParent')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('cat.noParent')}</SelectItem>
                  {topLevel.filter(c => c.id !== editing.id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name_zh} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t('cat.sortOrder')}</Label><Input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => save.mutate(editing)} disabled={!editing.code || !editing.name_zh || save.isPending}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('cat.deleteDesc')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && del.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
