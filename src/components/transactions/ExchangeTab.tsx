import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeftRight, Plus, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchExchangeTransactions } from '@/services/exchanges.service';
import { ExchangeForm } from '@/components/exchange/ExchangeForm';
import { ExchangeList } from '@/components/exchange/ExchangeList';
import { CurrencyStatsPanel, calculateExchangeCurrencyStats } from '@/components/ui/currency-stats-panel';
import type { ExchangeTransaction } from '@/services/exchanges.service';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/lib/tenant';



export function ExchangeTab() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('feature.edit');
  const queryClient = useQueryClient();
  const { refreshExchanges, refreshAccounts, refreshDashboard } = useDataRefresh();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExchange, setEditingExchange] = useState<ExchangeTransaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data: exchanges = [], isLoading } = useQuery({
    queryKey: [...queryKeys.exchanges, tenantId, currencyFilter, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!tenantId) return [];
      return fetchExchangeTransactions(tenantId, {
        currency: currencyFilter !== 'all' ? currencyFilter : undefined,
        dateRange: {
          from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
          to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        },
      });
    },
  });

  const handleEdit = (exchange: ExchangeTransaction) => { setEditingExchange(exchange); setDialogOpen(true); };
  const handleSuccess = () => { setDialogOpen(false); setEditingExchange(null); queryClient.invalidateQueries({ queryKey: queryKeys.exchanges }); refreshExchanges(); refreshAccounts(); refreshDashboard(); };
  const handleCancel = () => { setDialogOpen(false); setEditingExchange(null); };
  const handleRefresh = () => { queryClient.invalidateQueries({ queryKey: queryKeys.exchanges }); };

  const totalProfit = exchanges.filter(e => e.profit_loss > 0).reduce((sum, e) => sum + e.profit_loss, 0);
  const totalLoss = exchanges.filter(e => e.profit_loss < 0).reduce((sum, e) => sum + Math.abs(e.profit_loss), 0);
  const netProfitLoss = exchanges.reduce((sum, e) => sum + e.profit_loss, 0);
  const currencyStats = calculateExchangeCurrencyStats(exchanges);

  const filteredExchanges = exchanges.filter(e => {
    if (!searchTerm) return true;
    return e.remark?.toLowerCase().includes(searchTerm.toLowerCase()) || e.sequence_no.toString().includes(searchTerm);
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {canEdit && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />{t('exchange.newExchange')}
          </Button>
        )}
      </div>

      <CurrencyStatsPanel stats={currencyStats} title={t('exchange.currencyStats')} showBalance={true} defaultOpen={false} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="stat-card-v2 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-success/10 transition-transform group-hover:scale-110"><TrendingUp className="w-5 h-5 text-success" /></div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold text-success tabular-nums leading-tight break-all">+RM {totalProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('exchange.profit')}</p>
            </div>
          </div>
        </div>
        <div className="stat-card-v2 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-destructive/10 transition-transform group-hover:scale-110"><TrendingDown className="w-5 h-5 text-destructive" /></div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold text-destructive tabular-nums leading-tight break-all">-RM {totalLoss.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('exchange.loss')}</p>
            </div>
          </div>
        </div>
        <div className="stat-card-v2 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 transition-transform group-hover:scale-110"><ArrowLeftRight className="w-5 h-5 text-primary" /></div>
            <div className="min-w-0">
              <p className={`text-lg sm:text-xl font-bold tabular-nums leading-tight break-all ${netProfitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                {netProfitLoss >= 0 ? '+' : ''}RM {netProfitLoss.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('exchange.netProfitLoss')}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder={t('exchange.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} showPresets={true} className="w-full sm:w-[280px]" />
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder={t('exchange.allCurrencies')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('exchange.allCurrencies')}</SelectItem>
                <SelectItem value="MYR">{t('currency.myr')} (MYR)</SelectItem>
                <SelectItem value="CNY">{t('currency.cny')} (CNY)</SelectItem>
                <SelectItem value="USD">{t('currency.usd')} (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <ExchangeList exchanges={filteredExchanges as any} onEdit={handleEdit} onRefresh={handleRefresh} canEdit={canEdit} />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingExchange ? t('exchange.editExchange') : t('exchange.newExchange')}</DialogTitle></DialogHeader>
          <ExchangeForm exchange={editingExchange as any} onSuccess={handleSuccess} onCancel={handleCancel} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
