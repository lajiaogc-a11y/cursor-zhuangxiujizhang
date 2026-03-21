/**
 * Unified Account Hooks
 * 
 * 基于 service 层的账户数据 React Query hooks。
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { accountsService } from '@/services';

/**
 * 公司账户列表 Hook
 */
export function useAccounts(tenantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.accounts, tenantId],
    queryFn: () => accountsService.fetchAccounts(tenantId!),
    enabled: !!tenantId && enabled,
  });
}

/**
 * 账户初始余额映射 Hook
 */
export function useAccountBalanceMap(tenantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.accountBalances, tenantId],
    queryFn: () => accountsService.fetchAccountBalanceMap(tenantId!),
    enabled: !!tenantId && enabled,
  });
}
