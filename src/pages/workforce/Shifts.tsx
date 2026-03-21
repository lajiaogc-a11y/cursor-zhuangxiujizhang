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
import { Plus, Edit2, Trash2, Clock, Sun, Moon, Users, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ShiftForm { site_id: string; name: string; start_time: string; end_time: string; break_minutes: string; shift_type: string; }
const emptyForm: ShiftForm = { site_id: '', name: '', start_time: '08:00', end_time: '17:00', break_minutes: '60', shift_type: 'day' };

function ShiftAssignDialog({ shiftId, tenantId, open, onOpenChange }: {
  shiftId: string; tenantId: string; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [workerId, setWorkerId] = useState('');
  const [assignDate, setAssignDate] = useState(new Date().toISOString().substring(0, 10));

  const { data: workers = [] } = useQuery({
    queryKey: ['workforce-workers-list', tenantId],
    queryFn: () => workforceService.fetchActiveWorkersList(tenantId),
    enabled: open && !!tenantId,
  });

  const { data: assignments = [], refetch } = useQuery({
    queryKey: ['shift-assignments', shiftId],
    queryFn: () => workforceService.fetchShiftAssignments(shiftId),
    enabled: open && !!shiftId,
  });

  const assignMut = useMutation({
    mutationFn: () => workforceService.assignWorkerToShift(tenantId, shiftId, workerId, assignDate),
    onSuccess: () => { refetch(); setWorkerId(''); toast.success(t('common.saveSuccess')); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => workforceService.removeShiftAssignment(id),
    onSuccess: () => { refetch(); toast.success(t('common.deleteSuccess')); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('workforce.assignWorkersToShift')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {assignments.length > 0 && (
            <div className="space-y-2">
              <Label>{t('workforce.currentAssignments')}</Label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{a.employees?.name}</span>
                      <Badge variant="secondary" className="text-xs">{a.assignment_date}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMut.mutate(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('workforce.selectWorker')}</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger><SelectValue placeholder={t('workforce.selectWorker')} /></SelectTrigger>
              <SelectContent>{workers.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('workforce.assignmentDate')}</Label>
            <Input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => assignMut.mutate()} disabled={!workerId || assignMut.isPending}>{t('workforce.assignWorkers')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkforceShifts() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShiftForm>(emptyForm);
  const [assignShiftId, setAssignShiftId] = useState<string | null>(null);

  const { data: sites = [] } = useQuery({
    queryKey: ['workforce-sites-list', tenantId],
    queryFn: () => workforceService.fetchActiveSitesList(tenantId!),
    enabled: !!tenantId,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['workforce-shifts', tenantId],
    queryFn: () => workforceService.fetchShifts(tenantId!),
    enabled: !!tenantId,
  });

  const saveMut = useMutation({
    mutationFn: () => workforceService.saveShift(tenantId!, {
      site_id: form.site_id, name: form.name, start_time: form.start_time, end_time: form.end_time,
      break_minutes: parseInt(form.break_minutes) || 0, shift_type: form.shift_type,
    }, editingId || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workforce-shifts'] });
      setShowDialog(false); setEditingId(null); setForm(emptyForm);
      toast.success(t('common.saveSuccess'));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => workforceService.deleteShift(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workforce-shifts'] }); toast.success(t('common.deleteSuccess')); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ site_id: s.site_id, name: s.name, start_time: s.start_time?.substring(0, 5) || '08:00', end_time: s.end_time?.substring(0, 5) || '17:00', break_minutes: s.break_minutes?.toString() || '60', shift_type: s.shift_type || 'day' });
    setShowDialog(true);
  };

  const dayShifts = shifts.filter((s: any) => s.shift_type === 'day').length;
  const nightShifts = shifts.filter((s: any) => s.shift_type === 'night').length;

  return (
    <MobilePageShell title={t('workforce.shifts')} icon={<Clock className="w-5 h-5" />} backTo="/workforce"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => { setEditingId(null); setForm(emptyForm); setShowDialog(true); }}><Plus className="w-4 h-4" /> {t('workforce.newShift')}</Button>}>
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3"><Clock className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">{t('workforce.totalShifts')}</p><p className="text-2xl font-bold">{shifts.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><Sun className="w-8 h-8 text-amber-500" /><div><p className="text-sm text-muted-foreground">{t('workforce.dayShifts')}</p><p className="text-2xl font-bold">{dayShifts}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><Moon className="w-8 h-8 text-indigo-500" /><div><p className="text-sm text-muted-foreground">{t('workforce.nightShifts')}</p><p className="text-2xl font-bold">{nightShifts}</p></div></CardContent></Card>
        </div>

        <Card><CardContent className="pt-6">
          {shifts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t('workforce.noShifts')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('workforce.shiftName')}</TableHead><TableHead>{t('workforce.shiftSite')}</TableHead>
                  <TableHead>{t('workforce.shiftTime')}</TableHead><TableHead>{t('workforce.shiftBreak')}</TableHead>
                  <TableHead>{t('workforce.shiftType')}</TableHead><TableHead>{t('workforce.assignedCount')}</TableHead>
                  <TableHead className="w-[130px]"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {shifts.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.sites?.name || '-'}</TableCell>
                      <TableCell><span className="text-sm">{s.start_time?.substring(0, 5)} – {s.end_time?.substring(0, 5)}</span></TableCell>
                      <TableCell>{s.break_minutes} {t('workforce.minutes')}</TableCell>
                      <TableCell><Badge variant={s.shift_type === 'day' ? 'default' : 'secondary'}>{s.shift_type === 'day' ? t('workforce.shiftDay') : t('workforce.shiftNight')}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{s.shift_assignments?.length || 0}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setAssignShiftId(s.id)} title={t('workforce.assignWorkersToShift')}><UserPlus className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm(t('common.confirmDelete'))) deleteMut.mutate(s.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent></Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? t('workforce.editShift') : t('workforce.newShift')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('workforce.shiftSite')} *</Label>
                <Select value={form.site_id} onValueChange={v => setForm({ ...form, site_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t('workforce.selectSite')} /></SelectTrigger>
                  <SelectContent>{sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('workforce.shiftName')} *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('workforce.shiftNamePlaceholder')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('workforce.shiftStart')}</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                <div><Label>{t('workforce.shiftEnd')}</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('workforce.shiftBreak')} ({t('workforce.minutes')})</Label><Input type="number" value={form.break_minutes} onChange={e => setForm({ ...form, break_minutes: e.target.value })} /></div>
                <div><Label>{t('workforce.shiftType')}</Label>
                  <Select value={form.shift_type} onValueChange={v => setForm({ ...form, shift_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">{t('workforce.shiftDay')}</SelectItem>
                      <SelectItem value="night">{t('workforce.shiftNight')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMut.mutate()} disabled={!form.name || !form.site_id || saveMut.isPending}>{t('common.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {assignShiftId && tenantId && (
          <ShiftAssignDialog shiftId={assignShiftId} tenantId={tenantId} open={!!assignShiftId} onOpenChange={v => { if (!v) setAssignShiftId(null); }} />
        )}
      </div>
    </MobilePageShell>
  );
}
