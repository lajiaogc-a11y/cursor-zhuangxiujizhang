import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { ProjectProfitData } from '@/services/dashboard.service';

interface ProjectProfitChartProps {
  data: ProjectProfitData[];
  formatCurrency: (amount: number, currency?: string) => string;
  onProjectClick: (projectId: string) => void;
  maxItems?: number;
}

export function ProjectProfitChart({ data, formatCurrency, onProjectClick, maxItems = 8 }: ProjectProfitChartProps) {
  const chartData = useMemo(() =>
    data.slice(0, maxItems).map(p => ({
      ...p,
      label: p.projectCode.length > 10 ? p.projectCode.slice(0, 10) + '…' : p.projectCode,
    })),
    [data, maxItems]
  );

  const maxVal = Math.max(...chartData.map(d => Math.abs(d.netProfit)), 1);

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
        <XAxis
          type="number"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => {
            if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}万`;
            if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
            return String(v);
          }}
          domain={[-maxVal * 0.1, 'auto']}
        />
        <YAxis
          dataKey="label"
          type="category"
          width={90}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <ReferenceLine x={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as ProjectProfitData & { label: string };
            return (
              <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-xl text-xs space-y-1">
                <p className="font-medium">{d.projectName}</p>
                <p className="text-muted-foreground">{d.projectCode}</p>
                <div className="flex justify-between gap-4 pt-1 border-t border-border">
                  <span className="text-muted-foreground">净利润</span>
                  <span className={`font-semibold ${d.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {formatCurrency(d.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">利润率</span>
                  <span className="font-medium">{d.profitRate.toFixed(1)}%</span>
                </div>
              </div>
            );
          }}
        />
        <Bar
          dataKey="netProfit"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
          onClick={(d) => onProjectClick(d.projectId)}
          style={{ cursor: 'pointer' }}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.netProfit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
