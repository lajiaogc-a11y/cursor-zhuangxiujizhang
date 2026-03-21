/**
 * Unified Exchange Hooks
 * 
 * 基于 service 层的换汇数据 React Query hooks。
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { exchangesService } from '@/services';
import type { ExchangeFilters } from '@/services/exchanges.service';
import { toast } from 'sonner';

/**
 * 换汇交易列表 Hook
 */
export function useExchangeTransactions(
  tenantId: string | undefined,
  filters?: ExchangeFilters,
  enabled = true
) {
  return useQuery({
    queryKey: [
      ...queryKeys.exchanges,
      tenantId,
      filters?.currency,
      filters?.dateRange?.from,
      filters?.dateRange?.to,
    ],
    queryFn: () => exchangesService.fetchExchangeTransactions(tenantId!, filters),
    enabled: !!tenantId && enabled,
  });
}

/**
 * 汇率列表 Hook
 */
export function useExchangeRates(tenantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.exchangeRates, tenantId],
    queryFn: () => exchangesService.fetchExchangeRates(tenantId!),
    enabled: !!tenantId && enabled,
  });
}

/**
 * 创建换汇交易 Mutation Hook
 */
export function useCreateExchangeTransaction() {
  const { refreshExchanges } = useDataRefresh();

  return useMutation({
    mutationFn: (input: Parameters<typeof exchangesService.createExchangeTransaction>[0]) =>
      exchangesService.createExchangeTransaction(input),
    onSuccess: () => {
      refreshExchanges();
    },
    onError: (error) => {
      toast.error(`创建换汇失败: ${error.message}`);
    },
  });
}

/**
 * 删除换汇交易 Mutation Hook
 */
export function useDeleteExchangeTransaction() {
  const { refreshExchanges } = useDataRefresh();

  return useMutation({
    mutationFn: (id: string) => exchangesService.deleteExchangeTransaction(id),
    onSuccess: () => {
      refreshExchanges();
    },
    onError: (error) => {
      toast.error(`删除换汇失败: ${error.message}`);
    },
  });
}
