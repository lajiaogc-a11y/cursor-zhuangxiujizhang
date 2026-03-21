import { useQuery } from '@tanstack/react-query';
import { fetchActiveAnnouncements } from '@/services/admin.service';
import { useI18n } from '@/lib/i18n';
import { Info, AlertTriangle, Wrench, Sparkles, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  maintenance: Wrench,
  update: Sparkles,
};

const typeStyles = {
  info: 'bg-primary/10 border-primary/20 text-primary',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  maintenance: 'bg-muted border-border text-muted-foreground',
  update: 'bg-success/10 border-success/20 text-success',
};

export function AnnouncementBanner() {
  const { language } = useI18n();
  const zh = language === 'zh';
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('dismissed_announcements');
      if (saved) setDismissed(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const { data: announcements = [] } = useQuery({
    queryKey: ['active-announcements'],
    queryFn: () => fetchActiveAnnouncements(new Date().toISOString()),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const visible = announcements.filter((a: any) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      sessionStorage.setItem('dismissed_announcements', JSON.stringify([...next]));
    } catch {}
  };

  return (
    <div className="space-y-1">
      {visible.map((a: any) => {
        const type = (a.announcement_type || 'info') as keyof typeof typeIcons;
        const Icon = typeIcons[type] || Info;
        const style = typeStyles[type] || typeStyles.info;
        return (
          <div key={a.id} className={`flex items-center gap-3 px-4 py-2 border rounded-lg text-sm ${style}`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="font-medium shrink-0">{a.title}</span>
            <span className="text-xs opacity-80 truncate">{a.content}</span>
            <button onClick={() => dismiss(a.id)} className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
