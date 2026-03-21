import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import * as workforceService from '@/services/workforce.service';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Clock, MapPin, ArrowRight, ClipboardList, CalendarDays, FileText } from 'lucide-react';

export default function WorkforceDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: stats } = useQuery({
    queryKey: ['workforce-dashboard-stats', tenantId],
    queryFn: () => workforceService.fetchDashboardStats(tenantId!),
    enabled: !!tenantId,
  });

  const kpiCards = [
    { label: t('workforce.totalSites'), value: stats?.totalSites || 0, icon: Building2, color: 'text-primary' },
    { label: t('workforce.activeSites'), value: stats?.activeSites || 0, icon: MapPin, color: 'text-success' },
    { label: t('workforce.totalWorkers'), value: stats?.totalWorkers || 0, icon: Users, color: 'text-blue-500' },
    { label: t('workforce.todayAttendance'), value: stats?.todayCheckins || 0, icon: Clock, color: 'text-warning' },
  ];

  const navItems = [
    { label: t('workforce.sites'), icon: Building2, path: '/workforce/sites' },
    { label: t('workforce.workers'), icon: Users, path: '/workforce/workers' },
    { label: t('workforce.shifts'), icon: CalendarDays, path: '/workforce/shifts' },
    { label: t('workforce.attendance'), icon: Clock, path: '/workforce/attendance' },
    { label: t('workforce.leaves'), icon: ClipboardList, path: '/workforce/leaves' },
    { label: t('workforce.payroll'), icon: FileText, path: '/workforce/payroll' },
  ];

  return (
    <MobilePageShell title={t('workforce.dashboard')} subtitle={t('workforce.desc')} icon={<Building2 className="w-5 h-5" />} backTo="/">
      <div className="p-4 space-y-6">
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {navItems.map((item, i) => (
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
