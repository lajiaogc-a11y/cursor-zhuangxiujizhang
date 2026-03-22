import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useI18n } from '@/lib/i18n';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { AppSectionLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Ruler, Plus, Pencil, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import * as qService from '@/services/quotation.service';

interface MeasurementUnit {
  id: string;
  code: string;
  name_zh: string;
  name_en: string;
  sort_order: number;
  is_system: boolean;
}

const emptyUnit = { name_zh: '', name_en: '', sort_order: 0 };

export default function QuotationUnits() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyUnit);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['q_measurement_units', tenantId],
    queryFn: () => qService.fetchMeasurementUnits() as Promise<MeasurementUnit[]>,
    enabled: !!user && !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: (unit: typeof emptyUnit & { id?: string }) =>
      qService.saveMeasurementUnit(unit, user?.id, tenant?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_measurement_units', tenantId] });
      toast({ title: t('common.success') });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyUnit);
    },
    onError: (e: any) => toast({ title: t('common.error'), description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => qService.deleteMeasurementUnit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_measurement_units', tenantId] });
      toast({ title: t('common.deleteSuccess') });
    },
    onError: (e: any) => toast({ title: t('common.deleteFailed'), description: e.message, variant: 'destructive' }),
  });

  const openAdd = () => { setForm(emptyUnit); setEditingId(null); setDialogOpen(true); };
  const openEdit = (u: MeasurementUnit) => {
    setForm({ name_zh: u.name_zh, name_en: u.name_en, sort_order: u.sort_order });
    setEditingId(u.id);
    setDialogOpen(true);
  };

  const renderMobileCards = () => (
    <div className="space-y-2">
      {units.map(u => (
        <div key={u.id} className="group border rounded-xl p-4 bg-card hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
              <Ruler className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{u.name_zh}</p>
                {u.is_system && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">系统</Badge>
                )}
              </div>
              {u.name_en && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.name_en}</p>
              )}
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0 tabular-nums">
              #{u.sort_order}
            </Badge>
            <div className="flex gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {!u.is_system && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(t('common.deleteWarning'))) deleteMutation.mutate(u.id); }}>
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
    <div className="border rounded-xl overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">{t('quotation.unitNameZh')}</TableHead>
            <TableHead className="font-semibold">{t('quotation.unitNameEn')}</TableHead>
            <TableHead className="w-24 text-center font-semibold">{t('quotation.unitSort')}</TableHead>
            <TableHead className="w-28 text-center font-semibold">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map(u => (
            <TableRow key={u.id} className="group hover:bg-muted/30 transition-colors">
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name_zh}</span>
                  {u.is_system && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">系统</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{u.name_en}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="text-xs tabular-nums">{u.sort_order}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(u)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {!u.is_system && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { if (confirm(t('common.deleteWarning'))) deleteMutation.mutate(u.id); }}>
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
    <MobilePageShell title={t('quotation.units')} icon={<Ruler className="w-5 h-5" />} backTo="/quotation">
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">{t('quotation.unitsDesc')}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {units.length} {t('quotation.units')}
            </p>
          </div>
          <Button size="sm" onClick={openAdd} className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />{t('common.add')}
          </Button>
        </div>

        {isLoading ? (
          <AppSectionLoading label={t('common.loading')} compact />
        ) : units.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Ruler className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground">{t('common.noData')}</p>
            <Button className="mt-4" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />{t('common.add')}</Button>
          </div>
        ) : isMobile ? renderMobileCards() : renderTable()}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t('common.edit') : t('common.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('quotation.unitNameZh')}</Label>
              <Input value={form.name_zh} onChange={e => setForm(f => ({ ...f, name_zh: e.target.value }))} placeholder="e.g. 尺, 平方米" />
            </div>
            <div className="space-y-2">
              <Label>{t('quotation.unitNameEn')}</Label>
              <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="e.g. ft, sqm" />
            </div>
            <div className="space-y-2">
              <Label>{t('quotation.unitSort')}</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => saveMutation.mutate(editingId ? { ...form, id: editingId } : form)} disabled={!form.name_zh || saveMutation.isPending}>
              {saveMutation.isPending && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobilePageShell>
  );
}
