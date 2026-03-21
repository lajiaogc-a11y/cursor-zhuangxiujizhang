import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatMoney } from '@/lib/formatCurrency';

interface CurrencyAccountStats {
  currency: string;
  accountType: 'cash' | 'bank';
  income: number;
  expense: number;
  balance: number;
}

interface CurrencyStatsPanelProps {
  stats: CurrencyAccountStats[];
  title?: string;
  showBalance?: boolean;
  className?: string;
  defaultOpen?: boolean;
}

const CURRENCIES = ['MYR', 'CNY', 'USD'];
const ACCOUNT_TYPES = ['cash', 'bank'] as const;

export function CurrencyStatsPanel({ 
  stats, 
  title, 
  showBalance = true,
  className = '',
  defaultOpen = false
}: CurrencyStatsPanelProps) {
  const { t, language } = useI18n();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getStats = (currency: string, accountType: 'cash' | 'bank') => {
    return stats.find(s => s.currency === currency && s.accountType === accountType) || {
      currency,
      accountType,
      income: 0,
      expense: 0,
      balance: 0,
    };
  };

  const accountLabels = {
    cash: t('account.cash'),
    bank: t('account.bank'),
  };

  const currencyLabels: Record<string, string> = {
    MYR: 'MYR',
    CNY: 'CNY',
    USD: 'USD',
  };

  return (
    <Card className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-sm font-medium">
                {title || t('currencyStats.title')}
              </CardTitle>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left w-[120px]">{t('currencyStats.item')}</TableHead>
                    <TableHead className="text-right">{t('currencyStats.income')}</TableHead>
                    <TableHead className="text-right">{t('currencyStats.expense')}</TableHead>
                    {showBalance && (
                      <TableHead className="text-right">{t('currencyStats.balance')}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CURRENCIES.map(currency => (
                    ACCOUNT_TYPES.map(accountType => {
                      const data = getStats(currency, accountType);
                      const hasData = data.income !== 0 || data.expense !== 0 || data.balance !== 0;
                      
                      return (
                        <TableRow key={`${currency}-${accountType}`} className={!hasData ? 'text-muted-foreground' : ''}>
                          <TableCell className="font-medium text-left">
                            {currencyLabels[currency]}{accountLabels[accountType]}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={data.income > 0 ? 'text-success font-medium' : ''}>
                              {formatMoney(data.income, currency, { showSymbol: false })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={data.expense > 0 ? 'text-destructive font-medium' : ''}>
                              {formatMoney(data.expense, currency, { showSymbol: false })}
                            </span>
                          </TableCell>
                          {showBalance && (
                            <TableCell className="text-right">
                              <span className={`font-bold ${data.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {formatMoney(data.balance, currency, { showSymbol: false })}
                              </span>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Helper function to calculate stats from transactions
export function calculateCurrencyStats(
  transactions: Array<{
    type: string;
    currency: string;
    account_type: string;
    amount: number;
  }>,
  initialBalances?: Record<string, Record<string, number>>
): CurrencyAccountStats[] {
  const statsMap = new Map<string, CurrencyAccountStats>();

  // Initialize all combinations
  CURRENCIES.forEach(currency => {
    ACCOUNT_TYPES.forEach(accountType => {
      const key = `${currency}-${accountType}`;
      const initialBalance = initialBalances?.[currency]?.[accountType] || 0;
      statsMap.set(key, {
        currency,
        accountType,
        income: 0,
        expense: 0,
        balance: initialBalance,
      });
    });
  });

  // Aggregate transactions
  transactions.forEach(tx => {
    const key = `${tx.currency}-${tx.account_type}`;
    const stats = statsMap.get(key);
    if (stats) {
      if (tx.type === 'income') {
        stats.income += tx.amount;
        stats.balance += tx.amount;
      } else if (tx.type === 'expense') {
        stats.expense += tx.amount;
        stats.balance -= tx.amount;
      }
    }
  });

  return Array.from(statsMap.values());
}

// Helper to calculate stats from exchange transactions
export function calculateExchangeCurrencyStats(
  exchanges: Array<{
    in_currency: string;
    out_currency: string;
    in_account_type: string;
    out_account_type: string;
    in_amount: number;
    out_amount: number;
  }>
): CurrencyAccountStats[] {
  const statsMap = new Map<string, CurrencyAccountStats>();

  // Initialize all combinations
  CURRENCIES.forEach(currency => {
    ACCOUNT_TYPES.forEach(accountType => {
      const key = `${currency}-${accountType}`;
      statsMap.set(key, {
        currency,
        accountType,
        income: 0,
        expense: 0,
        balance: 0,
      });
    });
  });

  // Aggregate exchange transactions
  exchanges.forEach(ex => {
    // Out (expense from source)
    const outKey = `${ex.out_currency}-${ex.out_account_type}`;
    const outStats = statsMap.get(outKey);
    if (outStats) {
      outStats.expense += ex.out_amount;
      outStats.balance -= ex.out_amount;
    }

    // In (income to target)
    const inKey = `${ex.in_currency}-${ex.in_account_type}`;
    const inStats = statsMap.get(inKey);
    if (inStats) {
      inStats.income += ex.in_amount;
      inStats.balance += ex.in_amount;
    }
  });

  return Array.from(statsMap.values());
}
