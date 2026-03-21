import { useSystemCurrency, SystemCurrency, CURRENCY_OPTIONS, CurrencyScope } from './useSystemCurrency';
import { useGlobalExchangeRates } from './useGlobalExchangeRates';
import { formatWithBase } from '@/lib/formatCurrency';

export type { CurrencyScope };

export function useBaseCurrency(moduleScope?: CurrencyScope) {
  const { systemCurrency, currencyScopes, isLoading: currencyLoading } = useSystemCurrency();
  const { rates, isLoading: ratesLoading } = useGlobalExchangeRates();

  const baseCurrency = systemCurrency;

  // Check if base currency applies to the given module
  const isBaseCurrencyActive = (scope?: CurrencyScope): boolean => {
    if (!scope) return true;
    if (currencyScopes.includes('all')) return true;
    return currencyScopes.includes(scope);
  };

  const active = isBaseCurrencyActive(moduleScope);

  // Convert amount from originalCurrency to baseCurrency
  const convertToBase = (amount: number, originalCurrency: string): number => {
    if (!amount || isNaN(amount)) return 0;
    if (originalCurrency === baseCurrency) return amount;

    // Get rate: originalCurrency → baseCurrency
    const rate = getConversionRate(originalCurrency, baseCurrency, rates);
    return amount * rate;
  };

  // Format with dual display: "RM100 (≈ ¥152)" or just "¥152" if same
  const formatAmountWithBase = (
    amount: number,
    originalCurrency: string,
    options?: { compact?: boolean }
  ): string => {
    if (!active) {
      // Module not using base currency, show original only
      const symbol = getCurrencySymbolLocal(originalCurrency);
      return `${symbol}${formatNum(amount)}`;
    }
    const rate = getConversionRate(originalCurrency, baseCurrency, rates);
    return formatWithBase(amount, originalCurrency, baseCurrency, rate, options);
  };

  return {
    baseCurrency,
    currencyScopes,
    isLoading: currencyLoading || ratesLoading,
    active,
    convertToBase,
    formatAmountWithBase,
    isBaseCurrencyActive,
    rates,
  };
}

function getCurrencySymbolLocal(currency: string): string {
  const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
  return symbols[currency] || '';
}

function formatNum(n: number): string {
  const num = typeof n === 'number' && !isNaN(n) ? n : 0;
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getConversionRate(
  from: string,
  to: string,
  rates: { cnyToMyr: number; myrToCny: number; usdToMyr: number; myrToUsd: number; usdToCny: number; cnyToUsd: number }
): number {
  if (from === to) return 1;

  const key = `${from}_${to}`;
  const rateMap: Record<string, number> = {
    'CNY_MYR': rates.cnyToMyr,
    'MYR_CNY': rates.myrToCny,
    'USD_MYR': rates.usdToMyr,
    'MYR_USD': rates.myrToUsd,
    'USD_CNY': rates.usdToCny,
    'CNY_USD': rates.cnyToUsd,
  };

  return rateMap[key] || 1;
}
