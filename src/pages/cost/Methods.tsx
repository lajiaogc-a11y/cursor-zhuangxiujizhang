import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Wrench, Plus, Pencil, Trash2, Search, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { MethodMaterialsDialog } from '@/components/cost/MethodMaterialsDialog';

interface Method {
  id: string; methodCode: string; nameZh: string; nameEn: string; categoryId: string; defaultWastePct: number; description: string;
}

export default function MethodsPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>({});
  const [materialMethodId, setMaterialMethodId] = useState<string | null>(null);

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['q_methods', tenantId],
    queryFn: () => costService.fetchMethods(tenantId!),
    enabled: !!user && !!tenantId,
  });

  const filtered = methods.filter(m =>
    m.nameZh.includes(search) || m.nameEn.toLowerCase().includes(search.toLowerCase()) || m.methodCode.includes(search)
  );

  const save = useMutation({
    mutationFn: async (m: any) => costService.saveMethod(m, user?.id, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_methods', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_methods_select', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_methods_bd_select', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_methods_with_materials_count', tenantId] });
      toast({ title: t('cost.methodSaved') }); setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: t('cost.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => costService.deactivateMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_methods', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_methods_select', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_methods_bd_select', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_methods_with_materials_count', tenantId] });
      toast({ title: t('cost.methodDeleted') }); setDeleteId(null);
    },
  });

  const openAdd = () => { setEditing({ methodCode: '', nameZh: '', nameEn: '', categoryId: '', defaultWastePct: 5, description: '' }); setDialogOpen(true); };

  const desktopTable = (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>{t('cost.methodCode')}</TableHead>
            <TableHead>{t('cost.nameZh')}</TableHead>
            <TableHead>{t('cost.nameEn')}</TableHead>
            <TableHead>{t('cost.wastePct')}</TableHead>
             <TableHead>{t('cost.description')}</TableHead>
             <TableHead>{t('cost.materialMappings')}</TableHead>
             <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((m, idx) => (
            <TableRow key={m.id}>
              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
              <TableCell><Badge variant="outline">{m.methodCode || '-'}</Badge></TableCell>
              <TableCell className="font-medium">{m.nameZh}</TableCell>
              <TableCell className="text-muted-foreground">{m.nameEn || '-'}</TableCell>
              <TableCell>{m.defaultWastePct}%</TableCell>
               <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{m.description || '-'}</TableCell>
               <TableCell>
                 <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setMaterialMethodId(m.id); }}>
                   <Link2 className="w-3 h-3" /> {t('cost.viewMaterials')}
                 </Button>
               </TableCell>
               <TableCell className="text-right">
                 <div className="flex justify-end gap-1">
                   <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(m); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                   <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
      {filtered.map(m => (
        <Card key={m.id}>
          <CardContent className="p-3 flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{m.nameZh}</p>
              {m.nameEn && <p className="text-xs text-muted-foreground">{m.nameEn}</p>}
              <div className="flex gap-2 mt-1 flex-wrap">
                {m.methodCode && <Badge variant="outline" className="text-[10px]">{m.methodCode}</Badge>}
                <span className="text-[10px] text-muted-foreground">{t('cost.wastePct')}: {m.defaultWastePct}%</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 mt-1 px-1" onClick={() => setMaterialMethodId(m.id)}>
                <Link2 className="w-3 h-3" /> {t('cost.viewMaterials')}
              </Button>
            </div>
            <div className="flex gap-1 shrink-0 ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(m); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <MobilePageShell title={t('cost.methodLib')} icon={<Wrench className="w-5 h-5" />} backTo="/cost"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={openAdd}><Plus className="w-4 h-4" /> {t('common.add')}</Button>}>
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('cost.searchMethod')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isLoading ? <AppSectionLoading label={t('common.loading')} compact />
        : filtered.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('cost.noMethods')}</p></div>
        : <ResponsiveTable mobileView={mobileCards} desktopView={desktopTable} />}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing?.id ? t('cost.editMethod') : t('cost.addMethod')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cost.methodCode')} *</Label><Input value={editing?.methodCode || ''} onChange={e => setEditing({...editing, methodCode: e.target.value})} placeholder="e.g. M001" /></div>
              <div><Label>{t('cost.wastePct')} (%)</Label><Input type="number" min={0} max={100} value={editing?.defaultWastePct ?? 5} onChange={e => setEditing({...editing, defaultWastePct: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cost.nameZh')} *</Label><Input value={editing?.nameZh || ''} onChange={e => setEditing({...editing, nameZh: e.target.value})} /></div>
              <div><Label>{t('cost.nameEn')}</Label><Input value={editing?.nameEn || ''} onChange={e => setEditing({...editing, nameEn: e.target.value})} /></div>
            </div>
            <div><Label>{t('cost.description')}</Label><Textarea value={editing?.description || ''} onChange={e => setEditing({...editing, description: e.target.value})} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => save.mutate(editing)} disabled={!editing?.nameZh || !editing?.methodCode || save.isPending}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('cost.cannotUndo')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && del.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {materialMethodId && (
        <MethodMaterialsDialog
          methodId={materialMethodId}
          open={!!materialMethodId}
          onOpenChange={open => { if (!open) setMaterialMethodId(null); }}
        />
      )}
    </MobilePageShell>
  );
}
