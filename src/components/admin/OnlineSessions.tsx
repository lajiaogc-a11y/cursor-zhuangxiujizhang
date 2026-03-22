import { useQuery } from '@tanstack/react-query';
import { fetchOnlineSessionsData } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Monitor, Wifi, Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';

export function OnlineSessions() {
  const { language, t } = useI18n();
  const zh = language === 'zh';

  const { data: onlineUsers = [], isLoading } = useQuery({
    queryKey: ['online-sessions'],
    queryFn: fetchOnlineSessionsData,
    refetchInterval: 30000,
  });

  const onlineCount = onlineUsers.filter((u: any) => u.isOnline).length;
  const recentCount = onlineUsers.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-success" />
              <p className="text-2xl font-bold text-success">{onlineCount}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '在线用户（15分钟）' : 'Online (15min)'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{recentCount}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '近1小时活跃' : '1h Active'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{onlineUsers.reduce((a: number, u: any) => a + u.eventCount, 0)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '1小时总操作' : '1h Total Events'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            {zh ? '用户会话' : 'User Sessions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AppSectionLoading label={t('common.loading')} compact />
          ) : onlineUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '暂无活跃会话' : 'No active sessions'}</p>
          ) : (
            <div className="space-y-2">
              {onlineUsers.map((u: any) => (
                <div key={u.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 motion-reduce:animate-none ${u.isOnline ? 'bg-success animate-pulse' : 'bg-muted-foreground/40'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.username}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{u.tenantName}</Badge>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3" />{u.lastPage}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(u.lastActive), { addSuffix: true, locale: zh ? zhCN : enUS })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono">{u.eventCount}</Badge>
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
