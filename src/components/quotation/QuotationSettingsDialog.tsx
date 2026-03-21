import { useState } from 'react';
import { Settings, Building, Save, Loader2, CreditCard } from 'lucide-react';
import { CompanySettings, CostAnalysis } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompanySettings } from '@/hooks/useCompanySettings';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CompanySettings;
  costAnalysis: CostAnalysis;
  onSettingsChange: (settings: CompanySettings) => void;
  onCostAnalysisChange: (analysis: CostAnalysis) => void;
}

export function QuotationSettingsDialog({ open, onOpenChange, settings, costAnalysis, onSettingsChange, onCostAnalysisChange }: Props) {
  const { updateSettings } = useCompanySettings();
  const [isSaving, setIsSaving] = useState(false);

  const handlePaymentChange = (key: keyof CompanySettings['paymentTerms'], value: string) => {
    onSettingsChange({ ...settings, paymentTerms: { ...settings.paymentTerms, [key]: parseFloat(value) || 0 } });
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      await updateSettings.mutateAsync(settings);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />系统设置</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building className="w-4 h-4" />公司信息</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>公司名称</Label>
                <Input value={settings.companyName} onChange={e => onSettingsChange({ ...settings, companyName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SSM 注册号</Label>
                  <Input placeholder="例如: 202201012345" value={settings.ssmNo || ''} onChange={e => onSettingsChange({ ...settings, ssmNo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>报价有效期 (天)</Label>
                  <Input type="number" min="1" value={settings.validityPeriod} onChange={e => onSettingsChange({ ...settings, validityPeriod: parseInt(e.target.value) || 30 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>公司地址</Label>
                <Input placeholder="公司注册地址" value={settings.companyAddress || ''} onChange={e => onSettingsChange({ ...settings, companyAddress: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>银行信息</Label>
                <Input placeholder="银行名称 / 账号" value={settings.bankInfo || ''} onChange={e => onSettingsChange({ ...settings, bankInfo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>主显示货币</Label>
                <Select value={settings.currency} onValueChange={v => onSettingsChange({ ...settings, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYR">MYR (马币)</SelectItem>
                    <SelectItem value="CNY">CNY (人民币)</SelectItem>
                    <SelectItem value="USD">USD (美元)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" />付款条款</CardTitle><CardDescription>百分比合计须为100%</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>定金 (%)</Label><Input type="number" min="0" max="100" value={settings.paymentTerms.deposit} onChange={e => handlePaymentChange('deposit', e.target.value)} /></div>
                <div className="space-y-2"><Label>进度款 (%)</Label><Input type="number" min="0" max="100" value={settings.paymentTerms.progress} onChange={e => handlePaymentChange('progress', e.target.value)} /></div>
                <div className="space-y-2"><Label>尾款 (%)</Label><Input type="number" min="0" max="100" value={settings.paymentTerms.final} onChange={e => handlePaymentChange('final', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t">
          <Button onClick={handleSaveToDatabase} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</> : <><Save className="w-4 h-4 mr-2" />保存设置到数据库</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
