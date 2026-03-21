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
import { Plus, MapPin, Users, Edit2, Trash2, Building2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SiteForm {
  name: string; address: string; lat: string; lng: string;
  geofence_radius_m: string; start_date: string; end_date: string; status: string; notes: string;
}

const emptySiteForm: SiteForm = {
  name: '', address: '', lat: '', lng: '', geofence_radius_m: '200',
  start_date: '', end_date: '', status: 'active', notes: '',
};

export default function WorkforceSites() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SiteForm>(emptySiteForm);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['workforce-sites', tenantId],
    queryFn: () => workforceService.fetchSites(tenantId!),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await workforceService.saveSite(tenantId!, {
        name: form.name, address: form.address || null,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        geofence_radius_m: parseInt(form.geofence_radius_m) || 200,
        start_date: form.start_date || null, end_date: form.end_date || null,
        status: form.status, notes: form.notes || null,
      }, editingId || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce-sites'] });
      setShowDialog(false); setEditingId(null); setForm(emptySiteForm);
      toast.success(t('common.saveSuccess'));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workforceService.deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce-sites'] });
      toast.success(t('common.deleteSuccess'));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (site: any) => {
    setEditingId(site.id);
    setForm({
      name: site.name, address: site.address || '', lat: site.lat?.toString() || '',
      lng: site.lng?.toString() || '', geofence_radius_m: site.geofence_radius_m?.toString() || '200',
      start_date: site.start_date || '', end_date: site.end_date || '',
      status: site.status, notes: site.notes || '',
    });
    setShowDialog(true);
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default', completed: 'secondary', suspended: 'destructive',
    };
    const labels: Record<string, string> = {
      active: t('workforce.siteActive'), completed: t('workforce.siteCompleted'), suspended: t('workforce.siteSuspended'),
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  return (
    <MobilePageShell title={t('workforce.sites')} icon={<Building2 className="w-5 h-5" />} backTo="/workforce"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => { setEditingId(null); setForm(emptySiteForm); setShowDialog(true); }}><Plus className="w-4 h-4" /> {t('workforce.newSite')}</Button>}>
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            <div><p className="text-sm text-muted-foreground">{t('workforce.totalSites')}</p><p className="text-2xl font-bold">{sites.length}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <MapPin className="w-8 h-8 text-success" />
            <div><p className="text-sm text-muted-foreground">{t('workforce.activeSites')}</p><p className="text-2xl font-bold">{sites.filter((s: any) => s.status === 'active').length}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div><p className="text-sm text-muted-foreground">{t('workforce.totalWorkers')}</p><p className="text-2xl font-bold">
              {sites.reduce((s: number, site: any) => s + (site.site_workers?.[0]?.count || 0), 0)}
            </p></div>
          </div></CardContent></Card>
        </div>

        <Card><CardContent className="pt-6">
          {sites.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t('workforce.noSites')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('workforce.siteName')}</TableHead>
                  <TableHead>{t('workforce.siteAddress')}</TableHead>
                  <TableHead>{t('workforce.siteStatus')}</TableHead>
                  <TableHead className="text-center">{t('workforce.workerCount')}</TableHead>
                  <TableHead>{t('workforce.geofenceRadius')}</TableHead>
                  <TableHead>{t('workforce.startDate')}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {sites.map((site: any) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell className="text-muted-foreground">{site.address || '-'}</TableCell>
                      <TableCell>{statusBadge(site.status)}</TableCell>
                      <TableCell className="text-center">{site.site_workers?.[0]?.count || 0}</TableCell>
                      <TableCell>{site.geofence_radius_m}m</TableCell>
                      <TableCell>{site.start_date ? format(new Date(site.start_date), 'yyyy-MM-dd') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(site)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm(t('common.confirmDelete'))) deleteMutation.mutate(site.id); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
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
            <DialogHeader><DialogTitle>{editingId ? t('workforce.editSite') : t('workforce.newSite')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('workforce.siteName')} *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{t('workforce.siteAddress')}</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('workforce.lat')}</Label><Input type="number" step="any" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} placeholder="3.1390" /></div>
                <div><Label>{t('workforce.lng')}</Label><Input type="number" step="any" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} placeholder="101.6869" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('workforce.geofenceRadius')}</Label><Input type="number" value={form.geofence_radius_m} onChange={e => setForm({ ...form, geofence_radius_m: e.target.value })} /></div>
                <div><Label>{t('workforce.siteStatus')}</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('workforce.siteActive')}</SelectItem>
                      <SelectItem value="completed">{t('workforce.siteCompleted')}</SelectItem>
                      <SelectItem value="suspended">{t('workforce.siteSuspended')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('workforce.startDate')}</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>{t('workforce.endDate')}</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div><Label>{t('common.remark')}</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{t('common.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobilePageShell>
  );
}
