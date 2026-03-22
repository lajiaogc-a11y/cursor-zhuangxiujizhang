import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSystemCurrency, updateSystemCurrencySettings } from '@/services/admin.service';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';

export type SystemCurrency = 'MYR' | 'CNY' | 'USD';

export const CURRENCY_OPTIONS: { value: SystemCurrency; label: string; symbol: string }[] = [
  { value: 'MYR', label: 'MYR (RM)', symbol: 'RM' },
  { value: 'CNY', label: 'CNY (¥)', symbol: '¥' },
  { value: 'USD', label: 'USD ($)', symbol: '$' },
];

export type CurrencyScope = 'all' | 'quotation' | 'cost' | 'purchasing' | 'finance';

export function useSystemCurrency() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['system_currency', tenantId],
    queryFn: async () => {
      const result = await fetchSystemCurrency(tenantId!);
      return {
        currency: result.currency as SystemCurrency,
        scopes: result.scopes as CurrencyScope[],
      };
    },
    enabled: !!user && !!tenantId,
    staleTime: 10 * 60 * 1000,
  });

  const systemCurrency = data?.currency || 'MYR';
  const currencyScopes = data?.scopes || ['all'];

  const updateSystemCurrency = useMutation({
    mutationFn: async ({ currency, scopes }: { currency: SystemCurrency; scopes: CurrencyScope[] }) => {
      if (!tenantId) throw new Error('No tenant');
      await updateSystemCurrencySettings(currency, scopes, tenantId);
    },
    onSuccess: () => {
      if (!tenantId) return;
      queryClient.invalidateQueries({ queryKey: ['system_currency', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['q_company_settings', tenantId] });
    },
  });

  return { systemCurrency, currencyScopes, isLoading, updateSystemCurrency };
}
