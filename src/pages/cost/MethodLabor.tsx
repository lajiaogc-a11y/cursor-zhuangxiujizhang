import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Clock, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

interface LaborRate {
  id: string; methodId: string; methodCode: string; methodName: string;
  workerType: string; hourlyRate: number; hoursPerUnit: number; laborUnit: string; notes: string;
}

export default function MethodLaborPage() {
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

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['q_labor_rates', tenantId],
    queryFn: () => costService.fetchLaborRates(tenantId!),
    enabled: !!user && !!tenantId,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ['q_methods_select'],
    queryFn: () => costService.fetchMethodsSelect(),
    enabled: !!user,
  });

  const { data: workerTypes = [] } = useQuery({
    queryKey: ['q_worker_types_select'],
    queryFn: () => costService.fetchWorkerTypesSelect(),
    enabled: !!user,
  });

  const filtered = rates.filter(r =>
    r.methodName.includes(search) || r.methodCode.includes(search) || r.workerType.includes(search)
  );

  const save = useMutation({
    mutationFn: async (r: any) => costService.saveLaborRate(r, user?.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_labor_rates'] }); toast({ title: t('cost.saved') }); setDialogOpen(false); },
    onError: (e: any) => toast({ title: t('cost.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => costService.deleteLaborRate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_labor_rates'] }); toast({ title: t('cost.deleted') }); setDeleteId(null); },
  });

  const handleWorkerTypeChange = (v: string) => {
    const wt = workerTypes.find((w: any) => w.name_zh === v);
    setEditing({ ...editing, workerType: v, hourlyRate: wt ? Number(wt.default_hourly_rate) : editing.hourlyRate });
  };

  const desktopTable = (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>{t('cost.methodCode')}</TableHead>
            <TableHead>{t('cost.methodName')}</TableHead>
            <TableHead>{t('cost.workerType')}</TableHead>
            <TableHead>{t('cost.laborUnit')}</TableHead>
            <TableHead className="text-right">{t('cost.hoursPerUnit')}</TableHead>
            <TableHead className="text-right">{t('cost.hourlyRate')} (RM)</TableHead>
            <TableHead>{t('cost.notes')}</TableHead>
            <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r, idx) => (
            <TableRow key={r.id}>
              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
              <TableCell><Badge variant="outline">{r.methodCode || '-'}</Badge></TableCell>
              <TableCell className="font-medium">{r.methodName}</TableCell>
              <TableCell><Badge variant="secondary">{r.workerType}</Badge></TableCell>
              <TableCell>{r.laborUnit || '-'}</TableCell>
              <TableCell className="text-right font-mono">{r.hoursPerUnit}</TableCell>
              <TableCell className="text-right font-mono">{r.hourlyRate.toFixed(2)}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{r.notes || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
      {filtered.map(r => (
        <Card key={r.id}>
          <CardContent className="p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm">{r.methodName}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{r.methodCode}</Badge>
                <Badge variant="secondary" className="text-[10px]">{r.workerType}</Badge>
                <span className="text-xs text-muted-foreground">{r.hoursPerUnit}h × RM{r.hourlyRate.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <MobilePageShell title={t('cost.methodLabor')} icon={<Clock className="w-5 h-5" />} backTo="/cost"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => { setEditing({ methodId: '', workerType: '', hourlyRate: 0, hoursPerUnit: 0, laborUnit: '', notes: '' }); setDialogOpen(true); }}><Plus className="w-4 h-4" /> {t('common.add')}</Button>}>
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('cost.searchLaborRate')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isLoading ? <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
        : filtered.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Clock className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('cost.noLaborRates')}</p></div>
        : <ResponsiveTable mobileView={mobileCards} desktopView={desktopTable} />}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing?.id ? t('cost.editLaborRate') : t('cost.addLaborRate')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('cost.method')} *</Label>
              <Select value={editing?.methodId || ''} onValueChange={v => setEditing({...editing, methodId: v})}>
                <SelectTrigger><SelectValue placeholder={t('cost.selectMethod')} /></SelectTrigger>
                <SelectContent>{methods.map((m: any) => <SelectItem key={m.id} value={m.id}>[{m.method_code}] {m.name_zh}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('cost.workerType')} *</Label>
              <Select value={editing?.workerType || ''} onValueChange={handleWorkerTypeChange}>
                <SelectTrigger><SelectValue placeholder={t('cost.selectWorkerType')} /></SelectTrigger>
                <SelectContent>{workerTypes.map((w: any) => <SelectItem key={w.name_zh} value={w.name_zh}>{w.name_zh} (RM{Number(w.default_hourly_rate).toFixed(2)}/h)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('cost.laborUnit')}</Label><Input value={editing?.laborUnit || ''} onChange={e => setEditing({...editing, laborUnit: e.target.value})} placeholder="e.g. sqft" /></div>
              <div><Label>{t('cost.hoursPerUnit')}</Label><Input type="number" step={0.1} value={editing?.hoursPerUnit || 0} onChange={e => setEditing({...editing, hoursPerUnit: Number(e.target.value)})} /></div>
              <div><Label>{t('cost.hourlyRate')} (RM)</Label><Input type="number" value={editing?.hourlyRate || 0} onChange={e => setEditing({...editing, hourlyRate: Number(e.target.value)})} /></div>
            </div>
            <div><Label>{t('cost.notes')}</Label><Input value={editing?.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => save.mutate(editing)} disabled={!editing?.methodId || !editing?.workerType || save.isPending}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('cost.cannotUndo')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && del.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
