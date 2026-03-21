/**
 * Dashboard Service Hooks
 * 
 * 基于 service 层的仪表盘数据 React Query hooks。
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { dashboardService } from '@/services';

/**
 * 仪表盘主数据 Hook
 */
export function useDashboardData(tenantId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.dashboard, tenantId],
    queryFn: () => dashboardService.fetchDashboardData(tenantId!),
    enabled: !!tenantId,
  });
}

/**
 * 类目分析数据 Hook
 */
export function useCategoryAnalysis(
  tenantId: string | undefined,
  dateRange?: { from?: Date; to?: Date },
  otherLabel?: string
) {
  return useQuery({
    queryKey: [
      ...queryKeys.dashboardCategories,
      tenantId,
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
    ],
    queryFn: () => dashboardService.fetchCategoryAnalysis(tenantId!, dateRange, otherLabel),
    enabled: !!tenantId,
  });
}
