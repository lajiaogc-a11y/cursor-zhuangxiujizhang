import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Receipt, Bell, BarChart3, Settings,
  Menu, StickyNote, Wallet, Globe, FileText, Landmark, Contact,
  Calculator, ClipboardCheck, Package, Moon, Sun, ChevronLeft, LogOut,
} from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth';
import { useAlertCount } from '@/hooks/useAlertCount';
import { useMemoCount } from '@/hooks/useMemoCount';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { P } from '@/constants/permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import companyLogo from '@/assets/company-logo.png';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { MobileBottomNav } from './MobileBottomNav';

interface NavGroup { label: string; items: NavItem[]; }
interface NavItem { path: string; label: string; icon: any; showBadge?: boolean; showMemoBadge?: boolean; permissionKey: string; }

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, hasPermission, user } = useAuth();
  const alertCount = useAlertCount();
  const memoCount = useMemoCount();
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const toggleLanguage = () => setLanguage(language === 'zh' ? 'en' : 'zh');

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowLogoutConfirm(false);
  };

  const navGroups: NavGroup[] = [
    {
      label: language === 'zh' ? '核心业务' : 'Core',
      items: [
        { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, permissionKey: P.NAV_DASHBOARD },
        { path: '/memos', label: t('nav.memos'), icon: StickyNote, showMemoBadge: true, permissionKey: P.NAV_MEMOS },
        { path: '/projects', label: t('nav.projects'), icon: Building2, permissionKey: P.NAV_PROJECTS },
        { path: '/transactions', label: t('nav.transactions'), icon: Receipt, permissionKey: P.NAV_TRANSACTIONS },
      ],
    },
    {
      label: language === 'zh' ? '财务管理' : 'Finance',
      items: [
        { path: '/bank-reconciliation', label: t('nav.bankReconciliation'), icon: Landmark, permissionKey: P.NAV_BANK_RECONCILIATION },
        { path: '/contacts', label: t('nav.contacts'), icon: Contact, permissionKey: P.NAV_CONTACTS },
        { path: '/invoices', label: t('nav.invoices'), icon: FileText, permissionKey: P.NAV_INVOICES },
        { path: '/tax-management', label: t('nav.taxManagement'), icon: Calculator, permissionKey: P.NAV_TAX_MANAGEMENT },
        { path: '/fixed-assets', label: t('nav.fixedAssets'), icon: Package, permissionKey: P.NAV_FIXED_ASSETS },
      ],
    },
    {
      label: language === 'zh' ? '报表分析' : 'Reports',
      items: [
        { path: '/approvals', label: t('nav.approvals'), icon: ClipboardCheck, permissionKey: P.NAV_APPROVALS },
        { path: '/balance-ledger', label: t('nav.balanceLedger'), icon: Wallet, permissionKey: P.NAV_BALANCE_LEDGER },
        { path: '/reports', label: t('nav.reports'), icon: BarChart3, permissionKey: P.NAV_REPORTS },
        { path: '/monthly-reports', label: t('nav.monthlyReports'), icon: BarChart3, permissionKey: P.NAV_MONTHLY_REPORTS },
        { path: '/alerts', label: t('nav.alerts'), icon: Bell, showBadge: true, permissionKey: P.NAV_ALERTS },
      ],
    },
    {
      label: language === 'zh' ? '系统设置' : 'Settings',
      items: [
        { path: '/settings', label: t('nav.settings'), icon: Settings, permissionKey: P.NAV_SETTINGS },
        { path: '/global-settings', label: t('globalSettings.title'), icon: Globe, permissionKey: P.NAV_SETTINGS },
      ],
    },
  ];

  const handleNavClick = () => { if (onClose) onClose(); };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Brand Header */}
      <div className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => { handleNavClick(); navigate('/'); }}
            className="h-9 w-9 shrink-0 rounded-lg border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-sidebar-foreground/60" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-sidebar-foreground leading-tight truncate">{t('nav.financeSystem')}</h2>
            <p className="text-[10px] text-sidebar-foreground/40 leading-tight mt-0.5">Flash Cast ERP</p>
          </div>
        </div>
      </div>

      {/* Search trigger */}
      <div className="px-3 py-2">
        <GlobalSearch />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-3 overflow-y-auto" aria-label="Main navigation">
        {navGroups.map((group) => {
          const filteredItems = group.items.filter(item =>
            !item.permissionKey || hasPermission(item.permissionKey)
          );
          if (filteredItems.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              <ul className="space-y-0.5 mb-1">
                {filteredItems.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={handleNavClick}
                        className={cn("nav-item flex items-center justify-between", isActive && "active")}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4" />
                          <span className="text-[13px]">{item.label}</span>
                        </div>
                        {item.showBadge && alertCount > 0 && (
                          <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 min-w-5 h-5 flex items-center justify-center rounded-full">
                            {alertCount > 99 ? '99+' : alertCount}
                          </Badge>
                        )}
                        {item.showMemoBadge && memoCount > 0 && (
                          <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 min-w-5 h-5 flex items-center justify-center rounded-full">
                            {memoCount > 99 ? '99+' : memoCount}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-sidebar-border px-4 py-3 space-y-2">
        {/* User info */}
        <div 
          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer"
          onClick={() => { handleNavClick(); navigate('/profile'); }}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email?.split('@')[0]}</p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email}</p>
          </div>
        </div>
        
        <div data-tour="theme" className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 rounded-lg"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 rounded-lg"
          >
            <Globe className="w-3.5 h-3.5" />
          </Button>
          <NotificationCenter />
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLogoutConfirm(true)}
            className="text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('auth.logoutConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('auth.logoutConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} disabled={isSigningOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSigningOut && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
              {t('auth.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  const openSidebar = useCallback(() => setIsOpen(true), []);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[260px] bg-sidebar flex-col border-r border-sidebar-border z-40" aria-label="Sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-xl border-b border-border z-40 flex items-center px-3 gap-2" role="banner">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-9 w-9 text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-sidebar-border">
            <SidebarContent onClose={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold text-foreground">{t('nav.financeSystem')}</span>
      </header>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav onOpenSidebar={openSidebar} />
    </>
  );
}
