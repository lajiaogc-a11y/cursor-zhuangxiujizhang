import { useQuery } from '@tanstack/react-query';
import {
  checkEdgeFunctionHealth, checkDatabaseHealth, checkAuthHealth, checkStorageHealth,
  fetchTableStats, fetchStorageStats, fetchRecentActiveUsers,
} from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Heart, Server, Database, HardDrive, RefreshCw, CheckCircle2, XCircle, Users, FileBox } from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { useI18n } from '@/lib/i18n';
import { useState } from 'react';
import { format } from 'date-fns';

interface HealthCheck {
  name: string;
  status: 'ok' | 'error' | 'loading';
  latency?: number;
  detail?: string;
}

export function SystemHealth() {
  const { language } = useI18n();
  const zh = language === 'zh';
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: edgeHealth, isLoading: edgeLoading } = useQuery({
    queryKey: ['system-health-edge', refreshKey],
    queryFn: checkEdgeFunctionHealth,
    staleTime: 0,
  });

  const { data: dbHealth, isLoading: dbLoading } = useQuery({
    queryKey: ['system-health-db', refreshKey],
    queryFn: () => checkDatabaseHealth(zh),
    staleTime: 0,
  });

  const { data: authHealth, isLoading: authLoading } = useQuery({
    queryKey: ['system-health-auth', refreshKey],
    queryFn: () => checkAuthHealth(zh),
    staleTime: 0,
  });

  const { data: storageHealth, isLoading: storageLoading } = useQuery({
    queryKey: ['system-health-storage', refreshKey],
    queryFn: () => checkStorageHealth(zh),
    staleTime: 0,
  });

  const { data: tableStats } = useQuery({
    queryKey: ['system-health-tables', refreshKey],
    queryFn: fetchTableStats,
    staleTime: 60000,
  });

  const { data: storageStats } = useQuery({
    queryKey: ['system-health-storage-stats', refreshKey],
    queryFn: fetchStorageStats,
    staleTime: 60000,
  });

  const { data: recentActiveUsers = 0 } = useQuery({
    queryKey: ['system-health-active-1h', refreshKey],
    queryFn: fetchRecentActiveUsers,
    refetchInterval: 60000,
  });

  const checks: (HealthCheck & { icon: React.ReactNode })[] = [
    { name: zh ? '后端函数' : 'Edge Functions', icon: <Server className="w-4 h-4" />, status: edgeLoading ? 'loading' : (edgeHealth?.status || 'loading'), latency: edgeHealth?.latency, detail: edgeHealth?.detail },
    { name: zh ? '数据库' : 'Database', icon: <Database className="w-4 h-4" />, status: dbLoading ? 'loading' : (dbHealth?.status || 'loading'), latency: dbHealth?.latency, detail: dbHealth?.detail },
    { name: zh ? '认证服务' : 'Auth Service', icon: <Heart className="w-4 h-4" />, status: authLoading ? 'loading' : (authHealth?.status || 'loading'), latency: authHealth?.latency, detail: authHealth?.detail },
    { name: zh ? '文件存储' : 'Storage', icon: <HardDrive className="w-4 h-4" />, status: storageLoading ? 'loading' : (storageHealth?.status || 'loading'), latency: storageHealth?.latency, detail: storageHealth?.detail },
  ];

  const allOk = checks.every(c => c.status === 'ok');
  const anyError = checks.some(c => c.status === 'error');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full motion-reduce:animate-none ${anyError ? 'bg-destructive animate-pulse' : allOk ? 'bg-success' : 'bg-warning animate-pulse'}`} />
          <span className="text-sm font-medium">
            {anyError ? (zh ? '系统异常' : 'System Issues') : allOk ? (zh ? '所有服务正常' : 'All Systems Operational') : (zh ? '检测中...' : 'Checking...')}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          {zh ? '重新检测' : 'Re-check'}
        </Button>
      </div>

      {/* Service Health Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {checks.map(check => (
          <Card key={check.name}>
            <CardContent className="pt-4 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {check.icon}
                  <span className="text-xs font-medium">{check.name}</span>
                </div>
                {check.status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : check.status === 'error' ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant={check.status === 'ok' ? 'default' : check.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {check.status === 'ok' ? 'OK' : check.status === 'error' ? 'ERROR' : '...'}
                </Badge>
                {check.latency !== undefined && (
                  <span className={`text-xs font-mono ${check.latency > 1000 ? 'text-destructive' : check.latency > 500 ? 'text-warning' : 'text-success'}`}>
                    {check.latency}ms
                  </span>
                )}
              </div>
              {check.detail && <p className="text-[10px] text-muted-foreground truncate">{check.detail}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{recentActiveUsers}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '1小时活跃用户' : '1h Active Users'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <FileBox className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{storageStats?.fileCount || 0}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '存储文件数' : 'Stored Files'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">
                {storageStats ? (storageStats.totalSize / (1024 * 1024)).toFixed(1) : '0'} MB
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '存储使用量' : 'Storage Used'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{tableStats ? tableStats.reduce((a, t) => a + t.count, 0).toLocaleString() : '...'}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '总记录数' : 'Total Records'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Database Table Stats */}
      {tableStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" />
              {zh ? '数据库表统计' : 'Database Table Stats'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {tableStats.map(t => {
                const maxCount = Math.max(...tableStats.map(x => x.count), 1);
                return (
                  <div key={t.name} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                    <p className="text-lg font-bold">{t.count.toLocaleString()}</p>
                    <Progress value={(t.count / maxCount) * 100} className="h-1" />
                    <p className="text-[11px] text-muted-foreground">{t.name}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        {zh ? '最后检测时间：' : 'Last checked: '}{format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
      </p>
    </div>
  );
}
