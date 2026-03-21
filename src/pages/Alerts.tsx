import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, AlertTriangle, CheckCircle, Clock, Settings,
  Calendar, Building2, RefreshCw, Play
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import type { Database } from '@/integrations/supabase/types';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import {
  useAlertsData, useResolveAlert, useSaveRule,
  useToggleRule, useDeleteRule, useGenerateAlerts,
} from '@/hooks/useAlertsService';

type AlertRule = Database['public']['Tables']['alert_rules']['Row'];

const DATE_BASED_RULES = ['delivery_upcoming', 'warranty_expiring', 'final_payment_due', 'payment_overdue'];

export default function Alerts() {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('feature.edit');
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [selectedRuleType, setSelectedRuleType] = useState<string>('profit_warning');

  // ─── Data hooks ─────────────────────────────────────
  const { data: alertsData, isLoading: loading, refetch } = useAlertsData(tenantId);
  const alerts = alertsData?.alerts || [];
  const rules = alertsData?.rules || [];
  const unresolvedAlerts = alerts.filter(a => !a.is_resolved);
  const resolvedAlerts = alerts.filter(a => a.is_resolved);

  // ─── Mutations ──────────────────────────────────────
  const resolveMutation = useResolveAlert(tenantId);
  const saveMutation = useSaveRule(tenantId);
  const toggleMutation = useToggleRule();
  const deleteMutation = useDeleteRule();
  const generateMutation = useGenerateAlerts();

  const handleResolveAlert = (alertId: string) => {
    if (!canEdit) return;
    resolveMutation.mutate(alertId, {
      onSuccess: () => toast({ title: t('alerts.markedResolved') }),
      onError: (e: any) => toast({ title: t('alerts.operateFailed'), description: e.message, variant: 'destructive' }),
    });
  };

  const handleGenerateAlerts = () => {
    if (!tenantId) return;
    generateMutation.mutate({
      tenantId,
      messages: {
        profitWarningMsg: t('alerts.profitWarningMsg'),
        warrantyExpiringMsg: t('alerts.warrantyExpiringMsg'),
        deliveryUpcomingMsg: t('alerts.deliveryUpcomingMsg'),
        finalPaymentDueMsg: t('alerts.finalPaymentDueMsg'),
        paymentOverdueMsg: t('alerts.paymentOverdueMsg'),
        balanceWarningMsg: t('alerts.balanceWarningMsg'),
        totalBalanceWarningMsg: t('alerts.totalBalanceWarningMsg'),
        cash: t('alerts.cash'),
        bank: t('alerts.bank'),
      },
    }, {
      onSuccess: (count) => {
        if (count === -1) toast({ title: t('alerts.noActiveRules') });
        else if (count === 0) toast({ title: t('alerts.noAlertsNeeded') });
        else toast({ title: t('alerts.generateSuccess').replace('{count}', String(count)) });
      },
      onError: () => toast({ title: t('alerts.generateFailed'), variant: 'destructive' }),
    });
  };

  const handleSaveRule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit) return;
    const fd = new FormData(e.currentTarget);
    const ruleType = fd.get('rule_type') as string;
    const payload: any = {
      rule_name: fd.get('rule_name') as string,
      rule_type: ruleType as Database['public']['Enums']['alert_type'],
      is_active: fd.get('is_active') === 'on',
    };
    const alertDays = fd.get('alert_days_before') as string;
    payload.alert_days_before = alertDays?.trim() ? parseInt(alertDays) : null;

    if (ruleType === 'low_balance') {
      const bv = fd.get('balance_threshold') as string;
      payload.threshold_value = bv?.trim() ? parseFloat(bv) : null;
      payload.account_currency = fd.get('account_currency') as string || null;
      payload.account_type = fd.get('account_type') as string || null;
    } else {
      const tv = fd.get('threshold_value') as string;
      payload.threshold_value = tv?.trim() ? parseFloat(tv) : null;
    }

    saveMutation.mutate({ payload, editingRuleId: editingRule?.id }, {
      onSuccess: () => {
        toast({ title: editingRule ? t('alerts.ruleUpdated') : t('alerts.ruleCreated') });
        setRuleDialogOpen(false);
        setEditingRule(null);
      },
      onError: (e: any) => toast({ title: editingRule ? t('alerts.updateFailed') : t('alerts.createFailed'), description: e.message, variant: 'destructive' }),
    });
  };

  const handleToggleRule = (rule: AlertRule) => {
    if (!canEdit) {
      toast({ title: t('alerts.noPermission'), description: t('alerts.noPermissionDesc'), variant: 'destructive' });
      return;
    }
    toggleMutation.mutate({ ruleId: rule.id, currentActive: rule.is_active || false });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!canEdit) {
      toast({ title: t('alerts.noPermission'), description: t('alerts.noPermissionDesc'), variant: 'destructive' });
      return;
    }
    if (!confirm(t('alerts.confirmDeleteRule'))) return;
    deleteMutation.mutate(ruleId, {
      onSuccess: () => toast({ title: t('alerts.ruleDeleted') }),
    });
  };

  // ─── Helpers ────────────────────────────────────────
  const getAlertIcon = (type: string) => {
    const isDate = ['delivery_upcoming', 'warranty_expiring', 'final_payment_due'].includes(type);
    return isDate ? <Calendar className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />;
  };

  const getAlertLevelStyle = (level: string) => {
    if (level === 'danger') return 'border-destructive/50 bg-destructive/5';
    if (level === 'warning') return 'border-warning/50 bg-warning/5';
    return 'border-muted';
  };

  const ruleTypeLabels: Record<string, string> = {
    profit_warning: t('alerts.profitWarning'),
    delivery_upcoming: t('alerts.deliveryUpcoming'),
    warranty_expiring: t('alerts.warrantyExpiring'),
    final_payment_due: t('alerts.finalPaymentDue'),
    payment_overdue: t('alerts.paymentOverdue'),
    low_balance: t('alerts.lowBalance'),
  };

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-end">
          {isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={handleGenerateAlerts} disabled={generateMutation.isPending}>
                    <Play className="w-4 h-4 mr-2" />
                    {generateMutation.isPending ? t('common.loading') : t('common.refresh')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />{t('common.refresh')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              {canEdit && (
                <Button onClick={handleGenerateAlerts} disabled={generateMutation.isPending} variant="default">
                  <Play className="w-4 h-4 mr-2" />
                  {generateMutation.isPending ? t('common.loading') : t('common.refresh')}
                </Button>
              )}
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />{t('common.refresh')}
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="stat-card">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('alerts.pending')}</p>
                  <p className="text-xl sm:text-3xl font-bold">{unresolvedAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('alerts.resolved')}</p>
                  <p className="text-xl sm:text-3xl font-bold">{resolvedAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('alerts.rules')}</p>
                  <p className="text-xl sm:text-3xl font-bold">{rules.filter(r => r.is_active).length}/{rules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="alerts" className="w-full">
          <TabsList>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {t('alerts.alertList')}
              {unresolvedAlerts.length > 0 && <Badge variant="destructive" className="ml-1">{unresolvedAlerts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />{t('alerts.alertRules')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="mt-6">
            <Card>
              <CardHeader><CardTitle>{t('alerts.alertList')}</CardTitle></CardHeader>
              <CardContent>
                {unresolvedAlerts.length === 0 && resolvedAlerts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">{t('alerts.noAlerts')}</p>
                    <p className="text-sm">{t('alerts.noAlertsDesc')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {unresolvedAlerts.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('alerts.pending')} ({unresolvedAlerts.length})</h3>
                        <div className="space-y-3">
                          {unresolvedAlerts.map(alert => (
                            <div key={alert.id} className={`p-4 border rounded-lg ${getAlertLevelStyle(alert.alert_level)}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 ${alert.alert_level === 'danger' ? 'text-destructive' : 'text-warning'}`}>
                                    {getAlertIcon(alert.alert_type)}
                                  </div>
                                  <div>
                                    <p className="font-medium">{alert.alert_message}</p>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                      {alert.projects && (
                                        <>
                                          <Building2 className="w-4 h-4" />
                                          <span>{alert.projects.project_code} - {alert.projects.project_name}</span>
                                          <span>·</span>
                                        </>
                                      )}
                                      <Clock className="w-4 h-4" />
                                      <span>{format(new Date(alert.created_at), 'yyyy-MM-dd HH:mm')}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={alert.alert_level === 'danger' ? 'destructive' : 'secondary'}>
                                    {alert.alert_level === 'danger' ? t('alerts.critical') : t('alerts.warning')}
                                  </Badge>
                                  {canEdit && (
                                    <Button size="sm" variant="outline" onClick={() => handleResolveAlert(alert.id)}>
                                      <CheckCircle className="w-4 h-4 mr-1" />{t('alerts.markResolved')}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {resolvedAlerts.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('alerts.resolved')} ({resolvedAlerts.length})</h3>
                        <div className="space-y-2">
                          {resolvedAlerts.slice(0, 10).map(alert => (
                            <div key={alert.id} className="p-3 border rounded-lg bg-muted/30 opacity-70">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-success" />
                                  <span className="text-sm">{alert.alert_message}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {alert.resolved_at && format(new Date(alert.resolved_at), 'MM-dd HH:mm')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('alerts.alertRulesConfig')}</CardTitle>
                {canEdit && (
                  <Dialog open={ruleDialogOpen} onOpenChange={(open) => {
                    setRuleDialogOpen(open);
                    if (!open) { setEditingRule(null); setSelectedRuleType('profit_warning'); }
                  }}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { setEditingRule(null); setSelectedRuleType('profit_warning'); }}>
                        <Settings className="w-4 h-4 mr-2" />{t('alerts.addRule')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingRule ? t('alerts.editRule') : t('alerts.addAlertRule')}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveRule} className="space-y-4">
                        <div className="space-y-2">
                          <Label>{t('alerts.ruleName')}</Label>
                          <Input name="rule_name" defaultValue={editingRule?.rule_name || ''} required />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('alerts.ruleType')}</Label>
                          <select name="rule_type" value={selectedRuleType} onChange={e => setSelectedRuleType(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md bg-background">
                            <option value="profit_warning">{t('alerts.profitWarning')}</option>
                            <option value="delivery_upcoming">{t('alerts.deliveryUpcoming')}</option>
                            <option value="warranty_expiring">{t('alerts.warrantyExpiring')}</option>
                            <option value="final_payment_due">{t('alerts.finalPaymentDue')}</option>
                            <option value="payment_overdue">{t('alerts.paymentOverdue')}</option>
                            <option value="low_balance">{t('alerts.lowBalance')}</option>
                          </select>
                          <p className="text-xs text-muted-foreground">
                            {DATE_BASED_RULES.includes(selectedRuleType) && !['payment_overdue'].includes(selectedRuleType) && t('alerts.dateRuleHint')}
                            {selectedRuleType === 'payment_overdue' && t('alerts.overdueRuleHint')}
                            {selectedRuleType === 'profit_warning' && t('alerts.profitRuleHint')}
                            {selectedRuleType === 'low_balance' && t('alerts.balanceRuleHint')}
                          </p>
                        </div>

                        {DATE_BASED_RULES.includes(selectedRuleType) && selectedRuleType !== 'payment_overdue' && (
                          <div className="space-y-2">
                            <Label>{t('alerts.daysBeforeRequired')} <span className="text-destructive">*</span></Label>
                            <Input name="alert_days_before" type="number" defaultValue={editingRule?.alert_days_before || 7} placeholder="例如：7 表示提前7天提醒" required />
                            <p className="text-xs text-muted-foreground">设置在日期到来前多少天触发预警</p>
                          </div>
                        )}

                        {selectedRuleType === 'payment_overdue' && (
                          <div className="space-y-2">
                            <Label>{t('alerts.overdueThresholdLabel')} <span className="text-destructive">*</span></Label>
                            <Input name="threshold_value" type="number" defaultValue={editingRule?.threshold_value || 30} placeholder="例如：30 表示逾期超过30天时预警" required />
                            <p className="text-xs text-muted-foreground">尾款逾期超过此天数时触发预警</p>
                          </div>
                        )}

                        {selectedRuleType === 'profit_warning' && (
                          <div className="space-y-2">
                            <Label>{t('alerts.profitThresholdLabel')} <span className="text-destructive">*</span></Label>
                            <Input name="threshold_value" type="number" step="0.01" defaultValue={editingRule?.threshold_value || 30} placeholder="例如：30 表示利润率低于30%时预警" required />
                            <p className="text-xs text-muted-foreground">项目利润率低于此百分比时触发预警</p>
                          </div>
                        )}

                        {selectedRuleType === 'low_balance' && (
                          <div className="space-y-3 p-3 bg-muted rounded-lg">
                            <div className="space-y-2">
                              <Label>{t('alerts.warningThreshold')} <span className="text-destructive">*</span></Label>
                              <Input name="balance_threshold" type="number" step="0.01" defaultValue={editingRule?.threshold_value || 10000} placeholder="例如：10000 表示余额低于10000时预警" required />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">{t('alerts.currency')}</Label>
                                <select name="account_currency" defaultValue={editingRule?.account_currency || ''} className="w-full px-2 py-1.5 text-sm border rounded-md bg-background">
                                  <option value="">{t('alerts.allCurrencies')}</option>
                                  <option value="MYR">{t('alerts.myr')}</option>
                                  <option value="CNY">{t('alerts.cny')}</option>
                                  <option value="USD">{t('alerts.usd')}</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">{t('alerts.accountType')}</Label>
                                <select name="account_type" defaultValue={editingRule?.account_type || ''} className="w-full px-2 py-1.5 text-sm border rounded-md bg-background">
                                  <option value="">{t('alerts.allAccounts')}</option>
                                  <option value="cash">{t('alerts.cashLabel')}</option>
                                  <option value="bank">{t('alerts.bankLabel')}</option>
                                </select>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">💡 {t('alerts.balanceMonitorHint')}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Switch name="is_active" defaultChecked={editingRule?.is_active !== false} />
                          <Label>{t('alerts.enableRule')}</Label>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setRuleDialogOpen(false)}>{t('common.cancel')}</Button>
                          <Button type="submit">{t('common.save')}</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {rules.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Settings className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">{t('alerts.noRules')}</p>
                    <p className="text-sm">{t('alerts.noRulesDesc')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map(rule => (
                      <div key={rule.id} className={`p-3 sm:p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${rule.is_active ? '' : 'opacity-50'}`}>
                        <div className="flex items-center gap-3 sm:gap-4">
                          {canEdit ? (
                            <Switch checked={rule.is_active || false} onCheckedChange={() => handleToggleRule(rule)} />
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${rule.is_active ? 'bg-success' : 'bg-muted'}`} />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{rule.rule_name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {ruleTypeLabels[rule.rule_type] || rule.rule_type}
                              {rule.alert_days_before && DATE_BASED_RULES.includes(rule.rule_type) && rule.rule_type !== 'payment_overdue' && ` · ${t('alerts.daysAdvance').replace('{days}', String(rule.alert_days_before))}`}
                              {rule.threshold_value != null && rule.rule_type === 'profit_warning' && ` · ${t('alerts.belowPercent').replace('{value}', String(rule.threshold_value))}`}
                              {rule.threshold_value != null && rule.rule_type === 'payment_overdue' && ` · ${t('alerts.overdueDay').replace('{value}', String(rule.threshold_value))}`}
                              {rule.threshold_value != null && rule.rule_type === 'low_balance' && (
                                <>
                                  {` · ${t('alerts.belowAmount').replace('{value}', rule.threshold_value.toLocaleString())}`}
                                  {rule.account_currency && ` ${rule.account_currency}`}
                                  {rule.account_type && ` (${rule.account_type === 'cash' ? t('alerts.cashLabel') : t('alerts.bankLabel')})`}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-2 ml-auto sm:ml-0">
                            <Button size="sm" variant="ghost" onClick={() => { setEditingRule(rule); setSelectedRuleType(rule.rule_type); setRuleDialogOpen(true); }}>
                              {t('common.edit')}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRule(rule.id)}>
                              {t('common.delete')}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
