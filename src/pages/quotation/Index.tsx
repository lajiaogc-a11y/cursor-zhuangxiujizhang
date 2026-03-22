import { useNavigate } from 'react-router-dom';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useI18n } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { fetchQuotationStats } from '@/services/quotation.service';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { FileText, Users, Package, History, BookOpen, FolderTree, Settings, Ruler, ChevronRight } from 'lucide-react';

export default function QuotationIndex() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { t } = useI18n();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['q-quotation-stats', tenantId],
    queryFn: fetchQuotationStats,
    enabled: !!user && !!tenantId,
    staleTime: 60_000,
  });

  const modules = [
    { id: 'editor', title: t('quotation.editor'), desc: t('quotation.editorDesc') || '', icon: FileText, path: '/quotation/editor', iconGradient: 'icon-gradient-blue' },
    { id: 'history', title: t('quotation.history'), desc: t('quotation.historyDesc') || '', icon: History, path: '/quotation/history', iconGradient: 'icon-gradient-green' },
    { id: 'products', title: t('quotation.products'), desc: t('quotation.productsDesc') || '', icon: Package, path: '/quotation/products', iconGradient: 'icon-gradient-purple' },
    { id: 'customers', title: t('quotation.customers'), desc: t('quotation.customersDesc') || '', icon: Users, path: '/quotation/customers', iconGradient: 'icon-gradient-orange' },
    { id: 'templates', title: t('quotation.templates'), desc: t('quotation.templatesDesc') || '', icon: BookOpen, path: '/quotation/templates', iconGradient: 'icon-gradient-cyan' },
    { id: 'categories', title: t('quotation.categories'), desc: t('quotation.categoriesDesc') || '', icon: FolderTree, path: '/quotation/categories', iconGradient: 'icon-gradient-amber' },
    { id: 'units', title: t('quotation.units'), desc: t('quotation.unitsDesc') || '', icon: Ruler, path: '/quotation/units', iconGradient: 'icon-gradient-rose' },
    { id: 'settings', title: t('quotation.settingsModule'), desc: t('quotation.settingsDesc') || '', icon: Settings, path: '/quotation/settings', iconGradient: 'icon-gradient-slate' },
  ];

  const heroStats = [
    { label: t('quotation.totalQuotations'), value: String(stats?.total || 0) },
    { label: t('quotation.drafts'), value: String(stats?.drafts || 0) },
    { label: t('quotation.customerCount'), value: String(stats?.customers || 0) },
    { label: t('quotation.productCount'), value: String(stats?.products || 0) },
  ];

  return (
    <MobilePageShell title={t('quotation.title')} icon={<FileText className="w-5 h-5" />} backTo="/" accentGradient="from-[#2563EB] to-[#60A5FA]">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        {/* Hero Banner */}
        <div className="hero-banner animate-fade-in" style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #3B82F6 100%)' }}>
          <h1>{t('quotation.welcome')}</h1>
          <p>{t('quotation.selectModule')}</p>
          {!isLoading && (
            <div className="hero-stats">
              {heroStats.map(s => (
                <div key={s.label} className="hero-stat">
                  <span className="hero-stat-value">{s.value}</span>
                  <span className="hero-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}
          {isLoading && (
            <div className="flex justify-center mt-4 py-2 text-primary-foreground/90">
              <ChromeLoadingSpinner variant="muted" className="h-6 w-6 text-inherit" />
            </div>
          )}
        </div>

        {/* Module Cards v2 - horizontal layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {modules.map((module, i) => (
            <div
              key={module.id}
              className="module-card-v2 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'backwards' }}
              onClick={() => navigate(module.path)}
            >
              <div className={`p-2.5 rounded-xl ${module.iconGradient} shadow-md shrink-0`}>
                <module.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{module.title}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </MobilePageShell>
  );
}
