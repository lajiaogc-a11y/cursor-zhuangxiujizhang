import { useState, useEffect } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Building2, CreditCard, FileText, Save } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { toast } from '@/hooks/use-toast';
import type { CompanySettings } from '@/types/quotation';

export default function QuotationSettings() {
  const { t } = useI18n();
  const { settings, loading, updateSettings } = useCompanySettings();
  const [form, setForm] = useState<CompanySettings>(settings);

  useEffect(() => {
    if (!loading) setForm(settings);
  }, [settings, loading]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(form);
      toast({ title: t('common.saveSuccess') });
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return null;

  return (
    <MobilePageShell
      title={t('quotation.settingsModule')}
      icon={<Settings className="w-5 h-5" />}
      backTo="/quotation"
    >
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Company Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4 text-primary" />
                {t('qs.companyInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('qs.companyName')}</Label>
                <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">SSM No.</Label>
                <Input value={form.ssmNo} onChange={e => setForm(f => ({ ...f, ssmNo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('qs.companyAddress')}</Label>
                <Input value={form.companyAddress} onChange={e => setForm(f => ({ ...f, companyAddress: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('qs.bankInfo')}</Label>
                <Input value={form.bankInfo} onChange={e => setForm(f => ({ ...f, bankInfo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('qs.displayCurrency')}</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYR">MYR</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Payment & Validity */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="w-4 h-4 text-primary" />
                  {t('qs.paymentTerms')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t('qs.deposit')} (%)</Label>
                    <Input type="number" value={form.paymentTerms.deposit}
                      onChange={e => setForm(f => ({ ...f, paymentTerms: { ...f.paymentTerms, deposit: Number(e.target.value) } }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t('qs.progress')} (%)</Label>
                    <Input type="number" value={form.paymentTerms.progress}
                      onChange={e => setForm(f => ({ ...f, paymentTerms: { ...f.paymentTerms, progress: Number(e.target.value) } }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t('qs.finalPayment')} (%)</Label>
                    <Input type="number" value={form.paymentTerms.final}
                      onChange={e => setForm(f => ({ ...f, paymentTerms: { ...f.paymentTerms, final: Number(e.target.value) } }))} />
                  </div>
                </div>
                <div className="mt-3 p-2 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground text-center">
                    {t('qs.total') || '合计'}: {(form.paymentTerms.deposit || 0) + (form.paymentTerms.progress || 0) + (form.paymentTerms.final || 0)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-primary" />
                  {t('qs.validityDays')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input type="number" value={form.validityPeriod}
                    onChange={e => setForm(f => ({ ...f, validityPeriod: Number(e.target.value) }))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{t('qs.days') || '天'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={updateSettings.isPending} className="min-w-[120px] gap-2">
            <Save className="w-4 h-4" />
            {updateSettings.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </div>
    </MobilePageShell>
  );
}
