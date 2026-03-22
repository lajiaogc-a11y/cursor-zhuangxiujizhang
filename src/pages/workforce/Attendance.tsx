import { useState, useCallback, useRef } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workforceService } from '@/services';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { useTenant } from '@/lib/tenant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  MapPin, Camera, Clock, CheckCircle, XCircle, LogIn, LogOut,
  AlertTriangle, RefreshCw,
} from 'lucide-react';

interface GeoPosition { lat: number; lng: number; accuracy: number }

function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function CameraCapture({ onCapture }: { onCapture: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onCapture(f); }} />
      <Button type="button" variant="outline" className="w-full gap-2" onClick={() => inputRef.current?.click()}>
        <Camera className="w-4 h-4" /> 拍照 / Take Photo
      </Button>
    </>
  );
}

export default function AttendancePage() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const qc = useQueryClient();

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinType, setCheckinType] = useState<'in' | 'out'>('in');
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gps, setGps] = useState<GeoPosition | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [filterSite, setFilterSite] = useState('all');
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: sites = [] } = useQuery({
    queryKey: ['workforce-active-sites', tenantId],
    queryFn: () => workforceService.fetchActiveSites(tenantId!),
    enabled: !!tenantId,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workforce-site-workers', selectedSite],
    queryFn: () => workforceService.fetchSiteWorkers(selectedSite),
    enabled: !!selectedSite,
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance-records', filterSite, filterDate, tenantId],
    queryFn: () => workforceService.fetchAttendanceRecords(tenantId!, filterDate, filterSite),
    enabled: !!tenantId,
  });

  const todayCheckedIn = records.filter((r: any) => r.check_in_time).length;
  const todayCheckedOut = records.filter((r: any) => r.check_out_time).length;
  const outsideGeofence = records.filter((r: any) => r.is_within_geofence === false).length;

  const fetchGps = useCallback(async () => {
    setGpsLoading(true); setGpsError('');
    try { setGps(await getCurrentPosition()); }
    catch (err: any) { setGpsError(err.message || t('attendance.gpsError')); }
    finally { setGpsLoading(false); }
  }, [t]);

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSite || !selectedWorker) throw new Error('Missing site or worker');
      let photoUrl: string | null = null;
      if (photo) photoUrl = await workforceService.uploadPhoto(photo);

      let withinGeofence: boolean | null = null;
      if (gps) {
        const site = sites.find((s: any) => s.id === selectedSite);
        if (site?.lat && site?.lng && site?.geofence_radius_m) {
          const dist = haversine(gps.lat, gps.lng, Number(site.lat), Number(site.lng));
          withinGeofence = dist <= Number(site.geofence_radius_m);
        }
      }

      if (checkinType === 'in') {
        await workforceService.checkIn(tenantId!, {
          worker_id: selectedWorker, site_id: selectedSite,
          check_in_time: new Date().toISOString(),
          check_in_lat: gps?.lat, check_in_lng: gps?.lng,
          check_in_photo_url: photoUrl, check_in_method: 'gps_photo',
          is_within_geofence: withinGeofence, comment,
        });
      } else {
        await workforceService.checkOut(selectedWorker, selectedSite, {
          check_out_lat: gps?.lat ?? null, check_out_lng: gps?.lng ?? null,
          check_out_photo_url: photoUrl, check_out_method: 'gps_photo', comment,
        });
      }
    },
    onSuccess: () => {
      toast.success(checkinType === 'in' ? t('attendance.checkinSuccess') : t('attendance.checkoutSuccess'));
      qc.invalidateQueries({ queryKey: ['attendance-records'] });
      resetDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetDialog = () => {
    setCheckinOpen(false); setSelectedWorker(''); setComment('');
    setPhoto(null); setPhotoPreview(null); setGps(null); setGpsError('');
  };

  const openCheckin = (type: 'in' | 'out') => { setCheckinType(type); setCheckinOpen(true); fetchGps(); };
  const handlePhotoCapture = (file: File) => { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'checked_in': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200"><LogIn className="w-3 h-3 mr-1" />{t('attendance.checkedIn')}</Badge>;
      case 'checked_out': return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />{t('attendance.checkedOut')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MobilePageShell title={t('workforce.attendance')} icon={<Clock className="w-5 h-5" />} backTo="/workforce"
      headerActions={
        <div className="flex gap-1">
          <Button size="sm" className="h-8 gap-1" onClick={() => openCheckin('in')}><LogIn className="w-4 h-4" /> {t('attendance.checkIn')}</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openCheckin('out')}><LogOut className="w-4 h-4" /> {t('attendance.checkOut')}</Button>
        </div>
      }>
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><LogIn className="w-5 h-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">{t('attendance.todayCheckedIn')}</p><p className="text-2xl font-bold">{todayCheckedIn}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="w-5 h-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">{t('attendance.todayCheckedOut')}</p><p className="text-2xl font-bold">{todayCheckedOut}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-orange-500/10"><AlertTriangle className="w-5 h-5 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">{t('attendance.outsideGeofence')}</p><p className="text-2xl font-bold">{outsideGeofence}</p></div></CardContent></Card>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <Select value={filterSite} onValueChange={setFilterSite}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('attendance.allSites')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('attendance.allSites')}</SelectItem>
              {sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => qc.invalidateQueries({ queryKey: ['attendance-records'] })}><RefreshCw className="w-4 h-4" /></Button>
        </div>

        <Card>
          <CardHeader><CardTitle>{t('attendance.records')}</CardTitle></CardHeader>
          <CardContent>
            {recordsLoading ? (
              <AppSectionLoading label={t('common.loading')} compact />
            ) : records.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('attendance.worker')}</TableHead><TableHead>{t('attendance.site')}</TableHead>
                    <TableHead>{t('attendance.checkInTime')}</TableHead><TableHead>{t('attendance.checkOutTime')}</TableHead>
                    <TableHead>{t('attendance.duration')}</TableHead><TableHead>{t('attendance.geofence')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {records.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.worker?.name ?? '-'}</TableCell>
                        <TableCell>{r.site?.name ?? '-'}</TableCell>
                        <TableCell>{r.check_in_time ? format(parseISO(r.check_in_time), 'HH:mm:ss') : '-'}</TableCell>
                        <TableCell>{r.check_out_time ? format(parseISO(r.check_out_time), 'HH:mm:ss') : '-'}</TableCell>
                        <TableCell>{r.duration_minutes != null ? `${Math.floor(r.duration_minutes / 60)}h ${r.duration_minutes % 60}m` : '-'}</TableCell>
                        <TableCell>
                          {r.is_within_geofence === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {r.is_within_geofence === false && <XCircle className="w-4 h-4 text-destructive" />}
                          {r.is_within_geofence == null && <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={checkinOpen} onOpenChange={(open) => { if (!open) resetDialog(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{checkinType === 'in' ? t('attendance.checkIn') : t('attendance.checkOut')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('workforce.site')}</label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger><SelectValue placeholder={t('workforce.selectSite')} /></SelectTrigger>
                  <SelectContent>{sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('attendance.worker')}</label>
                <Select value={selectedWorker} onValueChange={setSelectedWorker} disabled={!selectedSite}>
                  <SelectTrigger><SelectValue placeholder={t('attendance.selectWorker')} /></SelectTrigger>
                  <SelectContent>{workers.map((sw: any) => <SelectItem key={sw.worker?.id} value={sw.worker?.id ?? ''}>{sw.worker?.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="p-3 border rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1"><MapPin className="w-4 h-4" /> {t('attendance.gpsLocation')}</span>
                  <Button variant="ghost" size="sm" onClick={fetchGps} disabled={gpsLoading}>{gpsLoading ? <ChromeLoadingSpinner variant="muted" className="h-4 w-4" /> : <RefreshCw className="w-4 h-4" />}</Button>
                </div>
                {gps && <p className="text-xs text-muted-foreground">{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} (±{Math.round(gps.accuracy)}m)</p>}
                {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}
              </div>
              <CameraCapture onCapture={handlePhotoCapture} />
              {photoPreview && <img src={photoPreview} alt="Preview" className="w-full rounded-md max-h-40 object-cover" />}
              <div><label className="text-sm font-medium mb-1 block">{t('common.remark')}</label><Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>{t('common.cancel')}</Button>
              <Button onClick={() => checkinMutation.mutate()} disabled={!selectedSite || !selectedWorker || checkinMutation.isPending}>
                {checkinMutation.isPending && <ChromeLoadingSpinner variant="muted" className="mr-1 h-4 w-4" />}
                {checkinType === 'in' ? t('attendance.checkIn') : t('attendance.checkOut')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobilePageShell>
  );
}
