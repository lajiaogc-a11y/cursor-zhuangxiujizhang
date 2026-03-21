import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface DashStatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
  trend?: { value: string; positive: boolean };
  trendLabel?: string;
  onClick?: () => void;
}

export function DashStatCard({ label, value, icon: Icon, iconBg, trend, trendLabel, onClick }: DashStatCardProps) {
  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{label}</p>
            <p className="text-base sm:text-2xl font-bold text-foreground leading-tight truncate">{value}</p>
            {trend && (
              <p className={`text-xs font-medium ${trend.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </p>
            )}
            {trendLabel && !trend && (
              <p className="text-xs text-muted-foreground">{trendLabel}</p>
            )}
          </div>
          <div className={`p-2 sm:p-2.5 rounded-xl ${iconBg} shrink-0`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
