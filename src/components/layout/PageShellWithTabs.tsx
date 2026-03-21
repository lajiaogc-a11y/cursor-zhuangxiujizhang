import { ReactNode } from 'react';
import { MainLayout } from './MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface StatItem {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  onClick?: () => void;
}

interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

interface PageShellWithTabsProps {
  title: string;
  actions?: ReactNode;
  stats?: StatItem[];
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  toolbar?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Unified page layout for all data management pages:
 * Page Header → Stats → Tabs → Toolbar → Content
 */
export function PageShellWithTabs({
  title,
  actions,
  stats,
  tabs,
  activeTab,
  onTabChange,
  toolbar,
  children,
  className,
}: PageShellWithTabsProps) {
  return (
    <MainLayout>
      <div className={cn("animate-page-enter space-y-5", className)}>
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>

        {/* Stats Row */}
        {stats && stats.length > 0 && (
          <div className={cn(
            "grid gap-3",
            stats.length <= 3 ? "grid-cols-1 sm:grid-cols-3" :
            stats.length <= 4 ? "grid-cols-2 lg:grid-cols-4" :
            "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          )}>
            {stats.map((stat, i) => (
              <div
                key={i}
                className={cn(
                  "stat-card-v2 group",
                  stat.onClick && "cursor-pointer"
                )}
                onClick={stat.onClick}
              >
                <div className="flex items-center gap-3">
                  {stat.icon && (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 transition-transform group-hover:scale-110">
                      {stat.icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={cn("text-lg sm:text-xl font-bold tabular-nums leading-tight", stat.color)}>
                      {stat.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs or direct content */}
        {tabs && tabs.length > 0 ? (
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="w-full sm:w-auto overflow-x-auto">
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {toolbar && <div className="mt-4">{toolbar}</div>}
            {tabs.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <>
            {toolbar && <div>{toolbar}</div>}
            {children}
          </>
        )}
      </div>
    </MainLayout>
  );
}
