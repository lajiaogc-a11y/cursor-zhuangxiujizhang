import { useQuery } from '@tanstack/react-query';
import { fetchRecentLogins, fetchLoginHeatmapData } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogIn, CheckCircle2, XCircle, MapPin, Clock, Calendar } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';

export function LoginActivityTimeline() {
  const { language } = useI18n();
  const zh = language === 'zh';

  const { data: recentLogins = [], isLoading } = useQuery({
    queryKey: ['login-activity-recent'],
    queryFn: () => fetchRecentLogins(100),
    refetchInterval: 30000,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['login-activity-heatmap'],
    queryFn: async () => {
      const since = subDays(new Date(), 7).toISOString();
      const data = await fetchLoginHeatmapData(since);

      const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
      const grid: { day: string; hour: number; total: number; failed: number }[][] = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return Array.from({ length: 24 }, (_, h) => ({ day: dayStr, hour: h, total: 0, failed: 0 }));
      });

      (data || []).forEach((a: any) => {
        const d = new Date(a.attempted_at);
        const dayStr = format(d, 'yyyy-MM-dd');
        const dayIdx = days.findIndex(day => format(day, 'yyyy-MM-dd') === dayStr);
        if (dayIdx >= 0) {
          const h = d.getHours();
          grid[dayIdx][h].total++;
          if (!a.success) grid[dayIdx][h].failed++;
        }
      });

      return { grid, days };
    },
    refetchInterval: 60000,
  });

  // Unique IPs today
  const todayIPs = new Set(
    recentLogins
      .filter(l => format(new Date(l.attempted_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
      .map((l: any) => l.ip_address)
  ).size;

  const todayTotal = recentLogins.filter(
    l => format(new Date(l.attempted_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length;

  const todayFailed = recentLogins.filter(
    l => format(new Date(l.attempted_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && !l.success
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{todayTotal}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '今日登录' : 'Today Logins'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{todayFailed}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '今日失败' : 'Today Failed'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{todayIPs}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '今日独立IP' : 'Unique IPs'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{recentLogins.length}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '近期记录' : 'Recent Records'}</p>
          </CardContent>
        </Card>
      </div>

      {/* 7-Day Heatmap */}
      {heatmapData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {zh ? '7天登录热力图' : '7-Day Login Heatmap'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <div className="flex gap-[2px] ml-16">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="flex-1 text-center">
                    {i % 4 === 0 && <span className="text-[8px] text-muted-foreground">{i}</span>}
                  </div>
                ))}
              </div>
              {heatmapData.grid.map((dayRow, di) => {
                const maxInDay = Math.max(...dayRow.map(c => c.total), 1);
                return (
                  <div key={di} className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">
                      {format(heatmapData.days[di], 'EEE dd', { locale: zh ? zhCN : enUS })}
                    </span>
                    <div className="flex gap-[2px] flex-1">
                      {dayRow.map((cell, hi) => {
                        const intensity = cell.total / maxInDay;
                        const hasFailed = cell.failed > 0;
                        return (
                          <div
                            key={hi}
                            className="flex-1 h-5 rounded-sm transition-colors"
                            style={{
                              backgroundColor: cell.total === 0
                                ? 'hsl(var(--muted))'
                                : hasFailed
                                  ? `hsl(0 72% ${85 - intensity * 40}%)`
                                  : `hsl(var(--primary) / ${0.15 + intensity * 0.7})`,
                            }}
                            title={`${format(heatmapData.days[di], 'MM-dd')} ${hi}:00 — ${cell.total} logins, ${cell.failed} failed`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 mt-2 ml-16">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-primary/30" />
                  <span className="text-[10px] text-muted-foreground">{zh ? '成功' : 'Success'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(0 72% 65%)' }} />
                  <span className="text-[10px] text-muted-foreground">{zh ? '含失败' : 'Has Failures'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Login Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            {zh ? '最近登录记录' : 'Recent Login Attempts'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '加载中...' : 'Loading...'}</p>
          ) : recentLogins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '暂无记录' : 'No records'}</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {recentLogins.slice(0, 50).map((login: any) => (
                <div key={login.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {login.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm truncate">{login.email || (zh ? '未知' : 'Unknown')}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{login.ip_address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={login.success ? 'default' : 'destructive'} className="text-[10px]">
                      {login.success ? (zh ? '成功' : 'OK') : (zh ? '失败' : 'Fail')}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(login.attempted_at), 'MM-dd HH:mm')}
                    </span>
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
