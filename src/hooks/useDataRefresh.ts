import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys, invalidationMap } from '@/lib/queryKeys';

/**
 * 统一的数据刷新 Hook
 * 确保增删改操作后所有相关页面数据同步更新
 */
export function useDataRefresh() {
  const queryClient = useQueryClient();

  // 刷新交易相关数据
  const refreshTransactions = useCallback(() => {
    invalidationMap.transactionMutation.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  // 刷新项目相关数据
  const refreshProjects = useCallback(() => {
    invalidationMap.projectMutation.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  // 刷新项目交易数据
  const refreshProjectTransactions = useCallback((projectId: string) => {
    invalidationMap.projectTransactionMutation(projectId).forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  // 刷新项目增项数据
  const refreshProjectAdditions = useCallback((projectId: string) => {
    invalidationMap.projectAdditionMutation(projectId).forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  // 刷新换汇数据
  const refreshExchanges = useCallback(() => {
    invalidationMap.exchangeMutation.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  // 刷新账户数据
  const refreshAccounts = useCallback(() => {
    invalidationMap.accountMutation.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  // 刷新仪表盘数据
  const refreshDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  }, [queryClient]);

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
