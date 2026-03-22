import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys, invalidationMap, invalidateQueriesWithTenant } from '@/lib/queryKeys';
import { useTenant } from '@/lib/tenant';

/**
 * 统一的数据刷新 Hook
 * 确保增删改操作后所有相关页面数据同步更新
 */
export function useDataRefresh() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  // 刷新交易相关数据（当前租户）
  const refreshTransactions = useCallback(() => {
    invalidateQueriesWithTenant(queryClient, tenantId, invalidationMap.transactionMutation);
  }, [queryClient, tenantId]);

  // 刷新项目相关数据（当前租户）
  const refreshProjects = useCallback(() => {
    invalidateQueriesWithTenant(queryClient, tenantId, invalidationMap.projectMutation);
  }, [queryClient, tenantId]);

  // 刷新项目交易数据
  const refreshProjectTransactions = useCallback(
    (projectId: string) => {
      if (!tenantId) return;
      invalidateQueriesWithTenant(queryClient, tenantId, invalidationMap.projectTransactionMutationPrefixes);
      queryClient.invalidateQueries({ queryKey: queryKeys.projectTransactions(tenantId, projectId) });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.projects, tenantId, 'financials', projectId] });
    },
    [queryClient, tenantId]
  );

  // 刷新项目增项数据
  const refreshProjectAdditions = useCallback(
    (projectId: string) => {
      if (!tenantId) return;
      invalidateQueriesWithTenant(queryClient, tenantId, invalidationMap.projectAdditionMutationPrefixes);
      queryClient.invalidateQueries({ queryKey: queryKeys.projectAdditions(tenantId, projectId) });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.projects, tenantId, 'financials', projectId] });
    },
    [queryClient, tenantId]
  );

  // 刷新换汇数据（当前租户）
  const refreshExchanges = useCallback(() => {
    invalidateQueriesWithTenant(queryClient, tenantId, invalidationMap.exchangeMutation);
  }, [queryClient, tenantId]);

  // 刷新账户数据（当前租户）
  const refreshAccounts = useCallback(() => {
    invalidateQueriesWithTenant(queryClient, tenantId, invalidationMap.accountMutation);
  }, [queryClient, tenantId]);

  // 刷新仪表盘数据（当前租户）
  const refreshDashboard = useCallback(() => {
    if (!tenantId) return;
    queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard, tenantId] });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboardCategories, tenantId] });
  }, [queryClient, tenantId]);

  // 刷新所有数据
  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  // 触发特定查询键的刷新
  const invalidate = useCallback((keys: readonly string[] | string[][]) => {
    if (Array.isArray(keys[0])) {
      (keys as string[][]).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    } else {
      queryClient.invalidateQueries({ queryKey: keys as readonly string[] });
    }
  }, [queryClient]);

  return {
    refreshTransactions,
    refreshProjects,
    refreshProjectTransactions,
    refreshProjectAdditions,
    refreshExchanges,
    refreshAccounts,
    refreshDashboard,
    refreshAll,
    invalidate,
  };
}

/**
 * 简化的刷新触发器 - 用于表单提交后
 */
export function useRefreshTrigger() {
  const {
    refreshTransactions,
    refreshProjects,
    refreshProjectTransactions,
    refreshProjectAdditions,
    refreshExchanges,
    refreshAccounts,
  } = useDataRefresh();

  return {
    // 交易表单提交后调用
    onTransactionSuccess: refreshTransactions,
    
    // 项目表单提交后调用
    onProjectSuccess: refreshProjects,
    
    // 项目交易表单提交后调用
    onProjectTransactionSuccess: (projectId: string) => {
      refreshProjectTransactions(projectId);
    },
    
    // 项目增项表单提交后调用
    onProjectAdditionSuccess: (projectId: string) => {
      refreshProjectAdditions(projectId);
    },
    
    // 换汇表单提交后调用
    onExchangeSuccess: refreshExchanges,
    
    // 账户调整后调用
    onAccountSuccess: refreshAccounts,
  };
}
