import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAccountingPeriods, closeAccountingPeriod, reopenAccountingPeriod } from '@/services/admin.service';
import { useTenant } from '@/lib/tenant';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { Lock, Unlock, ChevronLeft, ChevronRight, CalendarCheck, ShieldAlert } from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { format } from 'date-fns';

interface AccountingPeriod {
  id: string;
  tenant_id: string;
  period_year: number;
  period_month: number;
  status: string;
  closed_by: string | null;
  closed_at: string | null;
  reopened_by: string | null;
  reopened_at: string | null;
  notes: string | null;
}

export function AccountingPeriodManagement() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [confirmAction, setConfirmAction] = useState<{ type: 'close' | 'reopen'; year: number; month: number } | null>(null);
  const [actionNote, setActionNote] = useState('');

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['accounting-periods', tenantId, viewYear],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await fetchAccountingPeriods(tenantId, viewYear);
      return (data || []) as unknown as AccountingPeriod[];
    },
    enabled: !!tenantId,
  });

  const periodMap = useMemo(() => {
    const map = new Map<number, AccountingPeriod>();
    periods.forEach(p => map.set(p.period_month, p));
    return map;
  }, [periods]);

  const closePeriodMut = useMutation({
    mutationFn: async ({ year, month, notes }: { year: number; month: number; notes: string }) => {
      const existing = periodMap.get(month);
      await closeAccountingPeriod({
        tenantId: tenantId!,
        year,
        month,
        userId: user!.id,
        notes,
        existingId: existing?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast.success(t('accounting.periodClosed'));
      setConfirmAction(null);
      setActionNote('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reopenPeriodMut = useMutation({
    mutationFn: async ({ year, month, notes }: { year: number; month: number; notes: string }) => {
      const existing = periodMap.get(month);
      if (!existing) return;
      await reopenAccountingPeriod({
        existingId: existing.id,
        userId: user!.id,
        notes,
        existingNotes: existing.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast.success(t('accounting.periodReopened'));
      setConfirmAction(null);
      setActionNote('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    const params = { year: confirmAction.year, month: confirmAction.month, notes: actionNote };
    if (confirmAction.type === 'close') closePeriodMut.mutate(params);
    else reopenPeriodMut.mutate(params);
  };

  const monthNames = language === 'zh'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const closedCount = periods.filter(p => p.status === 'closed').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('accounting.periodManagement')}</CardTitle>
                <CardDescription>{t('accounting.periodDesc')}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setViewYear(y => y - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-lg font-bold tabular-nums min-w-[4rem] text-center">{viewYear}</span>
              <Button variant="outline" size="icon" onClick={() => setViewYear(y => y + 1)} disabled={viewYear >= currentYear}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-muted/50 text-sm">
            <ShieldAlert className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              {language === 'zh'
                ? `${viewYear}年已关闭 ${closedCount}/12 个期间。关闭后，该月份的所有财务数据将被锁定，无法新增、修改或删除。`
                : `${closedCount}/12 periods closed for ${viewYear}. Closed periods lock all financial data from being added, modified, or deleted.`}
            </span>
          </div>

          {isLoading ? (
            <AppSectionLoading label={t('common.loading')} className="min-h-0 py-12" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                const period = periodMap.get(month);
                const isClosed = period?.status === 'closed';
                const isFuture = viewYear > currentYear || (viewYear === currentYear && month > currentMonth);
                const isCurrent = viewYear === currentYear && month === currentMonth;

                return (
                  <div
                    key={month}
                    className={`relative rounded-xl border p-4 transition-all ${
                      isClosed ? 'border-destructive/30 bg-destructive/5'
                        : isCurrent ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold">{monthNames[month - 1]}</span>
                      {isClosed ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          <Lock className="w-3 h-3 mr-0.5" />
                          {language === 'zh' ? '已关闭' : 'Closed'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <Unlock className="w-3 h-3 mr-0.5" />
                          {language === 'zh' ? '开放' : 'Open'}
                        </Badge>
                      )}
                    </div>
                    {period?.closed_at && (
                      <p className="text-[10px] text-muted-foreground mb-2 truncate">
                        {language === 'zh' ? '关闭于 ' : 'Closed '}
                        {format(new Date(period.closed_at), 'MM/dd HH:mm')}
                      </p>
                    )}
                    {!isFuture && (
                      <Button
                        variant={isClosed ? 'outline' : 'default'}
                        size="sm"
                        className="w-full text-xs h-7"
                        onClick={() => setConfirmAction({ type: isClosed ? 'reopen' : 'close', year: viewYear, month })}
                      >
                        {isClosed ? (language === 'zh' ? '重新开放' : 'Reopen') : (language === 'zh' ? '关闭期间' : 'Close Period')}
                      </Button>
                    )}
                    {isFuture && (
                      <p className="text-[10px] text-muted-foreground text-center">{language === 'zh' ? '未到期' : 'Future'}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setActionNote(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'close'
                ? (language === 'zh' ? '确认关闭会计期间' : 'Confirm Close Period')
                : (language === 'zh' ? '确认重新开放期间' : 'Confirm Reopen Period')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'close'
                ? (language === 'zh'
                  ? `关闭 ${confirmAction?.year}年${confirmAction?.month}月 后，该月份的所有交易、换汇、工资、应付账款将被锁定，无法新增、修改或删除。确定要继续吗？`
                  : `Closing ${monthNames[(confirmAction?.month || 1) - 1]} ${confirmAction?.year} will lock all transactions, exchanges, payroll, and payables for that month. Continue?`)
                : (language === 'zh'
                  ? `重新开放 ${confirmAction?.year}年${confirmAction?.month}月 后，该月份的数据将恢复可编辑状态。请谨慎操作。`
                  : `Reopening ${monthNames[(confirmAction?.month || 1) - 1]} ${confirmAction?.year} will allow data modifications again. Proceed with caution.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1">
            <Textarea
              placeholder={language === 'zh' ? '备注（可选）' : 'Notes (optional)'}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction?.type === 'close' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              disabled={closePeriodMut.isPending || reopenPeriodMut.isPending}
            >
              {(closePeriodMut.isPending || reopenPeriodMut.isPending) && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
              {confirmAction?.type === 'close'
                ? (language === 'zh' ? '确认关闭' : 'Close Period')
                : (language === 'zh' ? '确认开放' : 'Reopen Period')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
