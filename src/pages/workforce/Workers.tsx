import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import { workforceService } from '@/services';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Users, UserCheck, UserX, MapPin } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface WorkerForm { name: string; phone: string; position: string; monthly_salary: string; status: string; }
const emptyForm: WorkerForm = { name: '', phone: '', position: '', monthly_salary: '0', status: 'active' };

// ── Site Assignment Sub-dialog ──
function SiteAssignDialog({ workerId, tenantId, open, onOpenChange }: {
  workerId: string; tenantId: string; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [siteId, setSiteId] = useState('');
  const [role, setRole] = useState('worker');

  const { data: sites = [] } = useQuery({
    queryKey: ['workforce-sites-list', tenantId],
    queryFn: () => workforceService.fetchActiveSitesList(tenantId),
    enabled: open && !!tenantId,
  });

  const { data: assignments = [], refetch } = useQuery({
    queryKey: ['worker-site-assignments', workerId],
    queryFn: () => workforceService.fetchSiteAssignments(workerId),
    enabled: open && !!workerId,
  });

  const assignMut = useMutation({
    mutationFn: () => workforceService.assignWorkerToSite(tenantId, workerId, siteId, role),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['workforce-workers'] }); setSiteId(''); toast.success(t('common.saveSuccess')); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => workforceService.removeSiteAssignment(id),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['workforce-workers'] }); toast.success(t('common.deleteSuccess')); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('workforce.assignToSite')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {assignments.length > 0 && (
            <div className="space-y-2">
              <Label>{t('workforce.currentSites')}</Label>
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-md border">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{a.sites?.name}</span>
                    <Badge variant="secondary" className="text-xs">{a.role}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeMut.mutate(a.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('workforce.selectSite')}</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger><SelectValue placeholder={t('workforce.selectSite')} /></SelectTrigger>
              <SelectContent>{sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('workforce.workerRole')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">{t('workforce.roleWorker')}</SelectItem>
                <SelectItem value="foreman">{t('workforce.roleForeman')}</SelectItem>
                <SelectItem value="supervisor">{t('workforce.roleSupervisor')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => assignMut.mutate()} disabled={!siteId || assignMut.isPending}>{t('workforce.assignWorkers')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──
export default function WorkforceWorkers() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkerForm>(emptyForm);
  const [assignWorkerId, setAssignWorkerId] = useState<string | null>(null);

  const { data: workers = [] } = useQuery({
    queryKey: ['workforce-workers', tenantId],
    queryFn: () => workforceService.fetchWorkers(tenantId!),
    enabled: !!tenantId,
  });

  const saveMut = useMutation({
    mutationFn: () => workforceService.saveWorker(tenantId!, {
      name: form.name, phone: form.phone || null, position: form.position || null,
      monthly_salary: parseFloat(form.monthly_salary) || 0, status: form.status as any,
    }, editingId || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workforce-workers'] });
      setShowDialog(false); setEditingId(null); setForm(emptyForm);
      toast.success(t('common.saveSuccess'));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => workforceService.deleteWorker(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workforce-workers'] }); toast.success(t('common.deleteSuccess')); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (w: any) => {
    setEditingId(w.id);
    setForm({ name: w.name, phone: w.phone || '', position: w.position || '', monthly_salary: w.monthly_salary?.toString() || '0', status: w.status });
    setShowDialog(true);
  };

  const activeCount = workers.filter((w: any) => w.status === 'active').length;

  return (
    <MobilePageShell title={t('workforce.workers')} icon={<Users className="w-5 h-5" />} backTo="/workforce"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => { setEditingId(null); setForm(emptyForm); setShowDialog(true); }}><Plus className="w-4 h-4" /> {t('workforce.newWorker')}</Button>}>
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3"><Users className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">{t('workforce.totalWorkers')}</p><p className="text-2xl font-bold">{workers.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><UserCheck className="w-8 h-8 text-success" /><div><p className="text-sm text-muted-foreground">{t('workforce.activeWorkers')}</p><p className="text-2xl font-bold">{activeCount}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><UserX className="w-8 h-8 text-destructive" /><div><p className="text-sm text-muted-foreground">{t('workforce.inactiveWorkers')}</p><p className="text-2xl font-bold">{workers.length - activeCount}</p></div></CardContent></Card>
        </div>

        <Card><CardContent className="pt-6">
          {workers.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t('workforce.noWorkers')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('workforce.workerName')}</TableHead><TableHead>{t('workforce.workerPhone')}</TableHead>
                  <TableHead>{t('workforce.workerPosition')}</TableHead><TableHead>{t('workforce.workerStatus')}</TableHead>
                  <TableHead>{t('workforce.assignedSites')}</TableHead><TableHead className="w-[130px]"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {workers.map((w: any) => {
                    const activeSites = (w.site_workers || []).filter((sw: any) => sw.is_active);
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell className="text-muted-foreground">{w.phone || '-'}</TableCell>
                        <TableCell>{w.position || '-'}</TableCell>
                        <TableCell><Badge variant={w.status === 'active' ? 'default' : 'secondary'}>{w.status === 'active' ? t('workforce.siteActive') : t('workforce.statusInactive')}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {activeSites.length === 0 ? <span className="text-muted-foreground text-sm">-</span> :
                              activeSites.map((sw: any) => <Badge key={sw.id} variant="outline" className="text-xs">{sw.sites?.name}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setAssignWorkerId(w.id)} title={t('workforce.assignToSite')}><MapPin className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm(t('common.confirmDelete'))) deleteMut.mutate(w.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent></Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? t('workforce.editWorker') : t('workforce.newWorker')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('workforce.workerName')} *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{t('workforce.workerPhone')}</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('workforce.workerPosition')}</Label><Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
                <div><Label>{t('workforce.workerStatus')}</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('workforce.siteActive')}</SelectItem>
                      <SelectItem value="resigned">{t('workforce.statusResigned')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{t('workforce.monthlySalary')}</Label><Input type="number" value={form.monthly_salary} onChange={e => setForm({ ...form, monthly_salary: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMut.mutate()} disabled={!form.name || saveMut.isPending}>{t('common.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {assignWorkerId && tenantId && (
          <SiteAssignDialog workerId={assignWorkerId} tenantId={tenantId} open={!!assignWorkerId} onOpenChange={v => { if (!v) setAssignWorkerId(null); }} />
        )}
      </div>
    </MobilePageShell>
  );
}
