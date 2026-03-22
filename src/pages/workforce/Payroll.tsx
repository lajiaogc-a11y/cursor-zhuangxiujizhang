import { useState, useMemo } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { workforceService } from '@/services';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DateInput } from '@/components/ui/date-input';
import { DollarSign, Calculator, FileDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { format } from 'date-fns';

interface PayrollRecord {
  id: string; worker_id: string; site_id: string | null; period_start: string; period_end: string;
  total_days: number; total_hours: number; overtime_hours: number; base_pay: number; overtime_pay: number;
  deductions: number; bonuses: number; net_pay: number; currency: string; export_status: string;
  notes: string | null; tenant_id: string; created_by: string; created_at: string;
}

export default function WorkforcePayroll() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [calcWorkerId, setCalcWorkerId] = useState('');
  const [calcSiteId, setCalcSiteId] = useState('');
  const [calcStart, setCalcStart] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [calcEnd, setCalcEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [form, setForm] = useState({
    worker_id: '', site_id: '', period_start: '', period_end: '',
    total_days: '0', total_hours: '0', overtime_hours: '0',
    base_pay: '0', overtime_pay: '0', deductions: '0', bonuses: '0',
    currency: 'MYR', notes: '',
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workforce-workers-list', tenantId],
    queryFn: () => workforceService.fetchActiveWorkersList(tenantId!),
    enabled: !!tenantId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['workforce-sites-list', tenantId],
    queryFn: () => workforceService.fetchActiveSitesList(tenantId!),
    enabled: !!tenantId,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['workforce-payroll', tenantId],
    queryFn: () => workforceService.fetchPayrollRecords(tenantId!),
    enabled: !!tenantId,
  });

  const netPay = useMemo(() => {
    return (parseFloat(form.base_pay) || 0) + (parseFloat(form.overtime_pay) || 0) + (parseFloat(form.bonuses) || 0) - (parseFloat(form.deductions) || 0);
  }, [form.base_pay, form.overtime_pay, form.bonuses, form.deductions]);

  const stats = useMemo(() => {
    const total = records.reduce((s: number, r: any) => s + (r.net_pay || 0), 0);
    const draft = records.filter((r: any) => r.export_status === 'draft').length;
    const confirmed = records.filter((r: any) => r.export_status === 'confirmed').length;
    return { total, draft, confirmed, count: records.length };
  }, [records]);

  const resetForm = () => {
    setForm({ worker_id: '', site_id: '', period_start: '', period_end: '', total_days: '0', total_hours: '0', overtime_hours: '0', base_pay: '0', overtime_pay: '0', deductions: '0', bonuses: '0', currency: 'MYR', notes: '' });
    setEditRecord(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (r: PayrollRecord) => {
    setEditRecord(r);
    setForm({ worker_id: r.worker_id, site_id: r.site_id || '', period_start: r.period_start, period_end: r.period_end, total_days: String(r.total_days), total_hours: String(r.total_hours), overtime_hours: String(r.overtime_hours), base_pay: String(r.base_pay), overtime_pay: String(r.overtime_pay), deductions: String(r.deductions), bonuses: String(r.bonuses), currency: r.currency, notes: r.notes || '' });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => workforceService.savePayrollRecord(tenantId!, {
      worker_id: form.worker_id, site_id: form.site_id || null, period_start: form.period_start, period_end: form.period_end,
      total_days: parseInt(form.total_days) || 0, total_hours: parseFloat(form.total_hours) || 0, overtime_hours: parseFloat(form.overtime_hours) || 0,
      base_pay: parseFloat(form.base_pay) || 0, overtime_pay: parseFloat(form.overtime_pay) || 0, deductions: parseFloat(form.deductions) || 0,
      bonuses: parseFloat(form.bonuses) || 0, net_pay: netPay, currency: form.currency, notes: form.notes.trim() || null, created_by: user?.id,
    }, editRecord?.id),
    onSuccess: () => { toast({ title: editRecord ? t('common.updateSuccess') : t('common.addSuccess') }); if (tenantId) queryClient.invalidateQueries({ queryKey: ['workforce-payroll', tenantId] }); setDialogOpen(false); resetForm(); },
    onError: (e: any) => toast({ title: t('common.error'), description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workforceService.deletePayrollRecord(id),
    onSuccess: () => { toast({ title: t('common.deleteSuccess') }); if (tenantId) queryClient.invalidateQueries({ queryKey: ['workforce-payroll', tenantId] }); },
    onError: (e: any) => toast({ title: t('common.error'), description: e.message, variant: 'destructive' }),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => workforceService.confirmPayrollRecord(id),
    onSuccess: () => { toast({ title: t('common.updateSuccess') }); if (tenantId) queryClient.invalidateQueries({ queryKey: ['workforce-payroll', tenantId] }); },
  });

  const calculateFromAttendance = async () => {
    if (!calcWorkerId || !calcStart || !calcEnd) { toast({ title: t('wfPayroll.selectWorkerPeriod'), variant: 'destructive' }); return; }
    const attendances = await workforceService.fetchAttendanceForCalc(tenantId!, calcWorkerId, calcStart, calcEnd);
    const totalDays = attendances.length;
    const totalMinutes = attendances.reduce((s: number, a: any) => s + (a.duration_minutes || 0), 0);
    const overtimeMinutes = attendances.reduce((s: number, a: any) => s + (a.overtime_minutes || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
    const overtimeHours = Math.round(overtimeMinutes / 60 * 100) / 100;
    const worker = workers.find((w: any) => w.id === calcWorkerId);
    const dailyRate = worker ? worker.monthly_salary / 26 : 0;
    const basePay = Math.round(dailyRate * totalDays * 100) / 100;
    const otPay = Math.round(dailyRate / 8 * 1.5 * overtimeHours * 100) / 100;
    const leaves = await workforceService.fetchApprovedLeaves(tenantId!, calcWorkerId, calcStart, calcEnd);
    const unpaidLeaveDays = leaves.filter((l: any) => l.leave_type === 'unpaid').reduce((s: number, l: any) => {
      const diff = Math.max(1, Math.ceil((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / 86400000) + 1);
      return s + diff;
    }, 0);
    const deductions = Math.round(dailyRate * unpaidLeaveDays * 100) / 100;
    setForm(prev => ({ ...prev, worker_id: calcWorkerId, site_id: calcSiteId, period_start: calcStart, period_end: calcEnd, total_days: String(totalDays), total_hours: String(totalHours), overtime_hours: String(overtimeHours), base_pay: String(basePay), overtime_pay: String(otPay), deductions: String(deductions) }));
    setCalcDialogOpen(false); setDialogOpen(true);
    toast({ title: t('wfPayroll.calcSuccess') });
  };

  const getWorkerName = (id: string) => workers.find((w: any) => w.id === id)?.name || '-';
  const getSiteName = (id: string | null) => id ? sites.find((s: any) => s.id === id)?.name || '-' : '-';
  const fmtMoney = (v: number, cur = 'MYR') => `${cur} ${v.toLocaleString('en', { minimumFractionDigits: 2 })}`;

  const exportCSV = () => {
    const headers = ['Worker', 'Site', 'Period', 'Days', 'Hours', 'OT Hours', 'Base Pay', 'OT Pay', 'Deductions', 'Bonuses', 'Net Pay', 'Status'];
    const rows = records.map((r: any) => [getWorkerName(r.worker_id), getSiteName(r.site_id), `${r.period_start}~${r.period_end}`, r.total_days, r.total_hours, r.overtime_hours, r.base_pay, r.overtime_pay, r.deductions, r.bonuses, r.net_pay, r.export_status]);
    const csv = [headers, ...rows].map((r: any) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `workforce_payroll_${format(new Date(), 'yyyyMMdd')}.csv`; a.click(); URL.revokeObjectURL(url);
    toast({ title: t('wfPayroll.exportSuccess') });
  };

  return (
    <MobilePageShell title={t('wfPayroll.title')} subtitle={t('wfPayroll.desc')} icon={<DollarSign className="w-5 h-5" />} backTo="/workforce"
      headerActions={
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCalcDialogOpen(true)}><Calculator className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={exportCSV}><FileDown className="w-4 h-4" /></Button>
          <Button size="sm" className="h-8 gap-1" onClick={openAdd}><Plus className="w-4 h-4" /></Button>
        </div>
      }>
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('wfPayroll.totalRecords'), value: stats.count, color: 'text-primary' },
            { label: t('wfPayroll.totalNetPay'), value: fmtMoney(stats.total), color: 'text-success' },
            { label: t('wfPayroll.draftCount'), value: stats.draft, color: 'text-warning' },
            { label: t('wfPayroll.confirmedCount'), value: stats.confirmed, color: 'text-blue-500' },
          ].map((kpi, i) => (
            <Card key={i}><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className={`w-8 h-8 ${kpi.color}`} /><div><p className="text-sm text-muted-foreground">{kpi.label}</p><p className="text-xl font-bold">{kpi.value}</p></div></div></CardContent></Card>
          ))}
        </div>

        <Card><CardContent className="p-0"><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('wfPayroll.worker')}</TableHead><TableHead>{t('wfPayroll.site')}</TableHead>
              <TableHead>{t('wfPayroll.period')}</TableHead><TableHead className="text-right">{t('wfPayroll.days')}</TableHead>
              <TableHead className="text-right">{t('wfPayroll.basePay')}</TableHead><TableHead className="text-right">{t('wfPayroll.otPay')}</TableHead>
              <TableHead className="text-right">{t('wfPayroll.netPay')}</TableHead><TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('common.actions')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="p-0"><AppSectionLoading label={t('common.loading')} compact /></TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('wfPayroll.noRecords')}</TableCell></TableRow>
              ) : records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{getWorkerName(r.worker_id)}</TableCell>
                  <TableCell>{getSiteName(r.site_id)}</TableCell>
                  <TableCell className="text-sm">{r.period_start} ~ {r.period_end}</TableCell>
                  <TableCell className="text-right">{r.total_days}</TableCell>
                  <TableCell className="text-right">{fmtMoney(r.base_pay, r.currency)}</TableCell>
                  <TableCell className="text-right">{fmtMoney(r.overtime_pay, r.currency)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtMoney(r.net_pay, r.currency)}</TableCell>
                  <TableCell><Badge variant={r.export_status === 'confirmed' ? 'default' : 'secondary'}>{r.export_status === 'confirmed' ? t('wfPayroll.confirmed') : t('wfPayroll.draft')}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {r.export_status === 'draft' && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => confirmMutation.mutate(r.id)}>✓</Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div></CardContent></Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editRecord ? t('wfPayroll.editRecord') : t('wfPayroll.newRecord')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('wfPayroll.worker')} *</Label>
                  <Select value={form.worker_id} onValueChange={v => setForm(p => ({ ...p, worker_id: v }))}><SelectTrigger><SelectValue placeholder={t('wfPayroll.selectWorker')} /></SelectTrigger><SelectContent>{workers.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('wfPayroll.site')}</Label>
                  <Select value={form.site_id} onValueChange={v => setForm(p => ({ ...p, site_id: v }))}><SelectTrigger><SelectValue placeholder={t('wfPayroll.selectSite')} /></SelectTrigger><SelectContent>{sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('wfPayroll.periodStart')} *</Label><DateInput value={form.period_start} onChange={v => setForm(p => ({ ...p, period_start: v }))} /></div>
                <div className="space-y-2"><Label>{t('wfPayroll.periodEnd')} *</Label><DateInput value={form.period_end} onChange={v => setForm(p => ({ ...p, period_end: v }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>{t('wfPayroll.days')}</Label><Input type="number" value={form.total_days} onChange={e => setForm(p => ({ ...p, total_days: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t('wfPayroll.hours')}</Label><Input type="number" step="0.01" value={form.total_hours} onChange={e => setForm(p => ({ ...p, total_hours: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t('wfPayroll.otHours')}</Label><Input type="number" step="0.01" value={form.overtime_hours} onChange={e => setForm(p => ({ ...p, overtime_hours: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('wfPayroll.basePay')}</Label><Input type="number" step="0.01" value={form.base_pay} onChange={e => setForm(p => ({ ...p, base_pay: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t('wfPayroll.otPay')}</Label><Input type="number" step="0.01" value={form.overtime_pay} onChange={e => setForm(p => ({ ...p, overtime_pay: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('wfPayroll.deductions')}</Label><Input type="number" step="0.01" value={form.deductions} onChange={e => setForm(p => ({ ...p, deductions: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t('wfPayroll.bonuses')}</Label><Input type="number" step="0.01" value={form.bonuses} onChange={e => setForm(p => ({ ...p, bonuses: e.target.value }))} /></div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center"><span className="text-sm text-muted-foreground">{t('wfPayroll.netPay')}:</span><span className="text-lg font-bold ml-2">{fmtMoney(netPay, form.currency)}</span></div>
              <div className="space-y-2"><Label>{t('common.remark')}</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.worker_id || !form.period_start || !form.period_end || saveMutation.isPending}>
                {saveMutation.isPending && <ChromeLoadingSpinner variant="muted" className="mr-1 h-4 w-4" />}{t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Auto-Calculate Dialog */}
        <Dialog open={calcDialogOpen} onOpenChange={setCalcDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{t('wfPayroll.autoCalc')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t('wfPayroll.worker')}</Label>
                <Select value={calcWorkerId} onValueChange={setCalcWorkerId}><SelectTrigger><SelectValue placeholder={t('wfPayroll.selectWorker')} /></SelectTrigger><SelectContent>{workers.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>{t('wfPayroll.site')}</Label>
                <Select value={calcSiteId} onValueChange={setCalcSiteId}><SelectTrigger><SelectValue placeholder={t('wfPayroll.selectSite')} /></SelectTrigger><SelectContent>{sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('wfPayroll.periodStart')}</Label><Input type="date" value={calcStart} onChange={e => setCalcStart(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t('wfPayroll.periodEnd')}</Label><Input type="date" value={calcEnd} onChange={e => setCalcEnd(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCalcDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={calculateFromAttendance} disabled={!calcWorkerId}><Calculator className="w-4 h-4 mr-1" />{t('wfPayroll.calculate')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobilePageShell>
  );
}
