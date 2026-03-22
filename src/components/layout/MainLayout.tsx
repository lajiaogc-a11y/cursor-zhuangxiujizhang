import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { ChevronRight, Home, AlertTriangle } from 'lucide-react';
import { useIsFetching } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { AnnouncementBanner } from '@/components/admin/AnnouncementBanner';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppChromeLoading } from '@/components/layout/AppChromeLoading';

interface MainLayoutProps {
  children: ReactNode;
}

const breadcrumbMap: Record<string, string> = {
  dashboard: 'nav.dashboard',
  memos: 'nav.memos',
  transactions: 'nav.transactions',
  projects: 'nav.projects',
  exchange: 'nav.exchange',
  payroll: 'nav.payroll',
  payables: 'nav.payables',
  'bank-reconciliation': 'nav.bankReconciliation',
  contacts: 'nav.contacts',
  invoices: 'nav.invoices',
  'tax-management': 'nav.taxManagement',
  approvals: 'nav.approvals',
  'fixed-assets': 'nav.fixedAssets',
  'balance-ledger': 'nav.balanceLedger',
  reports: 'nav.reports',
  'monthly-reports': 'nav.monthlyReports',
  alerts: 'nav.alerts',
  settings: 'nav.settings',
  'global-settings': 'globalSettings.title',
};

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const { tenant, tenants, loading: tenantLoading } = useTenant();
  const isFetching = useIsFetching();
  const location = useLocation();
  const { t, language } = useI18n();

  if (loading) {
    return <AppChromeLoading label={t('common.loading')} />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments
    .filter(seg => !uuidRegex.test(seg))
    .map((seg, i, filtered) => {
      const segIndex = pathSegments.indexOf(seg);
      const path = '/' + pathSegments.slice(0, segIndex + 1).join('/');
      const key = breadcrumbMap[seg];
      return { label: key ? t(key) : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '), path };
    });

  return (
    <div className="min-h-dvh bg-background">
      {isFetching > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
          <div className="h-full progress-gradient rounded-r" style={{ width: '100%' }} />
        </div>
      )}
      <Sidebar />
      <main
        id="main-content"
        className="min-h-dvh max-h-dvh app-main-scroll pt-14 lg:pt-0 lg:ml-[260px] lg:max-h-none lg:min-h-dvh"
        role="main"
      >
        {/* Breadcrumb bar */}
        {breadcrumbs.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-6 py-2 border-b border-border bg-background text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              <Home className="w-3.5 h-3.5" />
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                ) : (
                  <Link to={crumb.path} className="hover:text-foreground transition-colors">{crumb.label}</Link>
                )}
              </span>
            ))}
          </div>
        )}
        <div className="p-4 sm:p-5 lg:p-6 pb-20 lg:pb-6 space-y-3">
          <AnnouncementBanner />
          {!tenantLoading && user && !tenant && tenants.length === 0 && (
            <Alert className="border-amber-500/40 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">
                {language === 'zh' ? '未加入任何组织（租户）' : 'No organization (tenant)'}
              </AlertTitle>
              <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
                {language === 'zh'
                  ? '当前账号没有可用的租户成员身份。请联系管理员分配邀请码或成员资格；若刚完成注册，请确认注册时已使用有效邀请码。'
                  : 'Your account has no active tenant membership. Ask an administrator for an invitation, or register with a valid invite code.'}
              </AlertDescription>
            </Alert>
          )}
          {children}
        </div>
        <KeyboardShortcuts />
      </main>
    </div>
  );
}
