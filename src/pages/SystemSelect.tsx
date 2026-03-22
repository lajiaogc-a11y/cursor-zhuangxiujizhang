import { useState } from 'react';
import { P } from '@/constants/permissions';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  FileText, BarChart3, ShoppingCart, Wallet, Settings, LogOut,
  Globe, Moon, Sun, ChevronRight, Plus,
  ClipboardList, Receipt, TrendingUp, FolderOpen, Briefcase,
  ArrowUpRight, ShieldCheck, Users, HardHat,
} from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { useTheme } from 'next-themes';
import { useTenant } from '@/lib/tenant';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import companyLogo from '@/assets/company-logo.png';
import { useQuery } from '@tanstack/react-query';
import { fetchSystemSelectStats } from '@/services/admin.service';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const moduleIcons: Record<string, { bg: string; text: string }> = {
  quotation:  { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  cost:       { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  purchasing: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  finance:    { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  crm:        { bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400' },
  workforce:  { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
};

const systemCards = [
  { id: 'quotation', icon: FileText, path: '/quotation', nameKey: 'quotation.title', descKey: 'system.quotationDesc', permissionKey: P.SYSTEM_QUOTATION },
  { id: 'cost', icon: BarChart3, path: '/cost', nameKey: 'cost.title', descKey: 'system.costDesc', permissionKey: P.SYSTEM_COST },
  { id: 'purchasing', icon: ShoppingCart, path: '/purchasing', nameKey: 'purchasing.title', descKey: 'system.purchasingDesc', permissionKey: P.SYSTEM_PURCHASING },
  { id: 'finance', icon: Wallet, path: '/dashboard', nameKey: 'nav.financeSystem', descKey: 'system.financeDesc', permissionKey: P.SYSTEM_FINANCE },
  { id: 'crm', icon: Users, path: '/crm', nameKey: 'crm.title', descKey: 'system.crmDesc', permissionKey: P.SYSTEM_CRM },
  { id: 'workforce', icon: HardHat, path: '/workforce', nameKey: 'workforce.title', descKey: 'workforce.desc', permissionKey: P.SYSTEM_WORKFORCE },
] as const;

export default function SystemSelect() {
  const navigate = useNavigate();
  const { user, userRole, signOut, hasPermission } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isSuperAdmin = useSuperAdmin();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: stats } = useQuery({
    queryKey: ['system-select-stats', tenantId, today, monthStart],
    queryFn: () => fetchSystemSelectStats(tenantId!, today, monthStart),
    enabled: !!tenantId,
  });

  const todayProjects = stats?.todayProjects || 0;
  const monthlyContracts = stats?.monthlyContracts || 0;
  const pendingOrders = stats?.pendingOrders || 0;
  const monthlyProfit = stats?.monthlyProfit || 0;
  const recentProjects = stats?.recentProjects || [];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowLogoutConfirm(false);
  };

  const getRoleLabel = (role: string | null) => {
    const map: Record<string, string> = {
      admin: language === 'zh' ? '管理员' : 'Admin',
      accountant: language === 'zh' ? '会计' : 'Accountant',
      project_manager: language === 'zh' ? '项目经理' : 'PM',
      shareholder: language === 'zh' ? '股东' : 'Shareholder',
    };
    return map[role || ''] || (language === 'zh' ? '查看者' : 'Viewer');
  };

  const formatMoney = (v: number) => {
    if (v >= 1000000) return `RM ${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `RM ${(v / 1000).toFixed(1)}K`;
    return `RM ${v.toFixed(0)}`;
  };

  const visibleSystems = systemCards.filter(s => userRole === 'admin' || hasPermission(s.permissionKey));

  const statsCards = [
    { label: t('system.todayProjects'), value: String(todayProjects), icon: Briefcase },
    { label: t('system.monthlyContracts'), value: formatMoney(monthlyContracts), icon: ClipboardList },
    { label: t('system.pendingOrders'), value: String(pendingOrders), icon: ShoppingCart },
    { label: t('system.monthlyProfit'), value: formatMoney(monthlyProfit), icon: TrendingUp },
  ];

  const quickActions = [
    { label: t('system.newQuotation'), icon: FileText, path: '/quotation/editor', id: 'quotation' },
    { label: t('system.newProject'), icon: Plus, path: '/projects', id: 'cost' },
    { label: t('system.recordTransaction'), icon: Receipt, path: '/transactions', id: 'purchasing' },
    { label: t('system.viewReports'), icon: TrendingUp, path: '/reports', id: 'finance' },
  ];

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      in_progress: language === 'zh' ? '进行中' : 'Active',
      completed: language === 'zh' ? '已完成' : 'Done',
      paused: language === 'zh' ? '已暂停' : 'Paused',
      pending: language === 'zh' ? '待处理' : 'Pending',
    };
    return map[status] || status;
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-primary/10 text-primary';
      case 'completed': return 'bg-success/10 text-success';
      case 'paused': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={companyLogo} alt="Flash Cast" className="h-8 w-auto object-contain dark:brightness-0 dark:invert" />
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-foreground leading-tight">Flash Cast</p>
                <p className="text-[11px] text-muted-foreground">闪铸装饰 · ERP</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <TenantSwitcher />
              <div className="flex items-center gap-2 mr-2 pr-2 border-r border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/profile')}>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-foreground leading-tight">{user?.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-muted-foreground">{getRoleLabel(userRole)}</p>
                </div>
              </div>

              {isSuperAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate('/super-admin')}>
                  <ShieldCheck className="w-4 h-4" />
                </Button>
              )}
              {(userRole === 'admin' || hasPermission('nav.settings')) && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate('/global-settings')}>
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}>
                <Globe className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => setShowLogoutConfirm(true)}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {language === 'zh' ? '控制中心' : 'Control Center'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">{language === 'zh' ? '欢迎回来，以下是您的业务概览' : 'Welcome back, here is your business overview'}</p>
        </div>

        {/* ===== Stats Row ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {statsCards.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-extrabold text-foreground leading-tight tabular-nums">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== System Modules ===== */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">
            {language === 'zh' ? '系统模块' : 'System Modules'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {visibleSystems.map((sys) => {
              const colors = moduleIcons[sys.id] || moduleIcons.quotation;
              return (
                <div
                  key={sys.id}
                  onClick={() => navigate(sys.path)}
                  className="group bg-card rounded-xl border border-border cursor-pointer transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 relative overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors.bg}`}>
                        <sys.icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0 translate-x-1">
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{t(sys.nameKey)}</h3>
                    <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{t(sys.descKey)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== Bottom grid ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Recent Projects */}
          <div className="lg:col-span-3 bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                {t('system.recentProjects')}
              </h3>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2 hover:text-foreground" onClick={() => navigate('/projects')}>
                {language === 'zh' ? '全部' : 'All'}
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">{t('system.noRecentProjects')}</p>
            ) : (
              <div className="divide-y divide-border">
                {recentProjects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => navigate('/projects')}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{p.project_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground font-mono">{p.project_code}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getStatusClasses(p.status)}`}>
                          {getStatusLabel(p.status)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-foreground shrink-0 ml-4 tabular-nums">{formatMoney(p.contract_amount_myr)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">{t('system.quickActions')}</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const colors = moduleIcons[action.id] || moduleIcons.quotation;
                return (
                  <button
                    key={action.label}
                    className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 cursor-pointer group"
                    onClick={() => navigate(action.path)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.bg}`}>
                      <action.icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight font-medium">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Logout Dialog */}
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
