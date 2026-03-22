import { useNavigate } from 'react-router-dom';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useI18n } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { costService } from '@/services';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Package, Wrench, Calculator, Users, FileSpreadsheet, Clock, Percent, ChevronRight } from 'lucide-react';

export default function CostControlIndex() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { t } = useI18n();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['q-cost-control-stats', tenantId],
    queryFn: () => costService.fetchCostControlStats(),
    enabled: !!user && !!tenantId,
    staleTime: 60_000,
  });

  const modules = [
    { id: 'budget', title: t('cost.budgetModule'), icon: Calculator, path: '/cost/budget', iconGradient: 'icon-gradient-orange' },
    { id: 'labor', title: t('cost.laborModule'), icon: Users, path: '/cost/labor', iconGradient: 'icon-gradient-pink' },
    { id: 'methods', title: t('cost.methodsModule'), icon: Wrench, path: '/cost/methods', iconGradient: 'icon-gradient-green' },
    { id: 'materials', title: t('cost.materialsModule'), icon: Package, path: '/cost/materials', iconGradient: 'icon-gradient-blue' },
    { id: 'category-mapping', title: t('cost.categoryMappingModule'), icon: Package, path: '/cost/category-mapping', iconGradient: 'icon-gradient-cyan' },
    { id: 'method-labor', title: t('cost.methodLaborModule'), icon: Clock, path: '/cost/method-labor', iconGradient: 'icon-gradient-amber' },
    { id: 'worker-types', title: t('cost.workerTypesModule'), icon: Users, path: '/cost/worker-types', iconGradient: 'icon-gradient-purple' },
    { id: 'tax-settings', title: t('cost.taxSettingsModule'), icon: Percent, path: '/cost/tax-settings', iconGradient: 'icon-gradient-red' },
  ];

  const heroStats = [
    { label: t('cost.totalMaterials'), value: String(stats?.materials || 0) },
    { label: t('cost.totalMethods'), value: String(stats?.methods || 0) },
    { label: t('cost.activeProjects'), value: String(stats?.activeProjects || 0) },
    { label: t('cost.materialCostTotal'), value: stats?.monthlyCost ? `RM ${(stats.monthlyCost / 1000).toFixed(1)}K` : 'RM 0' },
  ];

  return (
    <MobilePageShell title={t('cost.title')} icon={<FileSpreadsheet className="w-5 h-5" />} backTo="/" accentGradient="from-[#16A34A] to-[#6EE7B7]">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="hero-banner animate-fade-in" style={{ background: 'linear-gradient(135deg, #15803D 0%, #16A34A 60%, #22C55E 100%)' }}>
          <h1>{t('cost.welcome')}</h1>
          <p>{t('cost.selectModule')}</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {modules.map((module, i) => (
            <div key={module.id} className="module-card-v2 animate-fade-in" style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'backwards' }} onClick={() => navigate(module.path)}>
              <div className={`p-2.5 rounded-xl ${module.iconGradient} shadow-md shrink-0`}><module.icon className="w-5 h-5 text-primary-foreground" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold leading-tight truncate">{module.title}</p></div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </MobilePageShell>
  );
}
