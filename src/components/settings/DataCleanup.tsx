import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Trash2, 
  AlertTriangle, 
  Database,
  FolderOpen,
  Receipt,
  ArrowRightLeft,
  FileText,
  Shield,
  CheckCircle2,
  XCircle,
  Square
} from 'lucide-react';
import { fetchDataCounts as fetchDataCountsService, batchDeleteTable as batchDeleteTableService, resetAccountBalances, verifyPassword } from '@/services/admin.service';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';

interface DataCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  table: string;
  count: number;
  dangerous?: boolean;
}

interface CleanupResult {
  category: string;
  success: boolean;
  deleted: number;
  error?: string;
}

export function DataCleanup() {
  const { t, language } = useI18n();
  const [categories, setCategories] = useState<DataCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState<CleanupResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState<string>('');
  
  // 取消控制
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    fetchDataCounts();
  }, []);

  const fetchDataCounts = async () => {
    setLoading(true);
    try {
      const counts = await fetchDataCountsService();

      setCategories([
        { id: 'projects', name: t('cleanup.projects'), description: t('cleanup.projectsDesc'), icon: <FolderOpen className="w-5 h-5" />, table: 'projects', count: counts.projects, dangerous: true },
        { id: 'transactions', name: t('cleanup.transactions'), description: t('cleanup.transactionsDesc'), icon: <Receipt className="w-5 h-5" />, table: 'transactions', count: counts.transactions, dangerous: true },
        { id: 'exchange', name: t('cleanup.exchange'), description: t('cleanup.exchangeDesc'), icon: <ArrowRightLeft className="w-5 h-5" />, table: 'exchange_transactions', count: counts.exchange, dangerous: true },
        { id: 'payments', name: t('cleanup.payments'), description: t('cleanup.paymentsDesc'), icon: <FileText className="w-5 h-5" />, table: 'project_payments', count: counts.payments },
        { id: 'expenses', name: t('cleanup.expenses'), description: t('cleanup.expensesDesc'), icon: <FileText className="w-5 h-5" />, table: 'project_expenses', count: counts.expenses },
        { id: 'additions', name: t('cleanup.additions'), description: t('cleanup.additionsDesc'), icon: <FileText className="w-5 h-5" />, table: 'project_additions', count: counts.additions },
        { id: 'alerts', name: t('cleanup.alerts'), description: t('cleanup.alertsDesc'), icon: <AlertTriangle className="w-5 h-5" />, table: 'project_alerts', count: counts.alerts },
        { id: 'audit', name: t('cleanup.audit'), description: t('cleanup.auditDesc'), icon: <Shield className="w-5 h-5" />, table: 'audit_logs', count: counts.audit },
      ]);
    } catch (error) {
      console.error('Error fetching data counts:', error);
      toast.error(t('cleanup.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(c => c.id));
    }
  };

  const handleCleanup = async () => {
    // 首先验证密码
    setVerifying(true);
    setAuthError('');
    
    try {
      const success = await verifyPassword(email, password);
      if (!success) {
        setAuthError(t('cleanup.authFailed'));
        setVerifying(false);
        return;
      }
    } catch (error) {
      setAuthError(t('cleanup.verifyFailed'));
      setVerifying(false);
      return;
    }
    
    setVerifying(false);
    setCleaning(true);
    setShowConfirm(false);
    setCleanupProgress('');
    
    // 重置取消状态
    cancelRef.current = { cancelled: false };
    
    const cleanupResults: CleanupResult[] = [];

    // 定义删除顺序组（同组内可并行，组间需顺序执行以处理外键约束）
    // Group 1: 子表（项目相关的子表可并行删除）
    // Group 2: 主表（projects, transactions, exchange_transactions）
    // Group 3: 日志表（audit_logs）
    
    // Map category IDs to table names
    const categoryTableMap: Record<string, string> = {
      projects: 'projects',
      transactions: 'transactions',
      exchange: 'exchange_transactions',
      payments: 'project_payments',
      expenses: 'project_expenses',
      additions: 'project_additions',
      alerts: 'project_alerts',
      audit: 'audit_logs',
    };

    // Get selected tables
    const selectedTables = new Set(selectedCategories.map(id => categoryTableMap[id]));
    const hasProjects = selectedCategories.includes('projects');

    // 定义删除组 - 按外键依赖分组
    const deletionGroups = [
      // Group 1: 项目子表（可并行）
      ['project_payments', 'project_expenses', 'project_additions', 'project_alerts'],
      // Group 2: 主数据表（可并行）
      ['transactions', 'exchange_transactions', 'projects'],
      // Group 3: 日志表
      ['audit_logs'],
    ];

    // 批量删除函数（使用分页删除避免超时，支持取消）
    const batchDeleteTable = async (table: string): Promise<{ deleted: number; error?: string; cancelled?: boolean }> => {
      const result = await batchDeleteTableService(table, () => cancelRef.current.cancelled);
      if (result.deleted > 0) {
        const categoryName = categories.find(c => c.table === table)?.name || table;
        setCleanupProgress(`${categoryName}: ${result.deleted} ${t('cleanup.recordsDeleted')}`);
      }
      return result;
    };

    let wasCancelled = false;

    // 按组顺序删除，组内并行
    for (const group of deletionGroups) {
      // 检查是否被取消
      if (cancelRef.current.cancelled) {
        wasCancelled = true;
        break;
      }
      
      // 筛选出该组中被选中的表
      const tablesToDelete = group.filter(table => {
        // 如果选择了 projects，需要先删除相关子表
        if (hasProjects && ['project_payments', 'project_expenses', 'project_additions', 'project_alerts'].includes(table)) {
          return true;
        }
        return selectedTables.has(table);
      });

      if (tablesToDelete.length === 0) continue;

      // 并行删除该组内的所有表
      const groupResults = await Promise.all(
        tablesToDelete.map(async (table) => {
          const result = await batchDeleteTable(table);
          return { table, ...result };
        })
      );

      // 收集结果
      for (const result of groupResults) {
        if (result.cancelled) {
          wasCancelled = true;
        }
        cleanupResults.push({
          category: categories.find(c => c.table === result.table)?.name || result.table,
          success: !result.error && !result.cancelled,
          deleted: result.deleted,
          error: result.cancelled ? t('common.operationCancelled') : result.error,
        });
      }
    }

    // Reset company accounts if transactions or exchange were deleted (only if not cancelled)
    if (!wasCancelled && (selectedCategories.includes('transactions') || selectedCategories.includes('exchange'))) {
      try {
        await resetAccountBalances();
        cleanupResults.push({
          category: t('cleanup.accountBalance'),
          success: true,
          deleted: 0,
        });
      } catch (error: any) {
        cleanupResults.push({
          category: t('cleanup.accountBalanceReset'),
          success: false,
          deleted: 0,
          error: error.message,
        });
      }
    }

    setResults(cleanupResults);
    setShowResults(true);
    setCleaning(false);
    setCleanupProgress('');
    setSelectedCategories([]);
    
    // Refresh counts
    await fetchDataCounts();
    
    const successCount = cleanupResults.filter(r => r.success).length;
    const failCount = cleanupResults.filter(r => !r.success).length;
    const totalDeleted = cleanupResults.reduce((sum, r) => sum + r.deleted, 0);
    
    if (wasCancelled) {
      toast.info(t('cleanup.cancelled').replace('{count}', String(totalDeleted)));
    } else if (failCount === 0) {
      toast.success(t('cleanup.completeSuccess').replace('{count}', String(successCount)));
    } else {
      toast.warning(t('cleanup.completePartial').replace('{success}', String(successCount)).replace('{fail}', String(failCount)));
    }
  };
  
  // 取消清理
  const handleCancelCleanup = () => {
    cancelRef.current.cancelled = true;
    setCleanupProgress(t('cleanup.cancelling'));
  };

  const totalSelected = categories
    .filter(c => selectedCategories.includes(c.id))
    .reduce((sum, c) => sum + c.count, 0);

  const hasDangerous = categories
    .filter(c => selectedCategories.includes(c.id))
    .some(c => c.dangerous);

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              {t('settings.cleanupTitle')}
            </CardTitle>
            <CardDescription>
              {t('settings.cleanupDesc')}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            {t('cleanup.adminOnly')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Preserved Data Notice */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-1">{t('cleanup.preservedTitle')}</p>
            <ul className="text-muted-foreground space-y-0.5">
              <li>• {t('cleanup.preservedRates')}</li>
              <li>• {t('cleanup.preservedCategories')}</li>
              <li>• {t('cleanup.preservedAlertRules')}</li>
              <li>• {t('cleanup.preservedUsers')}</li>
            </ul>
          </div>
        </div>

        {/* Data Categories */}
        {loading ? (
          <AppSectionLoading
            label={t('cleanup.counting')}
            description={t('cleanup.counting')}
            compact
            className="min-h-[160px] py-12"
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t('cleanup.selectData')}</h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={selectAll}
                className="h-8"
              >
                {selectedCategories.length === categories.length ? t('cleanup.deselectAll') : t('cleanup.selectAll')}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map(category => (
                <div
                  key={category.id}
                  className={`
                    relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer
                    transition-all duration-200
                    ${selectedCategories.includes(category.id) 
                      ? 'border-destructive bg-destructive/5 ring-1 ring-destructive/20' 
                      : 'hover:border-muted-foreground/30 hover:bg-muted/30'
                    }
                    ${category.count === 0 ? 'opacity-50' : ''}
                  `}
                  onClick={() => category.count > 0 && toggleCategory(category.id)}
                >
                  <Checkbox
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                    disabled={category.count === 0}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                      {category.dangerous && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0">
                          {t('cleanup.core')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  </div>
                  <Badge 
                    variant={category.count > 0 ? 'secondary' : 'outline'}
                    className="shrink-0"
                  >
                    {category.count} {t('cleanup.records')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {cleaning && cleanupProgress ? (
              <span className="text-primary">{cleanupProgress}</span>
            ) : selectedCategories.length > 0 ? (
              <span>
                {t('cleanup.selected')} <span className="font-medium text-foreground">{selectedCategories.length}</span> {t('cleanup.categoriesCount')}
                {t('cleanup.totalRecords')} <span className="font-medium text-destructive">{totalSelected.toLocaleString()}</span> {t('cleanup.recordsCount')}
              </span>
            ) : (
              <span>{t('cleanup.selectPrompt')}</span>
            )}
          </div>
          <div className="flex gap-2">
            {cleaning && (
              <Button
                variant="outline"
                onClick={handleCancelCleanup}
                className="gap-2"
              >
                <Square className="w-4 h-4" />
                {t('common.cancel')}
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={selectedCategories.length === 0 || cleaning}
              onClick={() => setShowConfirm(true)}
              className="gap-2"
            >
              {cleaning ? (
                <>
                  <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
                  {t('cleanup.cleaning')}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {t('cleanup.startCleanup')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog with Password */}
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
                <p>{t('settings.cleanupWarning')}：</p>
                <ul className="text-sm space-y-1 pl-4">
                  {categories
                    .filter(c => selectedCategories.includes(c.id))
                    .map(c => (
                      <li key={c.id} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        {c.name}：<span className="font-medium">{c.count} {t('cleanup.records')}</span>
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
                    <Input
                      type="email"
                      placeholder={t('settings.email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder={t('settings.password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {authError && (
                    <p className="text-sm text-destructive">{authError}</p>
                  )}
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

        {/* Results Dialog */}
        <AlertDialog open={showResults} onOpenChange={setShowResults}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                {t('cleanup.complete')}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>{t('cleanup.results')}</p>
                  <div className="space-y-2">
                    {results.map((result, idx) => (
                      <div 
                        key={idx}
                        className={`
                          flex items-center justify-between p-3 rounded-lg text-sm
                          ${result.success ? 'bg-muted' : 'bg-destructive/10'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span>{result.category}</span>
                        </div>
                        {result.success ? (
                          <span className="text-muted-foreground">
                            {result.deleted > 0 ? t('cleanup.deleted').replace('{count}', String(result.deleted)) : t('cleanup.reset')}
                          </span>
                        ) : (
                          <span className="text-destructive text-xs">{result.error}</span>
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
