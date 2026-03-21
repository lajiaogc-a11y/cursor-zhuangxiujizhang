import { useState, useEffect } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Percent, Save, Receipt, Ship, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

export default function TaxSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['q_company_settings_tax'],
    queryFn: () => costService.fetchTaxSettings(),
    enabled: !!user,
  });

  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => costService.saveTaxSettings(form, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_company_settings_tax'] });
      queryClient.invalidateQueries({ queryKey: ['q_company_settings'] });
      toast({ title: t('cost.settingsSaved') });
    },
    onError: (e: any) => toast({ title: t('cost.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  if (isLoading || !form) return (
    <MobilePageShell title={t('cost.taxSettings')} icon={<Percent className="w-5 h-5" />} backTo="/cost">
      <div className="p-4 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
    </MobilePageShell>
  );

  return (
    <MobilePageShell title={t('cost.taxSettings')} icon={<Percent className="w-5 h-5" />} backTo="/cost"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => save.mutate()} disabled={save.isPending}><Save className="w-4 h-4" /> {t('common.save')}</Button>}>
      <div className="p-4 space-y-4">
        {/* SST Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{t('cost.sstSettings')}</p>
              <p className="text-xs text-muted-foreground">Sales & Service Tax</p>
            </div>
            <Switch checked={form.sstEnabled} onCheckedChange={v => setForm({...form, sstEnabled: v})} />
          </div>
          {form.sstEnabled && (
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs">{t('cost.sstPct')}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="number" min={0} max={100} step={0.1} value={form.sstPct} onChange={e => setForm({...form, sstPct: Number(e.target.value)})} className="max-w-[120px]" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('cost.sstPctHint')}</p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Shipping Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Ship className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{t('cost.shippingRate')}</p>
              <p className="text-xs text-muted-foreground">{t('cost.internationalShipping')}</p>
            </div>
          </div>
          <CardContent className="p-4">
            <div>
              <Label className="text-xs">{t('cost.ratePerCbm')}</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">RM</span>
                <Input type="number" value={form.shippingRatePerCbm} onChange={e => setForm({...form, shippingRatePerCbm: Number(e.target.value)})} className="max-w-[150px]" />
                <span className="text-sm text-muted-foreground">/ CBM</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{t('cost.validityPeriodDays')}</p>
              <p className="text-xs text-muted-foreground">{t('cost.quotationValidity')}</p>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Input type="number" value={form.validityPeriod} onChange={e => setForm({...form, validityPeriod: Number(e.target.value)})} className="max-w-[100px]" />
              <span className="text-sm text-muted-foreground">{t('cost.days')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobilePageShell>
  );
}
