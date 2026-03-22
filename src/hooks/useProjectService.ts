/**
 * Unified Project Hooks
 * 
 * 基于 service 层的项目数据 React Query hooks。
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { projectsService } from '@/services';
import type { ProjectFilters } from '@/services/projects.service';

/**
 * 项目列表查询 Hook
 */
export function useProjects(
  tenantId: string | undefined,
  filters?: ProjectFilters,
  enabled = true
) {
  return useQuery({
    queryKey: [...queryKeys.projects, tenantId, filters],
    queryFn: () => projectsService.fetchProjects(tenantId!, filters),
    enabled: !!tenantId && enabled,
  });
}

/**
 * 单个项目查询 Hook
 */
export function useProject(tenantId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.projects, tenantId, 'detail', projectId],
    queryFn: () => projectsService.fetchProject(projectId!),
    enabled: !!tenantId && !!projectId,
  });
}

/**
 * 项目统计 Hook（从列表数据派生）
 */
export function useProjectStats(tenantId: string | undefined) {
  const { data: projects = [], ...rest } = useProjects(tenantId);
  
  return {
    ...rest,
    data: projects,
    stats: projectsService.calculateProjectStats(projects),
  };
}

/**
 * 项目列表 + 关联交易汇总（供 Projects 页面使用）
 */
export function useProjectsWithTransactions(
  tenantId: string | undefined,
  statusFilter: string
) {
  return useQuery({
    queryKey: [...queryKeys.projects, tenantId, statusFilter],
    queryFn: () => projectsService.fetchProjectsWithTransactions(tenantId!, statusFilter),
    enabled: !!tenantId,
  });
}

export function useRefreshProjects() {
  const qc = useQueryClient();
  const { tenant } = useTenant();
  const tid = tenant?.id;
  return () => {
    if (!tid) return;
    qc.invalidateQueries({ queryKey: [...queryKeys.projects, tid] });
    qc.invalidateQueries({ queryKey: [...queryKeys.dashboard, tid] });
  };
}
