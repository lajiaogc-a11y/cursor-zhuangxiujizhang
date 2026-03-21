import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import * as crmService from '@/services/crm.service';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/formatCurrency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(142 76% 36%)',
];

export default function CRMReports() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: funnelCounts = {} } = useQuery({
    queryKey: ['crm-funnel', tenantId],
    queryFn: () => crmService.fetchLeadFunnel(tenantId!),
    enabled: !!tenantId,
  });

  const funnelData = [
    { key: 'new', label: t('crm.statusNew') },
    { key: 'contacted', label: t('crm.statusContacted') },
    { key: 'negotiating', label: t('crm.statusNegotiating') },
    { key: 'quoted', label: t('crm.statusQuoted') },
    { key: 'signed', label: t('crm.statusSigned') },
  ].map((s, i) => ({
    name: s.label,
    value: (funnelCounts as Record<string, number>)[s.key] || 0,
    fill: COLORS[i % COLORS.length],
  }));

  const { data: sourceCounts = {} } = useQuery({
    queryKey: ['crm-source-stats', tenantId],
    queryFn: () => crmService.fetchLeadSourceDistribution(tenantId!),
    enabled: !!tenantId,
  });

  const sourceLabels: Record<string, string> = {
    referral: t('crm.sourceReferral'),
    online: t('crm.sourceOnline'),
    social_media: t('crm.sourceSocialMedia'),
    walk_in: t('crm.sourceWalkIn'),
    exhibition: t('crm.sourceExhibition'),
    other: t('crm.sourceOther'),
  };
  const sourceData = Object.entries(sourceCounts as Record<string, number>).map(([key, value]) => ({
    name: sourceLabels[key] || key, value,
  }));

  const { data: contractStats } = useQuery({
    queryKey: ['crm-contract-stats', tenantId],
    queryFn: () => crmService.fetchContractStats(tenantId!),
    enabled: !!tenantId,
  });

  const { data: monthlyRaw = {} } = useQuery({
    queryKey: ['crm-monthly-customers', tenantId],
    queryFn: () => crmService.fetchMonthlyNewCustomers(tenantId!),
    enabled: !!tenantId,
  });

  const monthlyData = (() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().substring(0, 7);
      result.push({ month: key.substring(5), count: (monthlyRaw as Record<string, number>)[key] || 0 });
    }
    return result;
  })();

  const contractStatusData = contractStats
    ? Object.entries(contractStats.statusCounts).map(([status, count]) => ({
        name: t(`crm.status_${status}`) || status, value: count,
      }))
    : [];

  const collectionRate = contractStats && contractStats.totalValue > 0
    ? Math.round((contractStats.collected / contractStats.totalValue) * 100) : 0;

  return (
    <MobilePageShell title={t('crm.reports')} backTo="/crm">
      <div className="animate-page-enter space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('crm.reports')}</h1>
          <p className="text-sm text-muted-foreground">{t('crm.reportsDesc')}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('crm.totalContracts')}</p>
            <p className="text-2xl font-bold">{contractStats?.total || 0}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('crm.reportTotalValue')}</p>
            <p className="text-2xl font-bold">{formatMoney(contractStats?.totalValue || 0, 'MYR')}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('crm.reportCollected')}</p>
            <p className="text-2xl font-bold text-success">{formatMoney(contractStats?.collected || 0, 'MYR')}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('crm.reportCollectionRate')}</p>
            <p className="text-2xl font-bold">{collectionRate}%</p>
          </CardContent></Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('crm.reportFunnel')}</CardTitle></CardHeader>
            <CardContent>
              {funnelData.every(s => s.value === 0) ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('common.noData')}</p>
              ) : (
                <div className="space-y-3">
                  {funnelData.map((stage, i) => {
                    const maxVal = Math.max(...funnelData.map(s => s.value), 1);
                    const widthPct = Math.max((stage.value / maxVal) * 100, 10);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm w-16 text-right text-muted-foreground shrink-0">{stage.name}</span>
                        <div className="flex-1">
                          <div className="h-8 rounded flex items-center px-3 text-sm font-medium text-primary-foreground transition-all"
                            style={{ width: `${widthPct}%`, backgroundColor: stage.fill }}>{stage.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t('crm.reportSourceDist')}</CardTitle></CardHeader>
            <CardContent>
              {sourceData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('common.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t('crm.reportMonthlyNew')}</CardTitle></CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('common.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t('crm.reportContractStatus')}</CardTitle></CardHeader>
            <CardContent>
              {contractStatusData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('common.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={contractStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {contractStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MobilePageShell>
  );
}
