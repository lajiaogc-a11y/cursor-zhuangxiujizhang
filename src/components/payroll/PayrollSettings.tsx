import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Save, Loader2 } from 'lucide-react';
import * as payrollService from '@/services/payroll.service';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

interface PayrollSetting {
  id: string;
  setting_type: string;
  setting_key: string;
  setting_value: Record<string, any>;
  is_active: boolean;
}

interface Position {
  id: string;
  name: string;
  is_active: boolean;
}

export function PayrollSettings() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<PayrollSetting[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Insurance settings state
  const [employeeRate, setEmployeeRate] = useState(11);
  const [companyRate, setCompanyRate] = useState(13);

  // Attendance settings state
  const [fullBonusAmount, setFullBonusAmount] = useState(200);
  const [requiredDays, setRequiredDays] = useState(22);

  // Bonus pool state
  const [poolTotal, setPoolTotal] = useState(0);

  // Dialogs
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [positionBonusDialogOpen, setPositionBonusDialogOpen] = useState(false);
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PayrollSetting | null>(null);

  // Form state
  const [bonusTitle, setBonusTitle] = useState('');
  const [bonusPercent, setBonusPercent] = useState(0);
  const [bonusFixed, setBonusFixed] = useState(0);
  const [bonusPeriod, setBonusPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [positionBonusAmount, setPositionBonusAmount] = useState(0);
  const [poolPosition, setPoolPosition] = useState('');
  const [poolPercent, setPoolPercent] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [settingsData, positionsData] = await Promise.all([
      payrollService.fetchPayrollSettings(),
      payrollService.fetchActivePositions(),
    ]);

    setSettings(settingsData as PayrollSetting[]);
    
    // Parse insurance settings
    const empRate = settingsData.find((s: any) => s.setting_key === 'employee_rate');
    if (empRate) setEmployeeRate((empRate.setting_value as any)?.percent || 11);
    
    const compRate = settingsData.find((s: any) => s.setting_key === 'company_rate');
    if (compRate) setCompanyRate((compRate.setting_value as any)?.percent || 13);
    
    // Parse attendance settings
    const fullBonus = settingsData.find((s: any) => s.setting_key === 'full_bonus');
    if (fullBonus) {
      setFullBonusAmount((fullBonus.setting_value as any)?.amount || 200);
      setRequiredDays((fullBonus.setting_value as any)?.required_days || 22);
    }

    // Parse pool total
    const pool = settingsData.find((s: any) => s.setting_key === 'pool_total');
    if (pool) setPoolTotal((pool.setting_value as any)?.amount || 0);

    setPositions(positionsData as Position[]);
    setLoading(false);
  };

  const handleSaveInsurance = async () => {
    setSaving(true);
    try {
      await Promise.all([
        payrollService.upsertPayrollSetting('insurance', 'employee_rate', { percent: employeeRate }),
        payrollService.upsertPayrollSetting('insurance', 'company_rate', { percent: companyRate }),
      ]);
      toast.success(t('common.updateSuccess'));
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
    setSaving(false);
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      await payrollService.upsertPayrollSetting('attendance', 'full_bonus', { amount: fullBonusAmount, required_days: requiredDays });
      toast.success(t('common.updateSuccess'));
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
    setSaving(false);
  };

  const handleSavePoolTotal = async () => {
    setSaving(true);
    try {
      await payrollService.upsertPayrollSetting('bonus_pool', 'pool_total', { amount: poolTotal });
      toast.success(t('common.updateSuccess'));
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
    setSaving(false);
  };

  const handleAddBonus = async () => {
    if (!bonusTitle.trim()) return;
    setSaving(true);
    try {
      await payrollService.upsertPayrollSetting('bonus', bonusTitle.trim(), {
        title: bonusTitle.trim(), percent: bonusPercent, fixed: bonusFixed, period: bonusPeriod,
      });
      toast.success(t('common.addSuccess'));
      setBonusDialogOpen(false);
      resetBonusForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
    setSaving(false);
  };

  const handleAddPositionBonus = async () => {
    if (!selectedPosition) return;
    setSaving(true);
    try {
      await payrollService.upsertPayrollSetting('position_bonus', selectedPosition, { fixed: positionBonusAmount });
      toast.success(t('common.addSuccess'));
      setPositionBonusDialogOpen(false);
      resetPositionBonusForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
    setSaving(false);
  };

  const handleAddPoolPercent = async () => {
    if (!poolPosition) return;
    setSaving(true);
    try {
      await payrollService.upsertPayrollSetting('pool_percent', poolPosition, { pool_percent: poolPercent });
      toast.success(t('common.addSuccess'));
      setPoolDialogOpen(false);
      resetPoolForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
    setSaving(false);
  };

  const handleDeleteSetting = async (setting: PayrollSetting) => {
    if (!confirm(t('payroll.deleteConfirm'))) return;
    try {
      await payrollService.deletePayrollSetting(setting.id);
      toast.success(t('common.deleteSuccess'));
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetBonusForm = () => {
    setBonusTitle('');
    setBonusPercent(0);
    setBonusFixed(0);
    setBonusPeriod('monthly');
  };

  const resetPositionBonusForm = () => {
    setSelectedPosition('');
    setPositionBonusAmount(0);
  };

  const resetPoolForm = () => {
    setPoolPosition('');
    setPoolPercent(0);
  };

  const bonusRules = settings.filter(s => s.setting_type === 'bonus');
  const positionBonuses = settings.filter(s => s.setting_type === 'position_bonus');
  const poolPercents = settings.filter(s => s.setting_type === 'pool_percent');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Insurance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('payroll.insuranceSettings')}</CardTitle>
          <CardDescription>{t('payroll.insuranceSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('payroll.employeeInsuranceRate')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={employeeRate}
                  onChange={(e) => setEmployeeRate(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                <span>%</span>
              </div>
            </div>
            <div>
              <Label>{t('payroll.companyInsuranceRate')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={companyRate}
                  onChange={(e) => setCompanyRate(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                <span>%</span>
              </div>
            </div>
          </div>
          <Button onClick={handleSaveInsurance} className="mt-4" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            {t('common.save')}
          </Button>
        </CardContent>
      </Card>

      {/* Attendance Bonus Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('payroll.attendanceSettings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('payroll.fullAttendanceAmount')}</Label>
              <div className="flex items-center gap-2">
                <span>RM</span>
                <Input
                  type="number"
                  value={fullBonusAmount}
                  onChange={(e) => setFullBonusAmount(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
              </div>
            </div>
            <div>
              <Label>{t('payroll.requiredDays')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={requiredDays}
                  onChange={(e) => setRequiredDays(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <span>{t('payroll.days')}</span>
              </div>
            </div>
          </div>
          <Button onClick={handleSaveAttendance} className="mt-4" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            {t('common.save')}
          </Button>
        </CardContent>
      </Card>

      {/* Bonus Rules */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('payroll.bonusRules')}</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBonusDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('payroll.addRule')}
          </Button>
        </CardHeader>
        <CardContent>
          {bonusRules.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('common.noData')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('payroll.bonusTitle')}</TableHead>
                  <TableHead className="text-right">{t('payroll.bonusPercent')}</TableHead>
                  <TableHead className="text-right">{t('payroll.bonusFixed')}</TableHead>
                  <TableHead className="text-center">{t('payroll.bonusPeriod')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonusRules.map((rule) => {
                  const period = (rule.setting_value as any)?.period || 'monthly';
                  const periodLabel = period === 'monthly' ? t('payroll.periodMonthly') 
                    : period === 'quarterly' ? t('payroll.periodQuarterly') 
                    : t('payroll.periodYearly');
                  return (
                    <TableRow key={rule.id}>
                      <TableCell>{(rule.setting_value as any)?.title || rule.setting_key}</TableCell>
                      <TableCell className="text-right">
                        {(rule.setting_value as any)?.percent ? `${(rule.setting_value as any).percent}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {(rule.setting_value as any)?.fixed ? `RM ${(rule.setting_value as any).fixed}` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs px-2 py-1 rounded bg-muted">{periodLabel}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSetting(rule)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Position Bonus */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('payroll.positionBonus')}</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPositionBonusDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('payroll.addRule')}
          </Button>
        </CardHeader>
        <CardContent>
          {positionBonuses.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('common.noData')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('payroll.position')}</TableHead>
                  <TableHead className="text-right">{t('payroll.fixedAmount')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positionBonuses.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.setting_key}</TableCell>
                    <TableCell className="text-right">RM {(rule.setting_value as any)?.fixed || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSetting(rule)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bonus Pool Distribution */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('payroll.bonusPool')}</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPoolDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('payroll.addRule')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>{t('payroll.poolTotal')}</Label>
            <div className="flex items-center gap-2">
              <span>RM</span>
              <Input
                type="number"
                value={poolTotal}
                onChange={(e) => setPoolTotal(parseFloat(e.target.value) || 0)}
                className="w-40"
              />
              <Button variant="outline" size="sm" onClick={handleSavePoolTotal} disabled={saving}>
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {poolPercents.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('common.noData')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('payroll.position')}</TableHead>
                  <TableHead className="text-right">{t('payroll.poolPercent')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poolPercents.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.setting_key}</TableCell>
                    <TableCell className="text-right">{(rule.setting_value as any)?.pool_percent || 0}%</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSetting(rule)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Bonus Dialog */}
      <Dialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('payroll.addRule')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('payroll.bonusTitle')}</Label>
              <Input value={bonusTitle} onChange={(e) => setBonusTitle(e.target.value)} placeholder={t('payroll.bonusTitlePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('payroll.bonusPercent')}</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={bonusPercent} onChange={(e) => setBonusPercent(parseFloat(e.target.value) || 0)} />
                  <span>%</span>
                </div>
              </div>
              <div>
                <Label>{t('payroll.bonusFixed')}</Label>
                <div className="flex items-center gap-2">
                  <span>RM</span>
                  <Input type="number" value={bonusFixed} onChange={(e) => setBonusFixed(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div>
              <Label>{t('payroll.bonusPeriod')}</Label>
              <Select value={bonusPeriod} onValueChange={(v) => setBonusPeriod(v as 'monthly' | 'quarterly' | 'yearly')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t('payroll.periodMonthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('payroll.periodQuarterly')}</SelectItem>
                  <SelectItem value="yearly">{t('payroll.periodYearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBonusDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddBonus} disabled={saving || !bonusTitle.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Position Bonus Dialog */}
      <Dialog open={positionBonusDialogOpen} onOpenChange={setPositionBonusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('payroll.positionBonus')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('payroll.selectPosition')}</Label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger>
                  <SelectValue placeholder={t('payroll.selectPosition')} />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('payroll.fixedAmount')}</Label>
              <div className="flex items-center gap-2">
                <span>RM</span>
                <Input type="number" value={positionBonusAmount} onChange={(e) => setPositionBonusAmount(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionBonusDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddPositionBonus} disabled={saving || !selectedPosition}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Pool Percent Dialog */}
      <Dialog open={poolDialogOpen} onOpenChange={setPoolDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('payroll.bonusPool')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('payroll.selectPosition')}</Label>
              <Select value={poolPosition} onValueChange={setPoolPosition}>
                <SelectTrigger>
                  <SelectValue placeholder={t('payroll.selectPosition')} />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('payroll.poolPercent')}</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={poolPercent} onChange={(e) => setPoolPercent(parseFloat(e.target.value) || 0)} />
                <span>%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoolDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddPoolPercent} disabled={saving || !poolPosition}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
