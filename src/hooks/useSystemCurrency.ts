import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSystemCurrency, updateSystemCurrencySettings } from '@/services/admin.service';
import { useAuth } from '@/lib/auth';

export type SystemCurrency = 'MYR' | 'CNY' | 'USD';

export const CURRENCY_OPTIONS: { value: SystemCurrency; label: string; symbol: string }[] = [
  { value: 'MYR', label: 'MYR (RM)', symbol: 'RM' },
  { value: 'CNY', label: 'CNY (¥)', symbol: '¥' },
  { value: 'USD', label: 'USD ($)', symbol: '$' },
];

export type CurrencyScope = 'all' | 'quotation' | 'cost' | 'purchasing' | 'finance';

export function useSystemCurrency() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['system_currency'],
    queryFn: async () => {
      const result = await fetchSystemCurrency();
      return {
        currency: result.currency as SystemCurrency,
        scopes: result.scopes as CurrencyScope[],
      };
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const systemCurrency = data?.currency || 'MYR';
  const currencyScopes = data?.scopes || ['all'];

  const updateSystemCurrency = useMutation({
    mutationFn: async ({ currency, scopes }: { currency: SystemCurrency; scopes: CurrencyScope[] }) => {
      await updateSystemCurrencySettings(currency, scopes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_currency'] });
      queryClient.invalidateQueries({ queryKey: ['q_company_settings'] });
    },
  });

  return { systemCurrency, currencyScopes, isLoading, updateSystemCurrency };
}
