import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workforceService } from '@/services';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Plus, Clock, CheckCircle, XCircle, Loader2, CalendarDays } from 'lucide-react';

const LEAVE_TYPES = ['annual', 'sick', 'personal', 'unpaid', 'other'] as const;

export default function LeavesPage() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [workerId, setWorkerId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [leaveType, setLeaveType] = useState<string>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['workforce-employees', tenantId],
    queryFn: () => workforceService.fetchActiveWorkersList(tenantId!),
    enabled: !!tenantId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['workforce-sites-list', tenantId],
    queryFn: () => workforceService.fetchActiveSitesList(tenantId!),
    enabled: !!tenantId,
  });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leave-requests', filterStatus, tenantId],
    queryFn: () => workforceService.fetchLeaveRequests(tenantId!, filterStatus),
    enabled: !!tenantId,
  });

  const pending = leaves.filter((l: any) => l.status === 'pending').length;
  const approved = leaves.filter((l: any) => l.status === 'approved').length;
  const rejected = leaves.filter((l: any) => l.status === 'rejected').length;

  const createMutation = useMutation({
    mutationFn: () => workforceService.createLeaveRequest(tenantId!, {
      worker_id: workerId, site_id: siteId || null, leave_type: leaveType,
      start_date: startDate, end_date: endDate, reason,
    }),
    onSuccess: () => { toast.success(t('common.saveSuccess')); qc.invalidateQueries({ queryKey: ['leave-requests'] }); resetForm(); },
    onError: (err: any) => toast.error(err.message),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      workforceService.reviewLeaveRequest(id, status, reviewNote || null),
    onSuccess: () => {
      toast.success(t('common.saveSuccess')); qc.invalidateQueries({ queryKey: ['leave-requests'] });
      setReviewOpen(false); setSelectedLeave(null); setReviewNote('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => { setFormOpen(false); setWorkerId(''); setSiteId(''); setLeaveType('annual'); setStartDate(''); setEndDate(''); setReason(''); };

  const leaveTypeBadge = (type: string) => {
    const labels: Record<string, string> = { annual: t('leave.typeAnnual'), sick: t('leave.typeSick'), personal: t('leave.typePersonal'), unpaid: t('leave.typeUnpaid'), other: t('leave.typeOther') };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" />{t('leave.statusPending')}</Badge>;
      case 'approved': return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />{t('leave.statusApproved')}</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-600 border-red-200"><XCircle className="w-3 h-3 mr-1" />{t('leave.statusRejected')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MobilePageShell title={t('workforce.leaves')} icon={<CalendarDays className="w-5 h-5" />} backTo="/workforce"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" /> {t('leave.newRequest')}</Button>}>
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">{t('leave.statusPending')}</p><p className="text-2xl font-bold">{pending}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="w-5 h-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">{t('leave.statusApproved')}</p><p className="text-2xl font-bold">{approved}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/10"><XCircle className="w-5 h-5 text-red-600" /></div><div><p className="text-sm text-muted-foreground">{t('leave.statusRejected')}</p><p className="text-2xl font-bold">{rejected}</p></div></CardContent></Card>
        </div>

        <div className="flex gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="pending">{t('leave.statusPending')}</SelectItem>
              <SelectItem value="approved">{t('leave.statusApproved')}</SelectItem>
              <SelectItem value="rejected">{t('leave.statusRejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader><CardTitle>{t('workforce.leaves')}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : leaves.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('attendance.worker')}</TableHead><TableHead>{t('leave.type')}</TableHead>
                    <TableHead>{t('leave.startDate')}</TableHead><TableHead>{t('leave.endDate')}</TableHead>
                    <TableHead>{t('leave.days')}</TableHead><TableHead>{t('leave.reason')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {leaves.map((l: any) => {
                      const days = differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1;
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.worker?.name ?? '-'}</TableCell>
                          <TableCell>{leaveTypeBadge(l.leave_type)}</TableCell>
                          <TableCell>{format(parseISO(l.start_date), 'yyyy-MM-dd')}</TableCell>
                          <TableCell>{format(parseISO(l.end_date), 'yyyy-MM-dd')}</TableCell>
                          <TableCell>{days}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{l.reason || '-'}</TableCell>
                          <TableCell>{statusBadge(l.status)}</TableCell>
                          <TableCell>
                            {l.status === 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => { setSelectedLeave(l); setReviewOpen(true); }}>{t('leave.review')}</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={formOpen} onOpenChange={(o) => { if (!o) resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{t('leave.newRequest')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">{t('attendance.worker')}</label>
                <Select value={workerId} onValueChange={setWorkerId}>
                  <SelectTrigger><SelectValue placeholder={t('attendance.selectWorker')} /></SelectTrigger>
                  <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name} - {e.position}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">{t('attendance.site')}</label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger><SelectValue placeholder={t('workforce.selectSite')} /></SelectTrigger>
                  <SelectContent>{sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">{t('leave.type')}</label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAVE_TYPES.map((lt) => <SelectItem key={lt} value={lt}>{t(`leave.type${lt.charAt(0).toUpperCase() + lt.slice(1)}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">{t('leave.startDate')}</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1 block">{t('leave.endDate')}</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">{t('leave.reason')}</label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>{t('common.cancel')}</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!workerId || !startDate || !endDate || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={reviewOpen} onOpenChange={(o) => { if (!o) { setReviewOpen(false); setSelectedLeave(null); setReviewNote(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{t('leave.review')}</DialogTitle></DialogHeader>
            {selectedLeave && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">{t('attendance.worker')}:</span> {selectedLeave.worker?.name}</div>
                  <div><span className="text-muted-foreground">{t('leave.type')}:</span> {selectedLeave.leave_type}</div>
                  <div><span className="text-muted-foreground">{t('leave.startDate')}:</span> {selectedLeave.start_date}</div>
                  <div><span className="text-muted-foreground">{t('leave.endDate')}:</span> {selectedLeave.end_date}</div>
                </div>
                {selectedLeave.reason && <div className="text-sm"><span className="text-muted-foreground">{t('leave.reason')}:</span> {selectedLeave.reason}</div>}
                <div><label className="text-sm font-medium mb-1 block">{t('leave.reviewNote')}</label><Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2} /></div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="destructive" onClick={() => selectedLeave && reviewMutation.mutate({ id: selectedLeave.id, status: 'rejected' })} disabled={reviewMutation.isPending}>
                <XCircle className="w-4 h-4 mr-1" /> {t('leave.reject')}
              </Button>
              <Button onClick={() => selectedLeave && reviewMutation.mutate({ id: selectedLeave.id, status: 'approved' })} disabled={reviewMutation.isPending}>
                {reviewMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                <CheckCircle className="w-4 h-4 mr-1" /> {t('leave.approve')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobilePageShell>
  );
}
