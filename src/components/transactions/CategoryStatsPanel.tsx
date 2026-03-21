import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { fetchCategoryTransactionStats } from '@/services/settings.service';

import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface CategoryStatsPanelProps {
  tenantId: string | undefined;
  dateRange?: DateRange;
}

interface CategoryStat {
  category_name: string;
  total: number;
  percentage: number;
}

function CategorySection({ 
  title, 
  icon: Icon, 
  stats, 
  colorClass,
  defaultOpen = true 
}: { 
  title: string; 
  icon: typeof TrendingUp; 
  stats: CategoryStat[]; 
  colorClass: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { language } = useI18n();

  if (stats.length === 0) return null;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${colorClass}`} />
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <span className="text-xs text-muted-foreground">({stats.length})</span>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {stats.map((stat) => (
              <div key={stat.category_name} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="truncate mr-2">{stat.category_name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-medium tabular-nums ${colorClass}`}>
                      {stat.total.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {stat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress value={stat.percentage} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function CategoryStatsPanel({ tenantId, dateRange }: CategoryStatsPanelProps) {
  const { t, language } = useI18n();

  const { data } = useQuery({
    queryKey: ['categoryStats', tenantId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: () => fetchCategoryTransactionStats(tenantId!, {
      dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    }),
    enabled: !!tenantId,
  });

  const incomeStats = data?.income || [];
  const expenseStats = data?.expense || [];

  if (incomeStats.length === 0 && expenseStats.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CategorySection
        title={language === 'zh' ? '收入分类统计' : 'Income by Category'}
        icon={TrendingUp}
        stats={incomeStats}
        colorClass="text-success"
      />
      <CategorySection
        title={language === 'zh' ? '支出分类统计' : 'Expense by Category'}
        icon={TrendingDown}
        stats={expenseStats}
        colorClass="text-destructive"
      />
    </div>
  );
}
