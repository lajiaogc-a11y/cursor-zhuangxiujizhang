import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Users, Database, Activity } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';

type TenantUsage = adminService.TenantUsage;

export function TenantUsageStats() {
  const { language, t } = useI18n();
  const zh = language === 'zh';

  const { data: usageData = [], isLoading } = useQuery({
    queryKey: ['tenant-usage-stats'],
    queryFn: () => adminService.fetchTenantUsageStats(),
    refetchInterval: 60000,
  });

  const totals = usageData.reduce(
    (acc, t) => ({
      members: acc.members + t.memberCount,
      active: acc.active + t.activeUsers24h,
      transactions: acc.transactions + t.transactionCount,
      projects: acc.projects + t.projectCount,
    }),
    { members: 0, active: 0, transactions: 0, projects: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{totals.members}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '总成员数' : 'Total Members'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              <p className="text-2xl font-bold text-success">{totals.active}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '24h 活跃' : '24h Active'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{totals.transactions}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '总交易数' : 'Transactions'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{totals.projects}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '总项目数' : 'Projects'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-tenant table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{zh ? '各租户数据用量' : 'Tenant Data Usage'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AppSectionLoading label={t('common.loading')} compact />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{zh ? '租户' : 'Tenant'}</TableHead>
                    <TableHead>{zh ? '套餐' : 'Plan'}</TableHead>
                    <TableHead className="text-right">{zh ? '成员' : 'Members'}</TableHead>
                    <TableHead className="text-right">{zh ? '24h活跃' : '24h Active'}</TableHead>
                    <TableHead className="text-right">{zh ? '交易数' : 'Txns'}</TableHead>
                    <TableHead className="text-right">{zh ? '项目数' : 'Projects'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageData.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{row.name}</p>
                          <p className="text-[11px] text-muted-foreground">{row.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{row.plan}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.memberCount}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className={row.activeUsers24h > 0 ? 'text-success' : 'text-muted-foreground'}>
                          {row.activeUsers24h}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.transactionCount}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.projectCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
