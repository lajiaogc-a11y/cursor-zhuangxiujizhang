import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchConsistencyCheckData, fetchConsistencyFixData, updateProjectSummary, verifyPassword } from '@/services/admin.service';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { CheckCircle, AlertTriangle, RefreshCw, Wrench, Database, ShieldAlert } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ProjectDiscrepancy {
  project_code: string;
  project_name: string;
  recorded_income: number;
  calculated_income: number;
  income_diff: number;
  recorded_expense: number;
  calculated_expense: number;
  expense_diff: number;
  recorded_addition: number;
  calculated_addition: number;
  addition_diff: number;
}

interface AccountDiscrepancy {
  currency: string;
  account_type: string;
  stored_balance: number;
  calculated_balance: number;
  diff: number;
}

interface ConsistencyCheckResult {
  projectDiscrepancies: ProjectDiscrepancy[];
  accountDiscrepancies: AccountDiscrepancy[];
  lastChecked: Date | null;
  isConsistent: boolean;
}

export function DataConsistencyCheck() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<ConsistencyCheckResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    try {
      const { projects, transactions, additions } = await fetchConsistencyCheckData();
      const projectDiscrepancies: ProjectDiscrepancy[] = [];

      if (projects && transactions) {
        // Build a map of project_id -> tenant_id for tenant-scoped comparison
        const projectTenantMap = new Map<string, string>();
        projects.forEach(p => {
          if (p.tenant_id) projectTenantMap.set(p.id, p.tenant_id);
        });

        // Only aggregate transactions that belong to the same tenant as the project
        const txMap = new Map<string, { income: number; expense: number }>();
        transactions.forEach(tx => {
          if (!tx.project_id) return;
          const projectTenant = projectTenantMap.get(tx.project_id);
          // Skip cross-tenant records (transaction tenant != project tenant)
          if (projectTenant && tx.tenant_id && tx.tenant_id !== projectTenant) return;
          const existing = txMap.get(tx.project_id) || { income: 0, expense: 0 };
          if (tx.type === 'income') existing.income += Number(tx.amount_myr || 0);
          else existing.expense += Number(tx.amount_myr || 0);
          txMap.set(tx.project_id, existing);
        });

        const addMap = new Map<string, number>();
        (additions || []).forEach(add => {
          if (!add.project_id) return;
          const projectTenant = projectTenantMap.get(add.project_id);
          if (projectTenant && add.tenant_id && add.tenant_id !== projectTenant) return;
          addMap.set(add.project_id, (addMap.get(add.project_id) || 0) + Number(add.amount_myr || 0));
        });

        projects.forEach(p => {
          const tx = txMap.get(p.id) || { income: 0, expense: 0 };
          const calculatedAddition = addMap.get(p.id) || 0;
          const incomeDiff = Math.abs((p.total_income_myr || 0) - tx.income);
          const expenseDiff = Math.abs((p.total_expense_myr || 0) - tx.expense);
          const additionDiff = Math.abs((p.total_addition_myr || 0) - calculatedAddition);

          if (incomeDiff > 0.01 || expenseDiff > 0.01 || additionDiff > 0.01) {
            projectDiscrepancies.push({
              project_code: p.project_code,
              project_name: p.project_name,
              recorded_income: p.total_income_myr || 0,
              calculated_income: tx.income,
              income_diff: (p.total_income_myr || 0) - tx.income,
              recorded_expense: p.total_expense_myr || 0,
              calculated_expense: tx.expense,
              expense_diff: (p.total_expense_myr || 0) - tx.expense,
              recorded_addition: p.total_addition_myr || 0,
              calculated_addition: calculatedAddition,
              addition_diff: (p.total_addition_myr || 0) - calculatedAddition,
            });
          }
        });
      }

      const accountDiscrepancies: AccountDiscrepancy[] = [];
      const isConsistent = projectDiscrepancies.length === 0 && accountDiscrepancies.length === 0;

      setResult({ projectDiscrepancies, accountDiscrepancies, lastChecked: new Date(), isConsistent });

      if (isConsistent) toast.success(t('settings.dataConsistent'));
      else toast.warning(t('settings.dataInconsistent'));
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setChecking(false);
    }
  };

  const handleFixClick = () => {
    setPassword('');
    setShowPasswordDialog(true);
  };

  const handlePasswordVerify = async () => {
    if (!user?.email) return;
    setVerifying(true);
    try {
      const success = await verifyPassword(user.email, password);
      if (!success) {
        toast.error(t('settings.passwordVerifyFailed') || '密码验证失败');
        setVerifying(false);
        return;
      }
      setShowPasswordDialog(false);
      setPassword('');
      await fixDiscrepancies();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setVerifying(false);
    }
  };

  const fixDiscrepancies = async () => {
    if (!result?.projectDiscrepancies.length) return;
    setFixing(true);
    try {
      const { projects, transactions, additions } = await fetchConsistencyFixData();
      if (!projects) throw new Error(t('dataConsistency.unableToGetProjects'));

      // Build project tenant map for scoped aggregation
      const projectTenantMap = new Map<string, string>();
      const projectStats = new Map<string, { income: number; expense: number; material: number; labor: number; other: number; addition: number }>();
      projects.forEach(p => {
        projectStats.set(p.id, { income: 0, expense: 0, material: 0, labor: 0, other: 0, addition: 0 });
        if (p.tenant_id) projectTenantMap.set(p.id, p.tenant_id);
      });

      (transactions || []).forEach(tx => {
        if (!tx.project_id) return;
        const stats = projectStats.get(tx.project_id);
        if (!stats) return;
        // Skip cross-tenant records
        const projectTenant = projectTenantMap.get(tx.project_id);
        if (projectTenant && tx.tenant_id && tx.tenant_id !== projectTenant) return;
        if (tx.type === 'income') stats.income += Number(tx.amount_myr || 0);
        else {
          stats.expense += Number(tx.amount_myr || 0);
          if (tx.category_name === '材料费') stats.material += Number(tx.amount_myr || 0);
          else if (tx.category_name === '人工费') stats.labor += Number(tx.amount_myr || 0);
          else stats.other += Number(tx.amount_myr || 0);
        }
      });

      (additions || []).forEach(add => {
        if (!add.project_id) return;
        const stats = projectStats.get(add.project_id);
        if (!stats) return;
        const projectTenant = projectTenantMap.get(add.project_id);
        if (projectTenant && add.tenant_id && add.tenant_id !== projectTenant) return;
        stats.addition += Number(add.amount_myr || 0);
      });

      let fixedCount = 0;
      for (const [projectId, stats] of projectStats) {
        const success = await updateProjectSummary(projectId, stats);
        if (success) fixedCount++;
      }

      toast.success(`${t('settings.fixComplete')} (${fixedCount} ${t('settings.projectsFixed')})`);
      await runCheck();
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setFixing(false);
    }
  };

  const formatMoney = (amount: number) => `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5" />
                {t('settings.dataConsistencyCheck')}
              </CardTitle>
              {result && (
                <Badge variant={result.isConsistent ? 'default' : 'destructive'}>
                  {result.isConsistent ? (
                    <><CheckCircle className="w-3 h-3 mr-1" />{t('settings.consistent')}</>
                  ) : (
                    <><AlertTriangle className="w-3 h-3 mr-1" />{result.projectDiscrepancies.length} {t('settings.issues')}</>
                  )}
                </Badge>
              )}
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={runCheck} disabled={checking || fixing} size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                {checking ? t('settings.checking') : t('settings.runCheck')}
              </Button>
              {result && !result.isConsistent && (
                <Button onClick={handleFixClick} disabled={checking || fixing} variant="destructive" size="sm">
                  <Wrench className={`w-4 h-4 mr-2 ${fixing ? 'animate-spin' : ''}`} />
                  {fixing ? t('settings.fixing') : t('settings.fixAll')}
                </Button>
              )}
            </div>
            {result?.lastChecked && (
              <p className="text-xs text-muted-foreground">{t('settings.lastChecked')}: {result.lastChecked.toLocaleString()}</p>
            )}
            {result?.isConsistent && (
              <div className="flex items-center gap-2 p-4 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-success font-medium">{t('settings.allDataConsistent')}</span>
              </div>
            )}
            {result && result.projectDiscrepancies.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{t('settings.projectDiscrepancies')}</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('projects.projectCode')}</TableHead>
                        <TableHead className="text-right">{t('settings.recordedIncome')}</TableHead>
                        <TableHead className="text-right">{t('settings.calculatedIncome')}</TableHead>
                        <TableHead className="text-right">{t('settings.diff')}</TableHead>
                        <TableHead className="text-right">{t('settings.recordedExpense')}</TableHead>
                        <TableHead className="text-right">{t('settings.calculatedExpense')}</TableHead>
                        <TableHead className="text-right">{t('settings.diff')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.projectDiscrepancies.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm">{d.project_code}</TableCell>
                          <TableCell className="text-right">{formatMoney(d.recorded_income)}</TableCell>
                          <TableCell className="text-right">{formatMoney(d.calculated_income)}</TableCell>
                          <TableCell className={`text-right font-medium ${d.income_diff !== 0 ? 'text-destructive' : ''}`}>{d.income_diff !== 0 ? formatMoney(d.income_diff) : '-'}</TableCell>
                          <TableCell className="text-right">{formatMoney(d.recorded_expense)}</TableCell>
                          <TableCell className="text-right">{formatMoney(d.calculated_expense)}</TableCell>
                          <TableCell className={`text-right font-medium ${d.expense_diff !== 0 ? 'text-destructive' : ''}`}>{d.expense_diff !== 0 ? formatMoney(d.expense_diff) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>

    <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            {t('settings.confirmFix') || '确认修复操作'}
          </DialogTitle>
          <DialogDescription>
            {t('settings.fixPasswordHint') || '此操作将批量更新所有项目的汇总数据，请输入您的登录密码以确认。'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="fix-password">{t('common.password') || '密码'}</Label>
          <Input id="fix-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && password && handlePasswordVerify()} placeholder={t('settings.enterPassword') || '请输入密码'} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>{t('common.cancel') || '取消'}</Button>
          <Button variant="destructive" onClick={handlePasswordVerify} disabled={!password || verifying}>
            {verifying ? t('settings.verifying') || '验证中...' : t('settings.confirmAndFix') || '确认修复'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
