import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useQPurchaseOrders } from '@/hooks/useQPurchaseOrders';
import { useQSuppliers } from '@/hooks/useQSuppliers';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Building2, FileText, BarChart3, ShoppingCart, Package, Warehouse, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

export default function PurchasingIndex() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { orders, loading: ordersLoading } = useQPurchaseOrders();
  const { suppliers, loading: suppliersLoading } = useQSuppliers();
  const loading = ordersLoading || suppliersLoading;

  const stats = useMemo(() => {
    const activeSuppliers = suppliers.filter(s => s.isActive).length;
    const pendingOrders = orders.filter(o => o.status === 'draft' || o.status === 'ordered').length;
    const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
    const completed = orders.filter(o => o.status === 'received' || o.status === 'submitted_to_finance' || o.status === 'archived').length;
    return { activeSuppliers, pendingOrders, totalAmount, completed };
  }, [orders, suppliers]);

  const modules = [
    { id: 'suppliers', title: t('purchasing.suppliersModule'), icon: Building2, path: '/purchasing/suppliers', iconGradient: 'icon-gradient-blue' },
    { id: 'materials', title: t('purchasing.materialsModule'), icon: Package, path: '/purchasing/materials', iconGradient: 'icon-gradient-purple' },
    { id: 'orders', title: t('purchasing.ordersModule'), icon: FileText, path: '/purchasing/orders', iconGradient: 'icon-gradient-green' },
    { id: 'inventory', title: t('purchasing.inventoryModule'), icon: Warehouse, path: '/purchasing/inventory', iconGradient: 'icon-gradient-amber' },
    { id: 'summary', title: t('purchasing.summaryModule'), icon: BarChart3, path: '/purchasing/summary', iconGradient: 'icon-gradient-orange' },
  ];

  const heroStats = [
    { label: t('purchasing.suppliersCount'), value: String(stats.activeSuppliers) },
    { label: t('purchasing.pendingCount'), value: String(stats.pendingOrders) },
    { label: t('purchasing.totalPurchase'), value: `RM ${(stats.totalAmount / 1000).toFixed(1)}K` },
    { label: t('purchasing.completedCount'), value: String(stats.completed) },
  ];

  return (
    <MobilePageShell title={t('purchasing.title')} icon={<ShoppingCart className="w-5 h-5" />} backTo="/" accentGradient="from-[#9333EA] to-[#A78BFA]">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        {/* Hero Banner */}
        <div className="hero-banner animate-fade-in" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 60%, #A78BFA 100%)' }}>
          <h1>{t('purchasing.welcome')}</h1>
          <p>{t('purchasing.selectModule')}</p>
          {!loading && (
            <div className="hero-stats">
              {heroStats.map(s => (
                <div key={s.label} className="hero-stat">
                  <span className="hero-stat-value">{s.value}</span>
                  <span className="hero-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}
          {loading && <div className="h-12 mt-4" />}
        </div>

        {/* Module Cards v2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
