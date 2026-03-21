import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

interface WorkerType { id: string; nameZh: string; nameEn: string; hourlyRate: number; sortOrder: number; isActive: boolean; }

export default function WorkerTypesPage() {
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

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['q_worker_types', tenantId],
    queryFn: () => costService.fetchWorkerTypes(tenantId!),
    enabled: !!user && !!tenantId,
  });

  const filtered = types.filter(wt =>
    wt.nameZh.includes(search) || wt.nameEn.toLowerCase().includes(search.toLowerCase())
  );

  const save = useMutation({
    mutationFn: async (wt: any) => costService.saveWorkerType(wt, user?.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_worker_types'] }); toast({ title: t('cost.saved') }); setDialogOpen(false); },
    onError: (e: any) => toast({ title: t('cost.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => costService.deactivateWorkerType(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_worker_types'] }); toast({ title: t('cost.deleted') }); setDeleteId(null); },
  });

  const desktopTable = (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>{t('cost.nameZh')}</TableHead>
            <TableHead>{t('cost.nameEn')}</TableHead>
            <TableHead className="text-right">{t('cost.defaultHourlyRate')} (RM)</TableHead>
            <TableHead className="text-center">{t('cost.sortOrder')}</TableHead>
            <TableHead className="text-center">{t('common.status')}</TableHead>
            <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((wt, idx) => (
            <TableRow key={wt.id}>
              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
              <TableCell className="font-medium">{wt.nameZh}</TableCell>
              <TableCell className="text-muted-foreground">{wt.nameEn || '-'}</TableCell>
              <TableCell className="text-right font-mono">{wt.hourlyRate.toFixed(2)}</TableCell>
              <TableCell className="text-center">{wt.sortOrder}</TableCell>
              <TableCell className="text-center"><Badge variant={wt.isActive ? 'default' : 'secondary'}>{wt.isActive ? t('common.active') : t('common.inactive')}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(wt); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(wt.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
      {filtered.map(wt => (
        <Card key={wt.id}>
          <CardContent className="p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm">{wt.nameZh}</p>
              {wt.nameEn && <p className="text-xs text-muted-foreground">{wt.nameEn}</p>}
              <p className="text-xs mt-0.5">{t('cost.defaultHourlyRate')}: RM {wt.hourlyRate.toFixed(2)}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(wt); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(wt.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <MobilePageShell title={t('cost.workerTypesModule')} icon={<Users className="w-5 h-5" />} backTo="/cost"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => { setEditing({ nameZh: '', nameEn: '', hourlyRate: 0, sortOrder: 0 }); setDialogOpen(true); }}><Plus className="w-4 h-4" /> {t('common.add')}</Button>}>
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('cost.searchWorkerType')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isLoading ? <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
        : filtered.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('cost.noWorkerTypes')}</p></div>
        : <ResponsiveTable mobileView={mobileCards} desktopView={desktopTable} />}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing?.id ? t('cost.editWorkerType') : t('cost.addWorkerType')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cost.nameZh')} *</Label><Input value={editing?.nameZh || ''} onChange={e => setEditing({...editing, nameZh: e.target.value})} /></div>
              <div><Label>{t('cost.nameEn')}</Label><Input value={editing?.nameEn || ''} onChange={e => setEditing({...editing, nameEn: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cost.defaultHourlyRate')} (RM)</Label><Input type="number" value={editing?.hourlyRate || 0} onChange={e => setEditing({...editing, hourlyRate: Number(e.target.value)})} /></div>
              <div><Label>{t('cost.sortOrder')}</Label><Input type="number" value={editing?.sortOrder || 0} onChange={e => setEditing({...editing, sortOrder: Number(e.target.value)})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => save.mutate(editing)} disabled={!editing?.nameZh || save.isPending}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('cost.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('cost.cannotUndo')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && del.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
