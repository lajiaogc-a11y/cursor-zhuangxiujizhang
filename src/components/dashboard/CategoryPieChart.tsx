import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import type { ExpenseCategoryData } from '@/services/dashboard.service';

const formatCurrencyForChart = (amount: number, currency: string = 'MYR') => {
  const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
  return `${symbols[currency] || ''}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))', transition: 'all 0.2s ease-out' }}
      />
    </g>
  );
};

interface CategoryPieChartProps {
  data: ExpenseCategoryData[];
  hiddenCategories: Set<string>;
  setHiddenCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
  onCategoryClick: (categoryName: string) => void;
  t: (key: string) => string;
  title?: string;
}

export function CategoryPieChart({ data, hiddenCategories, setHiddenCategories, onCategoryClick, t, title }: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const filteredData = data.filter(d => !hiddenCategories.has(d.name));
  const filteredTotal = filteredData.reduce((sum, d) => sum + d.value, 0);
  const allTotal = data.reduce((sum, d) => sum + d.value, 0);

  const onPieEnter = useCallback((_: any, index: number) => setActiveIndex(index), []);
  const onPieLeave = useCallback(() => setActiveIndex(undefined), []);
  const onPieClick = useCallback((_: any, index: number) => {
    const category = filteredData[index];
    if (category) onCategoryClick(category.name);
  }, [filteredData, onCategoryClick]);

  const toggleCategory = (name: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex flex-col">
      {title && <h4 className="text-sm font-semibold mb-3 text-center">{title}</h4>}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: 160, height: 160 }}>
          <PieChart width={160} height={160}>
            <Pie
              data={filteredData} cx="50%" cy="50%"
              innerRadius={40} outerRadius={65} dataKey="value"
              label={false} activeIndex={activeIndex} activeShape={renderActiveShape}
              onMouseEnter={onPieEnter} onMouseLeave={onPieLeave} onClick={onPieClick}
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} style={{ cursor: 'pointer', transition: 'all 0.2s ease-out' }} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrencyForChart(value)}
              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
            />
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[10px] text-muted-foreground">{t('chart.total')}</p>
            <p className="text-sm font-bold">{formatCurrencyForChart(filteredTotal)}</p>
          </div>
        </div>
      </div>
      <div className="space-y-1 mt-3">
        {data.map((item) => {
          const percent = allTotal > 0 ? ((item.value / allTotal) * 100).toFixed(1) : '0';
          const isHidden = hiddenCategories.has(item.name);
          return (
            <div
              key={item.name}
              className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${isHidden ? 'opacity-50' : ''}`}
              onClick={() => toggleCategory(item.name)}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="flex-1 truncate text-xs">{item.name}</span>
              <span className="font-medium text-xs">{formatCurrencyForChart(item.value)}</span>
              <span className="text-muted-foreground text-xs w-10 text-right">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
