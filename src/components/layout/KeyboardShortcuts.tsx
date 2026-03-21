import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { P } from '@/constants/permissions';

interface ShortcutDef {
  keys: string[];
  label: string;
  action: () => void;
  permissionKey?: string;
}

interface ShortcutGroup {
  group: string;
  items: { keys: string[]; label: string }[];
}

export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();
  const { language } = useI18n();
  const { hasPermission } = useAuth();
  const zh = language === 'zh';

  const shortcuts: ShortcutDef[] = [
    // Navigation
    { keys: ['g', 'd'], label: zh ? '仪表盘' : 'Dashboard', action: () => navigate('/dashboard'), permissionKey: P.NAV_DASHBOARD },
    { keys: ['g', 'p'], label: zh ? '工程项目' : 'Projects', action: () => navigate('/projects'), permissionKey: P.NAV_PROJECTS },
    { keys: ['g', 't'], label: zh ? '收支记录' : 'Transactions', action: () => navigate('/transactions'), permissionKey: P.NAV_TRANSACTIONS },
    { keys: ['g', 'm'], label: zh ? '备忘录' : 'Memos', action: () => navigate('/memos'), permissionKey: P.NAV_MEMOS },
    { keys: ['g', 'r'], label: zh ? '报表' : 'Reports', action: () => navigate('/reports'), permissionKey: P.NAV_REPORTS },
    { keys: ['g', 'a'], label: zh ? '提醒' : 'Alerts', action: () => navigate('/alerts'), permissionKey: P.NAV_ALERTS },
    { keys: ['g', 's'], label: zh ? '设置' : 'Settings', action: () => navigate('/settings'), permissionKey: P.NAV_SETTINGS },
    { keys: ['g', 'b'], label: zh ? '余额明细' : 'Balance Ledger', action: () => navigate('/balance-ledger'), permissionKey: P.NAV_BALANCE_LEDGER },
    { keys: ['g', 'c'], label: zh ? '联系人' : 'Contacts', action: () => navigate('/contacts'), permissionKey: P.NAV_CONTACTS },
    { keys: ['g', 'i'], label: zh ? '发票' : 'Invoices', action: () => navigate('/invoices'), permissionKey: P.NAV_INVOICES },
    // Actions
    { keys: ['?'], label: zh ? '快捷键帮助' : 'Keyboard shortcuts help', action: () => setHelpOpen(true) },
  ];

  const filteredShortcuts = shortcuts.filter(
    s => !s.permissionKey || hasPermission(s.permissionKey)
  );

  // Sequence tracker for "g + x" combos
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input
    const tag = (e.target as HTMLElement)?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target as HTMLElement)?.isContentEditable) return;

    // Don't intercept if modifier keys are held (except for ?)
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === '?') {
      e.preventDefault();
      setHelpOpen(prev => !prev);
      return;
    }

    // Handle "g" prefix sequences
    if (e.key === 'g') {
      e.preventDefault();
      // Wait for next key
      const handler = (e2: KeyboardEvent) => {
        document.removeEventListener('keydown', handler);
        clearTimeout(timer);
        const tag2 = (e2.target as HTMLElement)?.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag2)) return;

        const match = filteredShortcuts.find(
          s => s.keys[0] === 'g' && s.keys[1] === e2.key
        );
        if (match) {
          e2.preventDefault();
          match.action();
        }
      };
      const timer = setTimeout(() => {
        document.removeEventListener('keydown', handler);
      }, 1500);
      document.addEventListener('keydown', handler, { once: true });
    }
  }, [filteredShortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const helpGroups: ShortcutGroup[] = [
    {
      group: zh ? '页面导航 (按 g 然后按字母)' : 'Navigation (press g then letter)',
      items: filteredShortcuts
        .filter(s => s.keys[0] === 'g')
        .map(s => ({ keys: s.keys, label: s.label })),
    },
    {
      group: zh ? '全局操作' : 'Global',
      items: [
        { keys: ['⌘', 'K'], label: zh ? '快速搜索' : 'Quick search' },
        { keys: ['⌘', 'B'], label: zh ? '切换侧边栏' : 'Toggle sidebar' },
        { keys: ['?'], label: zh ? '快捷键帮助' : 'Keyboard shortcuts' },
      ],
    },
  ];

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{zh ? '⌨️ 键盘快捷键' : '⌨️ Keyboard Shortcuts'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {helpGroups.map(group => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.group}</p>
              <div className="space-y-1.5">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, ki) => (
                        <span key={ki}>
                          {ki > 0 && <span className="text-muted-foreground text-xs mx-0.5">+</span>}
                          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
