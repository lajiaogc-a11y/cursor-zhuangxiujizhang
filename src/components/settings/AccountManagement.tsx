import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Settings2, Edit2, RefreshCw, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { settingsService } from '@/services';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import { toast } from '@/hooks/use-toast';

interface Account {
  id: string;
  currency: string;
  account_type: string;
  balance: number;
  include_in_stats: boolean;
}

interface AccountManagementProps {
  onBalanceChange?: () => void;
}

export function AccountManagement({ onBalanceChange }: AccountManagementProps) {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [transactionTotals, setTransactionTotals] = useState<Record<string, number>>({});

  const fetchAccounts = async () => {
    const currentTenantId = tenant?.id;
    if (!currentTenantId) { setLoading(false); return; }
    
    const result = await settingsService.fetchAccountsWithTransactionTotals(currentTenantId);
    setAccounts(result.accounts);
    setTransactionTotals(result.transactionTotals);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchAccounts();
  }, [open, tenant?.id]);

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    return `${symbols[currency] || ''}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  };

  const accountTypeLabels: Record<string, string> = {
    cash: t('account.cash'),
    bank: t('account.bank'),
  };

  const currencyLabels: Record<string, string> = {
    MYR: t('currency.myr'),
    CNY: t('currency.cny'),
    USD: t('currency.usd'),
  };

  const getCurrentBalance = (account: Account) => {
    const key = `${account.currency}-${account.account_type}`;
    const txTotal = transactionTotals[key] || 0;
    return Number(account.balance) + txTotal;
  };

  const handleToggleIncludeInStats = async (account: Account, checked: boolean) => {
    try {
      await settingsService.toggleAccountIncludeInStats(account.id, checked);
      toast({ title: checked ? t('settings.includedInStats') : t('settings.excludedFromStats') });
      fetchAccounts();
      onBalanceChange?.();
    } catch {
      toast({ title: t('settings.updateFailed'), variant: 'destructive' });
    }
  };

  const handleAdjustBalance = async () => {
    if (!editingAccount || !newBalance) return;
    
    try {
      await settingsService.adjustAccountInitialBalance(editingAccount.id, parseFloat(newBalance));
      toast({ title: t('settings.balanceUpdated') });
      setEditingAccount(null);
      setNewBalance('');
      fetchAccounts();
      onBalanceChange?.();
    } catch (error: any) {
      toast({ title: t('settings.updateFailed'), description: error.message, variant: 'destructive' });
    }
  };

  const handleRecalculateBalances = async () => {
    if (!confirm(t('settings.recalculateConfirm'))) return;
    
    setRecalculating(true);
    try {
      const currentTenantId = tenant?.id;
      if (!currentTenantId) throw new Error('No tenant selected');

      await settingsService.recalculateAccountBalances(currentTenantId);

      toast({ title: t('settings.recalculateSuccess'), description: t('settings.recalculateDesc') });
      fetchAccounts();
      onBalanceChange?.();
    } catch (error: any) {
      toast({ title: t('settings.recalculateFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setRecalculating(false);
    }
  };

  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.currency]) acc[account.currency] = [];
    acc[account.currency].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="w-4 h-4 mr-1" />
        {t('settings.accountSettings')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                {t('settings.accountManagement')}
              </DialogTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRecalculateBalances}
                disabled={recalculating}
              >
                {recalculating ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Calculator className="w-4 h-4 mr-1" />
                )}
                {t('settings.recalculateBalance')}
              </Button>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAccounts).map(([currency, currencyAccounts]) => (
                <Card key={currency}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{currencyLabels[currency] || currency}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currencyAccounts.map(account => {
                      const currentBalance = getCurrentBalance(account);
                      const txTotal = transactionTotals[`${account.currency}-${account.account_type}`] || 0;
                      
                      return (
                        <div key={account.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">
                                {accountTypeLabels[account.account_type] || account.account_type}
                              </span>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={account.include_in_stats !== false}
                                  onCheckedChange={(checked) => handleToggleIncludeInStats(account, checked)}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {account.include_in_stats !== false ? t('settings.inStats') : t('settings.notInStats')}
                                </span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setEditingAccount(account);
                                setNewBalance(account.balance.toString());
                              }}
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              {t('settings.adjustBalance')}
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('settings.initialBalance')}: </span>
                              <span className="font-medium">{formatCurrency(account.balance, currency)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('settings.transactionTotal')}: </span>
                              <span className={txTotal >= 0 ? 'text-success' : 'text-destructive'}>
                                {txTotal >= 0 ? '+' : ''}{formatCurrency(txTotal, currency)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('settings.calculatedBalance')}: </span>
                              <span className={`font-bold ${currentBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {formatCurrency(currentBalance, currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}

              <div className="p-3 bg-muted/50 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 {t('settings.balanceExplanation')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑余额对话框 */}
      {editingAccount && (
        <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('settings.adjustInitialBalance')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">{t('transactions.account')}</div>
                <div className="font-medium">
                  {currencyLabels[editingAccount.currency]} - {accountTypeLabels[editingAccount.account_type]}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {t('settings.initialBalance')}: {formatCurrency(editingAccount.balance, editingAccount.currency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('settings.calculatedBalance')}: {formatCurrency(getCurrentBalance(editingAccount), editingAccount.currency)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.newInitialBalance')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder={t('settings.newBalancePlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingAccount(null)}>{t('common.cancel')}</Button>
                <Button onClick={handleAdjustBalance}>{t('common.save')}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
