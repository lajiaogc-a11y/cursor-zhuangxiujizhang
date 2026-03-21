import { useQuery } from '@tanstack/react-query';
import { fetchPageViewStats, fetchHourlyTraffic, fetchErrorRate } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, Zap, Clock, Globe, TrendingDown, BarChart3 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface PagePerf {
  page: string;
  views: number;
  avgLoad?: number;
}

export function PerformanceAnalytics() {
  const { language } = useI18n();
  const zh = language === 'zh';
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: pageStats = [], isLoading } = useQuery({
    queryKey: ['perf-page-stats'],
    queryFn: async () => {
      const data = await fetchPageViewStats(since);
      const pageMap = new Map<string, { views: number; loads: number[] }>();
      data.forEach((e: any) => {
        const url = e.page_url || '/';
        const existing = pageMap.get(url) || { views: 0, loads: [] };
        existing.views++;
        if (e.event_data?.loadTime) existing.loads.push(e.event_data.loadTime);
        pageMap.set(url, existing);
      });
      return Array.from(pageMap.entries())
        .map(([page, d]) => ({
          page,
          views: d.views,
          avgLoad: d.loads.length > 0 ? Math.round(d.loads.reduce((a, b) => a + b, 0) / d.loads.length) : undefined,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 15);
    },
    refetchInterval: 60000,
  });

  const { data: hourlyTraffic = [] } = useQuery({
    queryKey: ['perf-hourly-traffic'],
    queryFn: async () => {
      const data = await fetchHourlyTraffic(since);
      const hours = new Array(24).fill(0);
      data.forEach((e: any) => {
        const h = new Date(e.created_at).getHours();
        hours[h]++;
      });
      return hours.map((count, hour) => ({ hour, count }));
    },
    refetchInterval: 60000,
  });

  const { data: errorStats } = useQuery({
    queryKey: ['perf-error-rate'],
    queryFn: () => fetchErrorRate(since),
    refetchInterval: 60000,
  });

  const totalViews = pageStats.reduce((a, p) => a + p.views, 0);
  const maxHourly = Math.max(...hourlyTraffic.map(h => h.count), 1);
  const peakHour = hourlyTraffic.reduce((max, h) => h.count > max.count ? h : max, { hour: 0, count: 0 });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{totalViews}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '24h 页面浏览' : '24h Page Views'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{pageStats.length}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '活跃页面数' : 'Active Pages'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              <p className="text-2xl font-bold">{peakHour.hour}:00</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '流量高峰时段' : 'Peak Hour'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <p className="text-2xl font-bold">{errorStats?.errorRate || '0'}%</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{zh ? '错误率' : 'Error Rate'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Traffic Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {zh ? '24小时流量分布' : '24h Traffic Distribution'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 items-end h-32">
            {hourlyTraffic.map(h => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all bg-primary/80 hover:bg-primary min-h-[2px]"
                  style={{ height: `${(h.count / maxHourly) * 100}%` }}
                  title={`${h.hour}:00 - ${h.count} events`}
                />
                {h.hour % 3 === 0 && (
                  <span className="text-[9px] text-muted-foreground">{h.hour}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Page Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            {zh ? '页面访问排行（24h）' : 'Page View Rankings (24h)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '加载中...' : 'Loading...'}</p>
          ) : pageStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '暂无数据' : 'No data'}</p>
          ) : (
            <div className="space-y-2">
              {pageStats.map((p, i) => {
                const pct = totalViews > 0 ? (p.views / totalViews * 100) : 0;
                return (
                  <div key={p.page} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-mono truncate">{p.page}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[10px] font-mono">{p.views}</Badge>
                          <span className="text-[10px] text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
