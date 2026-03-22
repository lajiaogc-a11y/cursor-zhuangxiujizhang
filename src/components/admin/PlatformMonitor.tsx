import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPlatformLoginStats,
  fetchPlatformLoginTrend,
  fetchPlatformErrorTrend,
  fetchPlatformRecentErrors,
  fetchPlatformActiveUserCount,
} from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Activity, AlertTriangle, ShieldAlert, Users, Clock, RefreshCw } from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { format, subDays } from 'date-fns';
import { useI18n } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, AreaChart, Area } from 'recharts';
import { useState } from 'react';

function getLast7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), 'MM-dd'));
  }
  return days;
}

export function PlatformMonitor() {
  const { language } = useI18n();
  const zh = language === 'zh';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['platform-login-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['platform-error-logs'] });
    await queryClient.invalidateQueries({ queryKey: ['platform-active-users'] });
    await queryClient.invalidateQueries({ queryKey: ['platform-login-trend'] });
    await queryClient.invalidateQueries({ queryKey: ['platform-error-trend'] });
    setRefreshing(false);
  };

  // Recent login attempts
  const { data: loginStats } = useQuery({
    queryKey: ['platform-login-stats'],
    queryFn: () => fetchPlatformLoginStats(50),
    refetchInterval: 30000,
  });

  // Login trend (7 days)
  const { data: loginTrend = [] } = useQuery({
    queryKey: ['platform-login-trend'],
    queryFn: async () => {
      const since = subDays(new Date(), 7).toISOString();
      const rawData = await fetchPlatformLoginTrend(since);
      const days = getLast7Days();
      const map = new Map<string, { success: number; failed: number }>();
      days.forEach(d => map.set(d, { success: 0, failed: 0 }));
      rawData.forEach(a => {
        const day = format(new Date(a.attempted_at), 'MM-dd');
        const entry = map.get(day);
        if (entry) {
          if (a.success) entry.success++;
          else entry.failed++;
        }
      });
      return days.map(d => ({ date: d, ...map.get(d)! }));
    },
    refetchInterval: 60000,
  });

  // Error trend (7 days)
  const { data: errorTrend = [] } = useQuery({
    queryKey: ['platform-error-trend'],
    queryFn: async () => {
      const since = subDays(new Date(), 7).toISOString();
      const rawData = await fetchPlatformErrorTrend(since);
      const days = getLast7Days();
      const map = new Map<string, number>();
      days.forEach(d => map.set(d, 0));
      rawData.forEach(e => {
        const day = format(new Date(e.created_at), 'MM-dd');
        if (map.has(day)) map.set(day, map.get(day)! + 1);
      });
      return days.map(d => ({ date: d, errors: map.get(d)! }));
    },
    refetchInterval: 60000,
  });

  // Recent error logs
  const { data: errorLogs = [] } = useQuery({
    queryKey: ['platform-error-logs'],
    queryFn: () => fetchPlatformRecentErrors(20),
    refetchInterval: 30000,
  });

  // Active users
  const { data: activeUserCount = 0 } = useQuery({
    queryKey: ['platform-active-users'],
    queryFn: () => fetchPlatformActiveUserCount(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    refetchInterval: 60000,
  });

  const loginChartConfig = {
    success: { label: zh ? '成功' : 'Success', color: 'hsl(var(--success))' },
    failed: { label: zh ? '失败' : 'Failed', color: 'hsl(var(--destructive))' },
  };

  const errorChartConfig = {
    errors: { label: zh ? '错误数' : 'Errors', color: 'hsl(var(--destructive))' },
  };

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
          {refreshing ? <ChromeLoadingSpinner variant="muted" className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {zh ? '刷新' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{activeUserCount}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '24h 活跃用户' : '24h Active Users'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              <p className="text-2xl font-bold text-success">{loginStats?.success || 0}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '登录成功' : 'Login Success'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{loginStats?.failed || 0}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '登录失败' : 'Login Failed'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <p className="text-2xl font-bold text-warning">{errorLogs.length}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '近期错误' : 'Recent Errors'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Login Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {zh ? '7天登录趋势' : '7-Day Login Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={loginChartConfig} className="h-[200px] w-full">
              <BarChart data={loginTrend}>
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="success" fill="var(--color-success)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="failed" fill="var(--color-failed)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Error Frequency Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {zh ? '7天错误频率' : '7-Day Error Frequency'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={errorChartConfig} className="h-[200px] w-full">
              <AreaChart data={errorTrend}>
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="errors"
                  fill="var(--color-errors)"
                  fillOpacity={0.2}
                  stroke="var(--color-errors)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious IPs */}
      {loginStats?.topIPs && loginStats.topIPs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {zh ? '失败登录 IP 分布' : 'Failed Login IP Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loginStats.topIPs.map(([ip, count]) => (
                <div key={ip} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-sm">
                  <span className="font-mono">{ip}</span>
                  <Badge variant={count > 5 ? 'destructive' : 'secondary'}>{count} {zh ? '次' : 'times'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Login Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {zh ? '最近登录记录' : 'Recent Login Attempts'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loginStats?.attempts && loginStats.attempts.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{zh ? '邮箱' : 'Email'}</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>{zh ? '状态' : 'Status'}</TableHead>
                    <TableHead>{zh ? '时间' : 'Time'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginStats.attempts.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{a.email || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{a.ip_address}</TableCell>
                      <TableCell>
                        <Badge variant={a.success ? 'default' : 'destructive'} className="text-[10px]">
                          {a.success ? (zh ? '成功' : 'OK') : (zh ? '失败' : 'FAIL')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(a.attempted_at), 'MM-dd HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '暂无记录' : 'No records'}</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Error Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {zh ? '最近错误日志' : 'Recent Error Logs'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorLogs.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {errorLogs.map(log => (
                <div key={log.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-destructive truncate max-w-[70%]">{log.error_message}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(log.created_at), 'MM-dd HH:mm')}
                    </span>
                  </div>
                  {log.url && <p className="text-xs text-muted-foreground truncate">URL: {log.url}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '暂无错误' : 'No errors'}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
