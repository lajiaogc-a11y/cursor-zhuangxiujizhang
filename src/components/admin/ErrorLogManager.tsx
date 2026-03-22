import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchErrorLogs, fetchErrorFrequency, deleteErrorLog, bulkDeleteErrorLogs, type ErrorLog } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Search, Trash2, Eye, Clock, Globe, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ErrorLogManager() {
  const { language, t } = useI18n();
  const zh = language === 'zh';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['error-log-manager', page, search],
    queryFn: () => fetchErrorLogs(page, PAGE_SIZE, search || undefined),
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const { data: topErrors = [] } = useQuery({
    queryKey: ['error-frequency'],
    queryFn: () => fetchErrorFrequency(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteErrorLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-log-manager'] });
      queryClient.invalidateQueries({ queryKey: ['error-frequency'] });
      setSelectedLog(null);
      toast.success(zh ? '已删除' : 'Deleted');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (messagePattern: string) => bulkDeleteErrorLogs(messagePattern),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-log-manager'] });
      queryClient.invalidateQueries({ queryKey: ['error-frequency'] });
      toast.success(zh ? '批量删除完成' : 'Bulk delete done');
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '总错误数' : 'Total Errors'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-warning" />
              <p className="text-2xl font-bold">{topErrors.length > 0 ? topErrors[0].count : 0}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{zh ? '最频繁错误出现次数' : 'Top Error Count'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-mono">
                {logs[0] ? format(new Date(logs[0].created_at), 'MM-dd HH:mm') : '-'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '最近错误时间' : 'Latest Error'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Recurring Errors */}
      {topErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{zh ? '高频错误 Top 5' : 'Top 5 Recurring Errors'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topErrors.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10 gap-3">
                  <p className="text-sm truncate flex-1">{e.message}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="destructive" className="text-[10px]">{e.count}x</Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => bulkDeleteMutation.mutate(e.message)} disabled={bulkDeleteMutation.isPending}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{zh ? '错误日志列表' : 'Error Log List'}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={zh ? '搜索错误...' : 'Search errors...'} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-8 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AppSectionLoading label={t('common.loading')} compact />
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '暂无错误日志' : 'No error logs'}</p>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer gap-3" onClick={() => setSelectedLog(log)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{log.error_message}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {log.url && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" />{log.url}</span>}
                        <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at), 'MM-dd HH:mm:ss')}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 shrink-0"><Eye className="w-3.5 h-3.5" /></Button>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">{zh ? `共 ${total} 条` : `${total} total`}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                    <span className="text-xs">{page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" className="h-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              {zh ? '错误详情' : 'Error Detail'}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{zh ? '错误消息' : 'Message'}</p>
                <p className="text-sm font-medium text-destructive">{selectedLog.error_message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">{zh ? '时间' : 'Time'}</p><p className="font-mono text-xs">{format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss')}</p></div>
                <div><p className="text-xs text-muted-foreground">URL</p><p className="font-mono text-xs truncate">{selectedLog.url || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">User ID</p><p className="font-mono text-xs truncate">{selectedLog.user_id || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">User Agent</p><p className="font-mono text-xs truncate">{selectedLog.user_agent || '-'}</p></div>
              </div>
              {selectedLog.error_stack && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{zh ? '堆栈跟踪' : 'Stack Trace'}</p>
                  <pre className="text-[11px] font-mono bg-muted p-3 rounded-lg overflow-x-auto max-h-48 whitespace-pre-wrap">{selectedLog.error_stack}</pre>
                </div>
              )}
              {selectedLog.component_stack && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{zh ? '组件堆栈' : 'Component Stack'}</p>
                  <pre className="text-[11px] font-mono bg-muted p-3 rounded-lg overflow-x-auto max-h-32 whitespace-pre-wrap">{selectedLog.component_stack}</pre>
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(selectedLog.id)} disabled={deleteMutation.isPending} className="gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  {zh ? '删除此记录' : 'Delete'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
