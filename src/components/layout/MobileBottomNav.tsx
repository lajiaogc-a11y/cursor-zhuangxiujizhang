import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Building2, BarChart3, Menu } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

interface NavTab {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export function MobileBottomNav({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  const tabs: NavTab[] = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/transactions', label: t('nav.transactions'), icon: Receipt },
    { path: '/projects', label: t('nav.projects'), icon: Building2 },
    { path: '/reports', label: t('nav.reports'), icon: BarChart3 },
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <tab.icon className={cn('w-5 h-5', active && 'drop-shadow-sm')} />
              <span className={cn('text-[10px] leading-tight', active ? 'font-semibold' : 'font-medium')}>
                {tab.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] leading-tight font-medium">
            {t('common.more') || 'More'}
          </span>
        </button>
      </div>
    </nav>
  );
}
