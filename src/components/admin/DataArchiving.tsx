import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchArchiveStats, fetchOldestRecords, runArchive,
  cleanupLoginAttempts, clearOldErrorLogs,
} from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Archive, Trash2, Database, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function DataArchiving() {
  const { language } = useI18n();
  const zh = language === 'zh';
  const queryClient = useQueryClient();
  const [days, setDays] = useState(90);

  const { data: archiveStats } = useQuery({
    queryKey: ['archive-stats'],
    queryFn: fetchArchiveStats,
  });

  const { data: oldestRecords } = useQuery({
    queryKey: ['oldest-records'],
    queryFn: fetchOldestRecords,
  });

  const archiveMutation = useMutation({
    mutationFn: () => runArchive(days),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['archive-stats'] });
      queryClient.invalidateQueries({ queryKey: ['oldest-records'] });
      const auditCount = data?.audit_logs_archived || 0;
      const analyticsCount = data?.analytics_events_archived || 0;
      toast.success(
        zh
          ? `归档完成：审计日志 ${auditCount} 条，分析事件 ${analyticsCount} 条`
          : `Archived: ${auditCount} audit logs, ${analyticsCount} analytics events`
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cleanupLoginMutation = useMutation({
    mutationFn: cleanupLoginAttempts,
    onSuccess: () => {
      toast.success(zh ? '登录记录已清理（保留7天）' : 'Login attempts cleaned (kept 7 days)');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const clearErrorsMutation = useMutation({
    mutationFn: () => clearOldErrorLogs(days),
    onSuccess: () => {
      toast.success(zh ? `已清理 ${days} 天前的错误日志` : `Cleared error logs older than ${days} days`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{archiveStats?.auditLive?.toLocaleString() || '...'}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '审计日志（活跃）' : 'Audit Logs (Live)'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-muted-foreground" />
              <p className="text-2xl font-bold text-muted-foreground">{archiveStats?.auditArchived?.toLocaleString() || '0'}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '审计日志（归档）' : 'Audit Logs (Archived)'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{archiveStats?.analyticsLive?.toLocaleString() || '...'}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '分析事件（活跃）' : 'Analytics (Live)'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-muted-foreground" />
              <p className="text-2xl font-bold text-muted-foreground">{archiveStats?.analyticsArchived?.toLocaleString() || '0'}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '分析事件（归档）' : 'Analytics (Archived)'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Oldest records info */}
      {oldestRecords && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{zh ? '最早审计记录：' : 'Oldest audit: '}</span>
                <span className="font-mono">{oldestRecords.oldestAudit ? format(new Date(oldestRecords.oldestAudit), 'yyyy-MM-dd') : '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{zh ? '最早分析事件：' : 'Oldest analytics: '}</span>
                <span className="font-mono">{oldestRecords.oldestAnalytics ? format(new Date(oldestRecords.oldestAnalytics), 'yyyy-MM-dd') : '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archive Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Archive className="w-4 h-4" />
            {zh ? '数据归档' : 'Data Archiving'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {zh
              ? '将超过指定天数的审计日志和分析事件移动到归档表，以保持主表性能。归档数据仍可查询。'
              : 'Move audit logs and analytics events older than the specified days to archive tables for better performance. Archived data is still queryable.'}
          </p>
          <div className="flex items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{zh ? '保留天数' : 'Keep days'}</Label>
              <Input
                type="number"
                value={days}
                onChange={e => setDays(Math.max(7, parseInt(e.target.value) || 90))}
                className="w-24 h-9"
                min={7}
              />
            </div>
            <Button
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              className="gap-1.5"
            >
              <Archive className="w-4 h-4" />
              {archiveMutation.isPending ? (zh ? '归档中...' : 'Archiving...') : (zh ? '执行归档' : 'Run Archive')}
            </Button>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning">
              {zh
                ? `将归档 ${days} 天前的所有审计日志和分析事件。此操作不可逆（数据转移到归档表）。`
                : `Will archive all audit logs and analytics events older than ${days} days. Data is moved to archive tables.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            {zh ? '数据清理' : 'Data Cleanup'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{zh ? '清理登录记录' : 'Cleanup Login Attempts'}</p>
                <p className="text-xs text-muted-foreground">{zh ? '删除7天前的登录记录' : 'Delete login records older than 7 days'}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cleanupLoginMutation.mutate()}
                disabled={cleanupLoginMutation.isPending}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {zh ? '清理' : 'Clean'}
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{zh ? '清理错误日志' : 'Cleanup Error Logs'}</p>
                <p className="text-xs text-muted-foreground">{zh ? `删除 ${days} 天前的错误日志` : `Delete error logs older than ${days} days`}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearErrorsMutation.mutate()}
                disabled={clearErrorsMutation.isPending}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {zh ? '清理' : 'Clean'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
