import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n } from '@/lib/i18n';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAnalyticsSummary, clearOldAnalytics } from '@/services/admin.service';
import { BarChart3, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AnalyticsDashboard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [days, setDays] = useState('7');

  const { data: summary = [], isLoading } = useQuery({
    queryKey: ['analytics-summary', days],
    queryFn: () => fetchAnalyticsSummary(parseInt(days)),
  });

  const clearMutation = useMutation({
    mutationFn: () => clearOldAnalytics(90),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      toast({ title: '已清理90天前的分析数据' });
    },
  });

  const totalEvents = summary.reduce((sum, e) => sum + e.count, 0);
  const uniqueEvents = summary.length;

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-end flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">最近1天</SelectItem>
                <SelectItem value="7">最近7天</SelectItem>
                <SelectItem value="30">最近30天</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['analytics-summary'] })}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => clearMutation.mutate()}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              清理旧数据
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">总事件数</p>
              <p className="text-2xl font-bold">{totalEvents.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">事件类型数</p>
              <p className="text-2xl font-bold">{uniqueEvents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">时间范围</p>
              <p className="text-2xl font-bold">{days}天</p>
            </CardContent>
          </Card>
        </div>

        {/* Events table */}
        <Card>
          <CardHeader>
            <CardTitle>事件统计</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : summary.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无分析数据</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>事件名称</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead className="text-center">次数</TableHead>
                      <TableHead>最后触发</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((event) => (
                      <TableRow key={`${event.event_category}:${event.event_name}`}>
                        <TableCell className="font-mono text-sm">
                          <code className="bg-muted px-2 py-1 rounded">{event.event_name}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.event_category}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={event.count > 50 ? 'destructive' : 'secondary'}>
                            {event.count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(event.last_seen), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
