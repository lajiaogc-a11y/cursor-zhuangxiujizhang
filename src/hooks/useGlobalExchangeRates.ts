import { useQuery } from '@tanstack/react-query';
import { fetchGlobalExchangeRates } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryKeys';

export interface GlobalExchangeRates {
  usd: number;
  cny: number;
  cnyToMyr: number;
  myrToCny: number;
  usdToMyr: number;
  myrToUsd: number;
  usdToCny: number;
  cnyToUsd: number;
}

const DEFAULT_RATES: GlobalExchangeRates = {
  usd: 0.22, cny: 1.55,
  cnyToMyr: 0.65, myrToCny: 1.55,
  usdToMyr: 4.47, myrToUsd: 0.22,
  usdToCny: 7.1, cnyToUsd: 0.14,
};

export function useGlobalExchangeRates(): { rates: GlobalExchangeRates; isLoading: boolean } {
  const { data: rates = DEFAULT_RATES, isLoading } = useQuery({
    queryKey: [...queryKeys.exchangeRates, 'global'],
    queryFn: async () => {
      const data = await fetchGlobalExchangeRates();
      if (!data?.length) return DEFAULT_RATES;

      const getRate = (from: string, to: string): number | null => {
        const r = data.find(d => d.from_currency === from && d.to_currency === to);
        return r?.rate ?? null;
      };

      const cnyToMyr = getRate('CNY', 'MYR') ?? DEFAULT_RATES.cnyToMyr;
      const usdToMyr = getRate('USD', 'MYR') ?? DEFAULT_RATES.usdToMyr;
      const cnyToUsd = getRate('CNY', 'USD') ?? DEFAULT_RATES.cnyToUsd;

      const myrToCny = cnyToMyr > 0 ? 1 / cnyToMyr : DEFAULT_RATES.myrToCny;
      const myrToUsd = usdToMyr > 0 ? 1 / usdToMyr : DEFAULT_RATES.myrToUsd;
      const usdToCny = cnyToUsd > 0 ? 1 / cnyToUsd : DEFAULT_RATES.usdToCny;

      return { usd: myrToUsd, cny: myrToCny, cnyToMyr, myrToCny, usdToMyr, myrToUsd, usdToCny, cnyToUsd };
    },
    staleTime: 5 * 60 * 1000,
  });

  return { rates, isLoading };
}
