import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, AlertTriangle, StickyNote, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useI18n } from '@/lib/i18n';
import { useAlertCount } from '@/hooks/useAlertCount';
import { useMemoCount } from '@/hooks/useMemoCount';
import { useTenant } from '@/lib/tenant';
import { queryKeys } from '@/lib/queryKeys';
import * as alertsService from '@/services/alerts.service';
import * as memosService from '@/services/memos.service';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const alertCount = useAlertCount();
  const memoCount = useMemoCount();
  const totalCount = alertCount + memoCount;
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  // Fetch recent alerts when popover opens
  const { data: alertsData } = useQuery({
    queryKey: [...queryKeys.alerts, tenantId, 'notification-center'],
    queryFn: () => alertsService.fetchAlertsAndRules(tenantId!),
    enabled: !!tenantId && open,
  });

  const { data: memos } = useQuery({
    queryKey: [...queryKeys.memos, tenantId, 'notification-center'],
    queryFn: () => memosService.fetchMemos(tenantId!),
    enabled: !!tenantId && open,
  });

  const unresolvedAlerts = (alertsData?.alerts || [])
    .filter(a => !a.is_resolved)
    .slice(0, 5);

  const activeReminders = (memos || [])
    .filter(m => !m.is_completed && m.reminder_time)
    .slice(0, 5);

  const locale = language === 'zh' ? zhCN : enUS;

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-tour="notifications"
          variant="ghost"
          size="icon"
          className="relative text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 rounded-lg"
        >
          <Bell className="w-3.5 h-3.5" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-80 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">
            {language === 'zh' ? '通知中心' : 'Notifications'}
          </h3>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalCount}
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-[360px]">
          {/* Alerts section */}
          {unresolvedAlerts.length > 0 && (
            <div className="px-2 py-1.5">
              <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('nav.alerts')}
              </p>
              {unresolvedAlerts.map(alert => (
                <button
                  key={alert.id}
                  onClick={() => goTo('/alerts')}
                  className="w-full flex items-start gap-2.5 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{alert.alert_message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Memo reminders section */}
          {activeReminders.length > 0 && (
            <div className="px-2 py-1.5">
              <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('nav.memos')}
              </p>
              {activeReminders.map(memo => (
                <button
                  key={memo.id}
                  onClick={() => goTo('/memos')}
                  className="w-full flex items-start gap-2.5 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                >
                  <StickyNote className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{memo.title}</p>
                    {memo.reminder_time && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(memo.reminder_time), { addSuffix: true, locale })}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {unresolvedAlerts.length === 0 && activeReminders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">{language === 'zh' ? '暂无通知' : 'All caught up!'}</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-2 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs justify-between"
            onClick={() => goTo('/alerts')}
          >
            {t('nav.alerts')}
            <ChevronRight className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs justify-between"
            onClick={() => goTo('/memos')}
          >
            {t('nav.memos')}
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
