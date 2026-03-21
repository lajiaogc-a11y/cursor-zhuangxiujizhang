import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import companyLogo from '@/assets/company-logo.png';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const { t, language } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(var(--primary)) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      <div className="relative text-center space-y-6 px-6 animate-fade-in">
        <img src={companyLogo} alt="Flash Cast" className="h-12 w-auto mx-auto object-contain dark:brightness-0 dark:invert opacity-60" />
        
        <div className="space-y-2">
          <h1 className="text-7xl font-black text-foreground/10 leading-none tracking-tighter">404</h1>
          <p className="text-lg font-semibold text-foreground">{t('notFound.message')}</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {language === 'zh' ? '您访问的页面不存在或已被移动' : 'The page you are looking for does not exist or has been moved'}
          </p>
        </div>

        <Button asChild variant="default" className="gap-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4" />
            {t('notFound.backHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
