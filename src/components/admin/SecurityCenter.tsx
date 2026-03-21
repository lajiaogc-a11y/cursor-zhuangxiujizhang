import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSuspiciousIPs, fetchSecurityAlerts, fetchSecuritySummary7d,
  resolveSecurityAlert, runSuspiciousDetection,
} from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function SecurityCenter() {
  const { language } = useI18n();
  const zh = language === 'zh';
  const queryClient = useQueryClient();

  const { data: suspiciousIPs = [] } = useQuery({
    queryKey: ['security-suspicious-ips'],
    queryFn: fetchSuspiciousIPs,
    refetchInterval: 30000,
  });

  const { data: securityAlerts = [] } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: fetchSecurityAlerts,
    refetchInterval: 30000,
  });

  const { data: secSummary } = useQuery({
    queryKey: ['security-summary-7d'],
    queryFn: fetchSecuritySummary7d,
    refetchInterval: 60000,
  });

  const resolveAlert = useMutation({
    mutationFn: resolveSecurityAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      toast.success(zh ? '已标记为已处理' : 'Marked as resolved');
    },
  });

  const runDetection = useMutation({
    mutationFn: runSuspiciousDetection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      toast.success(zh ? '检测完成' : 'Detection complete');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold">{secSummary?.totalLogins || 0}</p>
          <p className="text-xs text-muted-foreground">{zh ? '7天登录' : '7d Logins'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold text-destructive">{secSummary?.failedLogins || 0}</p>
          <p className="text-xs text-muted-foreground">{zh ? '失败次数' : 'Failed'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold text-success">{secSummary?.successRate || '100'}%</p>
          <p className="text-xs text-muted-foreground">{zh ? '成功率' : 'Success Rate'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold text-warning">{secSummary?.totalErrors || 0}</p>
          <p className="text-xs text-muted-foreground">{zh ? '系统错误' : 'Errors'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold text-destructive">{suspiciousIPs.length}</p>
          <p className="text-xs text-muted-foreground">{zh ? '活跃威胁' : 'Threats'}</p>
        </CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => runDetection.mutate()} disabled={runDetection.isPending} className="gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          {zh ? '运行威胁检测' : 'Run Threat Detection'}
        </Button>
      </div>

      {/* Suspicious IPs */}
      {suspiciousIPs.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Lock className="w-4 h-4" />
              {zh ? '可疑 IP（过去1小时）' : 'Suspicious IPs (Last 1h)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspiciousIPs.map(ip => (
                <div key={ip.ip} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-mono text-sm">{ip.ip}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-[10px]">
                      {ip.count} {zh ? '次失败' : 'failures'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ip.last), 'HH:mm:ss')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            {zh ? '安全告警' : 'Security Alerts'}
            {securityAlerts.length > 0 && <Badge variant="destructive" className="text-[10px]">{securityAlerts.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityAlerts.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
              <p className="text-sm text-muted-foreground">{zh ? '暂无安全告警' : 'No security alerts'}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {securityAlerts.map((alert: any) => (
                <div key={alert.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium text-destructive">{alert.alert_message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(alert.created_at), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => resolveAlert.mutate(alert.id)}
                    >
                      {zh ? '已处理' : 'Resolve'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
