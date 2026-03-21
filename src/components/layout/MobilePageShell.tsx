import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, Settings, MoreVertical, LogOut, Loader2, Moon, Sun, Globe, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface MobilePageShellProps {
  title: string;
  titleEn?: string;
  subtitle?: string;
  icon?: ReactNode;
  backTo?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  accentGradient?: string;
  breadcrumbs?: BreadcrumbItem[];
  fab?: ReactNode;
}

export function MobilePageShell({ title, titleEn, subtitle, icon, backTo, children, headerActions, className, accentGradient, breadcrumbs, fab }: MobilePageShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useI18n();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowLogoutConfirm(false);
  };

  const getBackPath = () => {
    if (backTo) return backTo;
    const path = location.pathname;
    if (path.startsWith('/cost/')) return '/cost';
    if (path.startsWith('/purchasing/orders/')) return '/purchasing/orders';
    if (path.startsWith('/purchasing/')) return '/purchasing';
    if (path.startsWith('/quotation/')) return '/quotation';
    if (path === '/quotation') return '/';
    return '/';
  };

  return (
    <div className={cn("min-h-screen bg-background flex flex-col", className)}>
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/60 sticky top-0 z-50 shrink-0">
        <div className="flex items-center h-14 px-2 gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(getBackPath())} className="h-9 w-9 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex-1 min-w-0 flex items-center gap-2">
            {icon && <span className="text-primary shrink-0">{icon}</span>}
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate">{title}</h1>
              {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>

          {headerActions}

          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/global-settings')}>
                <Settings className="w-4 h-4 mr-2" />
                <span className="text-sm">{t('globalSettings.title')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/')}>
                <Home className="w-4 h-4 mr-2" />
                <span className="text-sm">{t('system.select')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}>
                <Globe className="w-4 h-4 mr-2" />
                <span className="text-sm">{language === 'zh' ? 'English' : '中文'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                <span className="text-sm">{t('nav.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 px-3 pb-2 text-[11px] text-muted-foreground overflow-x-auto">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                {crumb.path ? (
                  <button onClick={() => navigate(crumb.path!)} className="hover:text-foreground transition-colors">{crumb.label}</button>
                ) : (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Gradient accent line */}
        <div className={cn("h-[2px] opacity-60", accentGradient ? `bg-gradient-to-r ${accentGradient}` : "bg-gradient-to-r from-primary via-accent to-primary opacity-40")} />
      </header>

      <main className="flex-1 overflow-auto animate-page-enter pb-16 lg:pb-0">{children}</main>

      {/* FAB / Action bar */}
      {fab && (
        <div className="fixed bottom-4 right-4 z-40">
          {fab}
        </div>
      )}

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('auth.logoutConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('auth.logoutConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} disabled={isSigningOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSigningOut && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('auth.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
