/**
 * Unified Transaction Hooks
 * 
 * 基于 service 层的 React Query hooks。
 * 组件使用这些 hooks 而非直接调用 supabase。
 * 
 * 迁移方式：
 *   旧: const { data } = useQuery({ queryFn: async () => { supabase.from('transactions')... } })
 *   新: const { data } = useTransactions(tenantId, filters, pagination)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { transactionsService } from '@/services';
import type { TransactionFilters, TransactionCreateInput } from '@/services/transactions.service';
import type { PaginationParams } from '@/services/base';
import { toast } from 'sonner';

/**
 * 交易列表查询 Hook
 */
export function useTransactions(
  tenantId: string | undefined,
  filters: TransactionFilters,
  pagination: PaginationParams,
  enabled = true
) {
  return useQuery({
    queryKey: [
      ...queryKeys.transactions,
      tenantId,
      {
        page: pagination.page,
        pageSize: pagination.pageSize,
        type: filters.type,
        search: filters.search,
        category: filters.category,
        accountType: filters.accountType,
        currency: filters.currency,
        dateFrom: filters.dateRange?.from,
        dateTo: filters.dateRange?.to,
        ledgerTypes: filters.ledgerTypes,
      },
    ],
    queryFn: () => transactionsService.fetchTransactions(tenantId!, filters, pagination),
    enabled: !!tenantId && enabled,
  });
}

/**
 * 交易统计查询 Hook
 */
export function useTransactionStats(
  tenantId: string | undefined,
  filters: TransactionFilters,
  enabled = true
) {
  return useQuery({
    queryKey: [
      ...queryKeys.transactionStats,
      tenantId,
      {
        accountType: filters.accountType,
        currency: filters.currency,
        dateFrom: filters.dateRange?.from,
        dateTo: filters.dateRange?.to,
        ledgerTypes: filters.ledgerTypes,
      },
    ],
    queryFn: () => transactionsService.fetchTransactionStats(tenantId!, filters),
    enabled: !!tenantId && enabled,
  });
}

/**
 * 创建交易 Mutation Hook
 */
export function useCreateTransaction() {
  const { refreshTransactions } = useDataRefresh();
  
  return useMutation({
    mutationFn: (input: TransactionCreateInput) => 
      transactionsService.createTransaction(input),
    onSuccess: () => {
      refreshTransactions();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
}

/**
 * 更新交易 Mutation Hook
 */
export function useUpdateTransaction() {
  const { refreshTransactions } = useDataRefresh();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TransactionCreateInput> }) =>
      transactionsService.updateTransaction(id, updates),
    onSuccess: () => {
      refreshTransactions();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });
}

/**
 * 删除交易 Mutation Hook
 */
export function useDeleteTransaction() {
  const { refreshTransactions } = useDataRefresh();
  
  return useMutation({
    mutationFn: (id: string) => transactionsService.deleteTransaction(id),
    onSuccess: () => {
      refreshTransactions();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}
