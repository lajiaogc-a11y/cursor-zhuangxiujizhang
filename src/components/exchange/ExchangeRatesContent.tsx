import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Plus, RefreshCw, Download, Clock } from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExchangeRateForm } from '@/components/exchange/ExchangeRateForm';
import { ExchangeRateList } from '@/components/exchange/ExchangeRateList';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { exchangesService } from '@/services';
import { useExchangeRates } from '@/hooks/useExchangeService';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';

type ExchangeRate = Tables<'exchange_rates'>;

const AUTO_REFRESH_INTERVAL = 4 * 60 * 60 * 1000;

export function ExchangeRatesContent() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const canEdit = hasPermission('feature.edit');
  const tenantId = tenant?.id;

  const { data: rates = [], isLoading: loading } = useExchangeRates(tenantId);

  const [fetchingRates, setFetchingRates] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [countdown, setCountdown] = useState<number>(AUTO_REFRESH_INTERVAL);
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => {
    const saved = localStorage.getItem('exchange-rates-last-fetch');
    return saved ? parseInt(saved, 10) : 0;
  });

  const handleAutoFetchRates = useCallback(async (isAuto = false) => {
    setFetchingRates(true);
    try {
      const result = await exchangesService.invokeAutoFetchRates(tenantId, !isAuto);
      if (result?.success) {
        const now = Date.now();
        setLastFetchTime(now);
        localStorage.setItem('exchange-rates-last-fetch', now.toString());
        setCountdown(AUTO_REFRESH_INTERVAL);
        if (!isAuto) {
          toast.success(result.message, {
            description: `${t('toast.fetchSuccess')}: ${result.source === 'API' ? t('toast.realtimeAPI') : t('toast.referenceRate')}`,
          });
        }
        if (tenantId) queryClient.invalidateQueries({ queryKey: [...queryKeys.exchangeRates, tenantId] });
      } else {
        throw new Error(result?.error || t('toast.fetchRateFailed'));
      }
    } catch (error: any) {
      console.error('Failed to fetch exchange rates:', error);
      if (!isAuto) {
        toast.error(t('toast.autoFetchFailed'), { description: error.message });
      }
    } finally {
      setFetchingRates(false);
    }
  }, [queryClient, t, tenantId]);

  useEffect(() => {
    const elapsed = Date.now() - lastFetchTime;
    const remaining = Math.max(0, AUTO_REFRESH_INTERVAL - elapsed);
    setCountdown(remaining);
    if (remaining === 0) {
      handleAutoFetchRates(true);
    }
  }, [handleAutoFetchRates, lastFetchTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1000) {
          handleAutoFetchRates(true);
          return AUTO_REFRESH_INTERVAL;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleAutoFetchRates]);

  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setEditingRate(null);
    if (tenantId) queryClient.invalidateQueries({ queryKey: [...queryKeys.exchangeRates, tenantId] });
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setEditingRate(null);
  };

  const getLatestRate = (from: string, to: string): number | null => {
    const rate = rates.find(r => r.from_currency === from && r.to_currency === to);
    return rate?.rate || null;
  };

  const cnyToMyr = getLatestRate('CNY', 'MYR');
  const usdToMyr = getLatestRate('USD', 'MYR');
  const cnyToUsd = getLatestRate('CNY', 'USD');

  const formatCountdown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{t('exchangeRates.nextUpdate')}: {formatCountdown(countdown)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleAutoFetchRates(false)} disabled={fetchingRates}>
            {fetchingRates ? <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" /> : <Download className="w-4 h-4 mr-2" />}
            {t('exchangeRates.autoFetch')}
          </Button>
          <Button variant="outline" onClick={() => tenantId && queryClient.invalidateQueries({ queryKey: [...queryKeys.exchangeRates, tenantId] })}>
            <RefreshCw className="w-4 h-4 mr-2" />{t('common.refresh')}
          </Button>
          {canEdit && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />{t('exchangeRates.manualAdd')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CNY → MYR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cnyToMyr ? `1 CNY = ${cnyToMyr.toFixed(3)} MYR` : t('exchangeRates.notSet')}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('exchangeRates.cnyToMyr')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USD → MYR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usdToMyr ? `1 USD = ${usdToMyr.toFixed(3)} MYR` : t('exchangeRates.notSet')}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('exchangeRates.usdToMyr')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CNY → USD</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cnyToUsd ? `1 CNY = ${cnyToUsd.toFixed(3)} USD` : t('exchangeRates.notSet')}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('exchangeRates.cnyToUsd')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />{t('exchangeRates.history')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AppSectionLoading label={t('common.loading')} compact />
          ) : (
            <ExchangeRateList rates={rates as any} onEdit={handleEdit} onRefresh={() => tenantId && queryClient.invalidateQueries({ queryKey: [...queryKeys.exchangeRates, tenantId] })} canEdit={canEdit} />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRate ? t('exchangeRates.edit') : t('exchangeRates.add')}</DialogTitle>
          </DialogHeader>
          <ExchangeRateForm exchangeRate={editingRate} onSuccess={handleSuccess} onCancel={handleCancel} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
