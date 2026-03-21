import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet } from 'lucide-react';

interface FinancialOverviewCardProps {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  formatCurrency: (amount: number, currency?: string) => string;
  incomeLabel: string;
  expenseLabel: string;
  profitLabel: string;
}

export function FinancialOverviewCard({
  totalIncome,
  totalExpense,
  netProfit,
  formatCurrency,
  incomeLabel,
  expenseLabel,
  profitLabel,
}: FinancialOverviewCardProps) {
  const total = totalIncome + totalExpense;
  const incomePercent = total > 0 ? (totalIncome / total) * 100 : 50;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Income vs Expense bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{incomeLabel}</span>
            <span>{expenseLabel}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-700 ease-out rounded-l-full"
              style={{ width: `${incomePercent}%` }}
            />
            <div
              className="h-full bg-rose-400 transition-all duration-700 ease-out rounded-r-full"
              style={{ width: `${100 - incomePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-500">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-rose-500">{formatCurrency(totalExpense)}</span>
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
            </div>
          </div>
        </div>

        {/* Net profit */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">{profitLabel}</span>
          </div>
          <span className={`text-base font-bold ${netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
