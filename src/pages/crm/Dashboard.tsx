import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import { crmService } from '@/services';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, TrendingUp, Clock, Plus, ArrowRight, UserPlus, FileSignature } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { formatMoney } from '@/lib/formatCurrency';

export default function CRMDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: stats } = useQuery({
    queryKey: ['crm-stats', tenantId],
    queryFn: () => crmService.fetchDashboardStats(tenantId!),
    enabled: !!tenantId,
  });

  const { data: contractSummary } = useQuery({
    queryKey: ['crm-contract-summary', tenantId],
    queryFn: () => crmService.fetchContractSummary(tenantId!),
    enabled: !!tenantId,
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ['crm-recent-activities', tenantId],
    queryFn: () => crmService.fetchRecentActivities(tenantId!),
    enabled: !!tenantId,
  });

  const { data: upcomingReminders = [] } = useQuery({
    queryKey: ['crm-upcoming-reminders', tenantId],
    queryFn: () => crmService.fetchUpcomingReminders(tenantId!),
    enabled: !!tenantId,
  });

  const activityTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      call: t('crm.activityCall'), meeting: t('crm.activityMeeting'),
      email: t('crm.activityEmail'), note: t('crm.activityNote'), visit: t('crm.activityVisit'),
    };
    return map[type] || type;
  };

  const collectionRate = contractSummary && contractSummary.totalValue > 0
    ? Math.round((contractSummary.collected / contractSummary.totalValue) * 100) : 0;

  const kpiCards = [
    { label: t('crm.totalCustomers'), value: stats?.total || 0, icon: Users, color: 'text-primary' },
    { label: t('crm.newThisMonth'), value: stats?.newThisMonth || 0, icon: UserPlus, color: 'text-success' },
    { label: t('crm.activeCustomers'), value: stats?.active || 0, icon: TrendingUp, color: 'text-blue-500' },
    { label: t('crm.pendingFollowUp'), value: stats?.withFollowUp || 0, icon: Clock, color: 'text-warning' },
  ];

  return (
    <MobilePageShell title={`CRM ${t('crm.dashboard')}`} backTo="/">
      <div className="animate-page-enter space-y-6">
        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/crm/customers')}>
              <Users className="w-4 h-4 mr-2" />{t('crm.viewCustomers')}
            </Button>
            <Button onClick={() => navigate('/crm/customers?new=true')}>
              <Plus className="w-4 h-4 mr-2" />{t('crm.newCustomer')}
            </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t('crm.collectionProgress')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/crm/reports')}>
              {t('crm.reports')}<ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('crm.activeContracts')}</p>
                <p className="text-lg font-bold">{contractSummary?.activeContracts || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('crm.reportTotalValue')}</p>
                <p className="text-lg font-bold">{formatMoney(contractSummary?.totalValue || 0, 'MYR')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('crm.reportCollected')}</p>
                <p className="text-lg font-bold text-success">{formatMoney(contractSummary?.collected || 0, 'MYR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={collectionRate} className="flex-1" />
              <span className="text-sm font-medium text-muted-foreground w-12 text-right">{collectionRate}%</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t('crm.recentActivities')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/crm/customers')}>
                {t('common.viewAll')}<ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('crm.noActivities')}</p>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">{a.contacts?.name}</span>
                          <Badge variant="outline" className="text-[10px]">{activityTypeLabel(a.activity_type)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{a.content}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(a.created_at), 'MM-dd HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t('crm.upcomingReminders')}</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingReminders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('crm.noReminders')}</p>
              ) : (
                <div className="space-y-3">
                  {upcomingReminders.map((r: any) => (
                    <div key={r.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                      <Clock className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.contacts?.name} · {format(new Date(r.remind_at), 'MM-dd HH:mm')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('crm.customerManagement'), icon: Users, path: '/crm/customers' },
            { label: t('crm.contractManagement'), icon: FileSignature, path: '/crm/contracts' },
            { label: t('crm.contractTemplates'), icon: FileText, path: '/crm/templates' },
            { label: t('crm.reports'), icon: TrendingUp, path: '/crm/reports' },
          ].map((item, i) => (
            <Card key={i} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(item.path)}>
              <CardContent className="pt-6 text-center">
                <item.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MobilePageShell>
  );
}
