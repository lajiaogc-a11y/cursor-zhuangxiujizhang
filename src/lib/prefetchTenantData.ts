import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  accountsService,
  dashboardService,
  payrollService,
  projectsService,
} from '@/services';
import { fetchUnresolvedAlertCount } from '@/services/alerts.service';
import { fetchContacts } from '@/services/contacts.service';
import * as memosService from '@/services/memos.service';
import { fetchQSuppliers } from '@/services/suppliers.service';
import { fetchMaterials } from '@/services/settings.service';
import {
  fetchQuotationStats,
  fetchQuotations,
  fetchProducts,
  fetchCustomers,
  fetchCompanySettings,
} from '@/services/quotation.service';
import { fetchCostControlStats } from '@/services/cost.service';
import { defaultSettings } from '@/data/defaultSettings';

/**
 * 租户就绪后后台预取常用读接口，与页面内 useQuery 的 queryKey 保持一致。
 * 失败不抛错、不阻塞导航；由 React Query 默认重试策略在后续页面访问时补拉。
 */
export async function prefetchTenantCommonData(
  queryClient: QueryClient,
  tenantId: string,
): Promise<void> {
  const tasks = [
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.dashboard, tenantId],
      queryFn: () => dashboardService.fetchDashboardData(tenantId),
    }),
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.projects, tenantId, undefined],
      queryFn: () => projectsService.fetchProjects(tenantId, undefined),
    }),
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.accounts, tenantId],
      queryFn: () => accountsService.fetchAccounts(tenantId),
    }),
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.accountBalances, tenantId],
      queryFn: () => accountsService.fetchAccountBalanceMap(tenantId),
    }),
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.employees, tenantId],
      queryFn: () => payrollService.fetchEmployees(tenantId),
    }),
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.alertCount, tenantId],
      queryFn: () => fetchUnresolvedAlertCount(tenantId),
    }),
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.memoCount, tenantId],
      queryFn: () => memosService.fetchActiveReminderCount(tenantId),
    }),
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.contacts, tenantId],
      queryFn: () => fetchContacts(tenantId),
    }),
    queryClient.prefetchQuery({
      queryKey: ['q_suppliers', tenantId],
      queryFn: () => fetchQSuppliers(tenantId),
    }),
    queryClient.prefetchQuery({
      queryKey: ['q_materials', tenantId],
      queryFn: () => fetchMaterials(),
    }),
    queryClient.prefetchQuery({
      queryKey: ['q-quotation-stats', tenantId],
      queryFn: () => fetchQuotationStats(),
    }),
    queryClient.prefetchQuery({
      queryKey: ['q-cost-control-stats', tenantId],
      queryFn: () => fetchCostControlStats(),
    }),
    queryClient.prefetchQuery({
      queryKey: ['q_quotations', tenantId],
      queryFn: () => fetchQuotations(),
    }),
    queryClient.prefetchQuery({
      queryKey: ['q_products', tenantId],
      queryFn: () => fetchProducts(),
    }),
    queryClient.prefetchQuery({
      queryKey: ['q_customers', tenantId],
      queryFn: () => fetchCustomers(),
    }),
    queryClient.prefetchQuery({
      queryKey: ['q_company_settings', tenantId],
      queryFn: () => fetchCompanySettings(defaultSettings),
    }),
  ];

  await Promise.allSettled(tasks);
}
