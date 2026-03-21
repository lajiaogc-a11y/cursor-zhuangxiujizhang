import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut,
} from '@/components/ui/command';
import {
  LayoutDashboard, Building2, Receipt, Bell, BarChart3, Settings,
  StickyNote, Wallet, Globe, FileText, Landmark, Contact,
  Calculator, ClipboardCheck, Package, Search,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { P } from '@/constants/permissions';
import { LucideIcon } from 'lucide-react';

interface SearchItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  group: string;
  keywords?: string[];
  permissionKey?: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { hasPermission } = useAuth();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === 'F2') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const groupCore = language === 'zh' ? '核心业务' : 'Core';
  const groupFinance = language === 'zh' ? '财务管理' : 'Finance';
  const groupReports = language === 'zh' ? '报表分析' : 'Reports';
  const groupSettings = language === 'zh' ? '系统设置' : 'Settings';

  const items: SearchItem[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, path: '/dashboard', group: groupCore, keywords: ['仪表盘', 'dashboard', 'home'], permissionKey: P.NAV_DASHBOARD },
    { id: 'memos', label: t('nav.memos'), icon: StickyNote, path: '/memos', group: groupCore, keywords: ['备忘', 'memo', 'note'], permissionKey: P.NAV_MEMOS },
    { id: 'projects', label: t('nav.projects'), icon: Building2, path: '/projects', group: groupCore, keywords: ['项目', 'project', '工程'], permissionKey: P.NAV_PROJECTS },
    { id: 'transactions', label: t('nav.transactions'), icon: Receipt, path: '/transactions', group: groupCore, keywords: ['收支', 'transaction', '交易'], permissionKey: P.NAV_TRANSACTIONS },
    { id: 'bank', label: t('nav.bankReconciliation'), icon: Landmark, path: '/bank-reconciliation', group: groupFinance, keywords: ['银行', 'bank', '对账'], permissionKey: P.NAV_BANK_RECONCILIATION },
    { id: 'contacts', label: t('nav.contacts'), icon: Contact, path: '/contacts', group: groupFinance, keywords: ['联系人', 'contact', '客户'], permissionKey: P.NAV_CONTACTS },
    { id: 'invoices', label: t('nav.invoices'), icon: FileText, path: '/invoices', group: groupFinance, keywords: ['发票', 'invoice'], permissionKey: P.NAV_INVOICES },
    { id: 'tax', label: t('nav.taxManagement'), icon: Calculator, path: '/tax-management', group: groupFinance, keywords: ['税务', 'tax'], permissionKey: P.NAV_TAX_MANAGEMENT },
    { id: 'assets', label: t('nav.fixedAssets'), icon: Package, path: '/fixed-assets', group: groupFinance, keywords: ['资产', 'asset', '固定'], permissionKey: P.NAV_FIXED_ASSETS },
    { id: 'approvals', label: t('nav.approvals'), icon: ClipboardCheck, path: '/approvals', group: groupReports, keywords: ['审批', 'approval'], permissionKey: P.NAV_APPROVALS },
    { id: 'balance', label: t('nav.balanceLedger'), icon: Wallet, path: '/balance-ledger', group: groupReports, keywords: ['余额', 'balance', '明细'], permissionKey: P.NAV_BALANCE_LEDGER },
    { id: 'reports', label: t('nav.reports'), icon: BarChart3, path: '/reports', group: groupReports, keywords: ['报表', 'report'], permissionKey: P.NAV_REPORTS },
    { id: 'monthly', label: t('nav.monthlyReports'), icon: BarChart3, path: '/monthly-reports', group: groupReports, keywords: ['月度', 'monthly'], permissionKey: P.NAV_MONTHLY_REPORTS },
    { id: 'alerts', label: t('nav.alerts'), icon: Bell, path: '/alerts', group: groupReports, keywords: ['提醒', 'alert', '通知'], permissionKey: P.NAV_ALERTS },
    { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/settings', group: groupSettings, keywords: ['设置', 'settings', '配置'], permissionKey: P.NAV_SETTINGS },
    { id: 'global-settings', label: t('globalSettings.title'), icon: Globe, path: '/global-settings', group: groupSettings, keywords: ['全局', 'global', '汇率'], permissionKey: P.NAV_SETTINGS },
  ];

  const filteredItems = items.filter(
    item => !item.permissionKey || hasPermission(item.permissionKey)
  );

  const groups = [...new Set(filteredItems.map(i => i.group))];

  const handleSelect = useCallback((path: string) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  return (
    <>
      {/* Trigger button in sidebar/header */}
      <button
        data-tour="search"
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors w-full"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">{language === 'zh' ? '快速搜索...' : 'Search...'}</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={language === 'zh' ? '搜索页面、功能...' : 'Search pages, features...'} />
        <CommandList>
          <CommandEmpty>{language === 'zh' ? '未找到相关结果' : 'No results found.'}</CommandEmpty>
          {groups.map(group => (
            <CommandGroup key={group} heading={group}>
              {filteredItems
                .filter(i => i.group === group)
                .map(item => (
                  <CommandItem
                    key={item.id}
                    value={[item.label, ...(item.keywords || [])].join(' ')}
                    onSelect={() => handleSelect(item.path)}
                    className="cursor-pointer"
                  >
                    <item.icon className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
