import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Trash2, AlertTriangle, Database, Shield, Loader2,
  CheckCircle2, XCircle, Square, FileText, BarChart3,
  ShoppingCart, Wallet, Users, HardHat,
} from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import {
  fetchTenantModuleDataCounts,
  batchDeleteTenantTable,
  resetTenantAccountBalances,
  verifyPassword,
} from '@/services/settings.service';

interface ModuleCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tables: string[];
  count: number;
  dangerous?: boolean;
}

interface CleanupResult {
  category: string;
  success: boolean;
  deleted: number;
  error?: string;
}

const MODULE_ICONS: Record<string, { bg: string; text: string }> = {
  quotation:  { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  cost:       { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  purchasing: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  finance:    { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  crm:        { bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400' },
  workforce:  { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
};

const MODULE_ICON_COMPONENTS: Record<string, React.ReactNode> = {
  quotation: <FileText className="w-5 h-5" />,
  cost: <BarChart3 className="w-5 h-5" />,
  purchasing: <ShoppingCart className="w-5 h-5" />,
  finance: <Wallet className="w-5 h-5" />,
  crm: <Users className="w-5 h-5" />,
  workforce: <HardHat className="w-5 h-5" />,
};

export function TenantDataCleanup() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const [modules, setModules] = useState<ModuleCategory[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState<CleanupResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState('');
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    if (tenantId) fetchCounts();
  }, [tenantId]);

  const fetchCounts = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const counts = await fetchTenantModuleDataCounts(tenantId);
      setModules([
        {
          id: 'quotation', name: t('tenantCleanup.quotation'), description: t('tenantCleanup.quotationDesc'),
          icon: MODULE_ICON_COMPONENTS.quotation,
          tables: ['q_quotation_versions', 'q_quotation_drafts', 'q_quotations', 'q_products', 'q_product_categories', 'q_customers'],
          count: counts.quotation, dangerous: true,
        },
        {
          id: 'cost', name: t('tenantCleanup.cost'), description: t('tenantCleanup.costDesc'),
          icon: MODULE_ICON_COMPONENTS.cost,
          tables: ['q_breakdown_items', 'q_project_breakdowns', 'q_method_materials', 'q_category_method_mapping', 'q_methods', 'q_labor_rates', 'q_worker_types'],
          count: counts.cost,
        },
        {
          id: 'purchasing', name: t('tenantCleanup.purchasing'), description: t('tenantCleanup.purchasingDesc'),
          icon: MODULE_ICON_COMPONENTS.purchasing,
          tables: ['q_purchase_receiving_items', 'q_purchase_receivings', 'q_purchase_payments', 'q_purchase_order_items', 'q_purchase_orders', 'q_inventory_transactions', 'q_inventory', 'q_material_supplier_prices', 'q_materials', 'q_suppliers'],
          count: counts.purchasing, dangerous: true,
        },
        {
          id: 'finance', name: t('tenantCleanup.finance'), description: t('tenantCleanup.financeDesc'),
          icon: MODULE_ICON_COMPONENTS.finance,
          tables: ['payable_payments', 'project_payments', 'project_expenses', 'project_additions', 'project_alerts', 'payables', 'transactions', 'exchange_transactions', 'projects'],
          count: counts.finance, dangerous: true,
        },
        {
          id: 'crm', name: t('tenantCleanup.crm'), description: t('tenantCleanup.crmDesc'),
          icon: MODULE_ICON_COMPONENTS.crm,
          tables: ['contract_amendments', 'contract_payment_plans', 'contract_signatures', 'contracts', 'contact_activities', 'contact_reminders', 'contacts'],
          count: counts.crm,
        },
        {
          id: 'workforce', name: t('tenantCleanup.workforce'), description: t('tenantCleanup.workforceDesc'),
          icon: MODULE_ICON_COMPONENTS.workforce,
          tables: ['shift_assignments', 'attendance_records', 'leave_requests', 'workforce_payroll', 'work_orders'],
          count: counts.workforce,
        },
      ]);
    } catch {
      toast.error(t('cleanup.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (id: string) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedModules.length === modules.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(modules.filter(m => m.count > 0).map(m => m.id));
    }
  };

  const handleCleanup = async () => {
    setVerifying(true);
    setAuthError('');
    try {
      const success = await verifyPassword(email, password);
      if (!success) { setAuthError(t('cleanup.authFailed')); setVerifying(false); return; }
    } catch {
      setAuthError(t('cleanup.verifyFailed')); setVerifying(false); return;
    }

    setVerifying(false);
    setCleaning(true);
    setShowConfirm(false);
    setCleanupProgress('');
    cancelRef.current = { cancelled: false };

    const cleanupResults: CleanupResult[] = [];

    // Tables are already in correct FK-safe deletion order in each module's tables array
    for (const mod of modules.filter(m => selectedModules.includes(m.id))) {
      if (cancelRef.current.cancelled) break;

      const tablesToDelete = mod.tables;

      let modDeleted = 0;
      let modError: string | undefined;

      for (const table of tablesToDelete) {
        if (cancelRef.current.cancelled) break;
        setCleanupProgress(`${mod.name}: ${table}...`);
        const result = await batchDeleteTenantTable(table, tenantId!, () => cancelRef.current.cancelled);
        modDeleted += result.deleted;
        if (result.error) { modError = result.error; break; }
        if (result.cancelled) break;
      }

      cleanupResults.push({
        category: mod.name,
        success: !modError && !cancelRef.current.cancelled,
        deleted: modDeleted,
        error: cancelRef.current.cancelled ? t('common.operationCancelled') : modError,
      });
    }

    // Reset account balances if finance was cleaned
    if (!cancelRef.current.cancelled && selectedModules.includes('finance') && tenantId) {
      try {
        await resetTenantAccountBalances(tenantId);
        cleanupResults.push({ category: t('cleanup.accountBalance'), success: true, deleted: 0 });
      } catch (e: any) {
        cleanupResults.push({ category: t('cleanup.accountBalanceReset'), success: false, deleted: 0, error: e.message });
      }
    }

    setResults(cleanupResults);
    setShowResults(true);
    setCleaning(false);
    setCleanupProgress('');
    setSelectedModules([]);
    await fetchCounts();

    const totalDeleted = cleanupResults.reduce((s, r) => s + r.deleted, 0);
    const failCount = cleanupResults.filter(r => !r.success).length;
    if (cancelRef.current.cancelled) {
      toast.info(t('cleanup.cancelled').replace('{count}', String(totalDeleted)));
    } else if (failCount === 0) {
      toast.success(t('cleanup.completeSuccess').replace('{count}', String(cleanupResults.filter(r => r.success).length)));
    } else {
      toast.warning(t('cleanup.completePartial')
        .replace('{success}', String(cleanupResults.filter(r => r.success).length))
        .replace('{fail}', String(failCount)));
    }
  };

  const totalSelected = modules
    .filter(m => selectedModules.includes(m.id))
    .reduce((sum, m) => sum + m.count, 0);

  const hasDangerous = modules
    .filter(m => selectedModules.includes(m.id))
    .some(m => m.dangerous);

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              {t('tenantCleanup.title')}
            </CardTitle>
            <CardDescription>{t('tenantCleanup.desc')}</CardDescription>
          </div>
          <Badge variant="outline" className="text-muted-foreground">{t('cleanup.adminOnly')}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Preserved notice */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-1">{t('tenantCleanup.preservedTitle')}</p>
            <ul className="text-muted-foreground space-y-0.5">
              <li>• {t('tenantCleanup.preservedAccounts')}</li>
              <li>• {t('tenantCleanup.preservedCategories')}</li>
              <li>• {t('tenantCleanup.preservedUsers')}</li>
              <li>• {t('tenantCleanup.preservedRates')}</li>
            </ul>
          </div>
        </div>

        {/* Module grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{t('cleanup.counting')}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t('tenantCleanup.selectModules')}</h4>
              <Button variant="ghost" size="sm" onClick={selectAll} className="h-8">
                {selectedModules.length === modules.filter(m => m.count > 0).length ? t('cleanup.deselectAll') : t('cleanup.selectAll')}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map(mod => {
                const colors = MODULE_ICONS[mod.id] || MODULE_ICONS.quotation;
                return (
                  <div
                    key={mod.id}
                    className={`
                      relative flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200
                      ${selectedModules.includes(mod.id)
                        ? 'border-destructive bg-destructive/5 ring-1 ring-destructive/20'
                        : 'hover:border-muted-foreground/30 hover:bg-muted/30'}
                      ${mod.count === 0 ? 'opacity-50 pointer-events-none' : ''}
                    `}
                    onClick={() => mod.count > 0 && toggleModule(mod.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
                        <span className={colors.text}>{mod.icon}</span>
                      </div>
                      <Checkbox
                        checked={selectedModules.includes(mod.id)}
                        onCheckedChange={() => toggleModule(mod.id)}
                        disabled={mod.count === 0}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{mod.name}</span>
                        {mod.dangerous && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{t('cleanup.core')}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>
                    </div>
                    <Badge variant={mod.count > 0 ? 'secondary' : 'outline'} className="self-start">
                      {mod.count} {t('cleanup.records')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {cleaning && cleanupProgress ? (
              <span className="text-primary">{cleanupProgress}</span>
            ) : selectedModules.length > 0 ? (
              <span>
                {t('cleanup.selected')} <span className="font-medium text-foreground">{selectedModules.length}</span> {t('tenantCleanup.modulesCount')}
                {t('cleanup.totalRecords')} <span className="font-medium text-destructive">{totalSelected.toLocaleString()}</span> {t('cleanup.recordsCount')}
              </span>
            ) : (
              <span>{t('tenantCleanup.selectPrompt')}</span>
            )}
          </div>
          <div className="flex gap-2">
            {cleaning && (
              <Button variant="outline" onClick={() => { cancelRef.current.cancelled = true; setCleanupProgress(t('cleanup.cancelling')); }} className="gap-2">
                <Square className="w-4 h-4" />{t('common.cancel')}
              </Button>
            )}
            <Button variant="destructive" disabled={selectedModules.length === 0 || cleaning} onClick={() => setShowConfirm(true)} className="gap-2">
              {cleaning ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{t('cleanup.cleaning')}</>
              ) : (
                <><Trash2 className="w-4 h-4" />{t('cleanup.startCleanup')}</>
              )}
            </Button>
          </div>
        </div>

        {/* Confirm dialog */}
        <AlertDialog open={showConfirm} onOpenChange={(open) => {
          setShowConfirm(open);
          if (!open) { setEmail(''); setPassword(''); setAuthError(''); }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                {t('settings.cleanupConfirm')}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>{t('tenantCleanup.confirmWarning')}</p>
                <ul className="text-sm space-y-1 pl-4">
                  {modules.filter(m => selectedModules.includes(m.id)).map(m => (
                    <li key={m.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      {m.name}：<span className="font-medium">{m.count} {t('cleanup.records')}</span>
                    </li>
                  ))}
                </ul>
                {hasDangerous && (
                  <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{t('cleanup.dangerousWarning')}</span>
                  </div>
                )}
                <div className="pt-4 space-y-3">
                  <p className="font-medium">{t('settings.enterPassword')}</p>
                  <div className="space-y-2">
                    <Input type="email" placeholder={t('settings.email')} value={email} onChange={e => setEmail(e.target.value)} />
                    <Input type="password" placeholder={t('settings.password')} value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  {authError && <p className="text-sm text-destructive">{authError}</p>}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCleanup}
                disabled={!email || !password || verifying}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {verifying ? t('settings.verifying') : t('settings.confirmDelete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Results dialog */}
        <AlertDialog open={showResults} onOpenChange={setShowResults}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />{t('cleanup.complete')}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>{t('cleanup.results')}</p>
                  <div className="space-y-2">
                    {results.map((r, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-lg text-sm ${r.success ? 'bg-muted' : 'bg-destructive/10'}`}>
                        <div className="flex items-center gap-2">
                          {r.success ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                          <span>{r.category}</span>
                        </div>
                        {r.success ? (
                          <span className="text-muted-foreground">
                            {r.deleted > 0 ? t('cleanup.deleted').replace('{count}', String(r.deleted)) : t('cleanup.reset')}
                          </span>
                        ) : (
                          <span className="text-destructive text-xs">{r.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>{t('common.confirm')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
