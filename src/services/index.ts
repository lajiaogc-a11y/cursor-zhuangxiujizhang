/**
 * Services Index
 * 
 * 统一导出所有业务服务。
 * 
 * 使用方式：
 *   import { transactionsService } from '@/services';
 *   const data = await transactionsService.fetchTransactions(tenantId, filters, pagination);
 * 
 * 迁移指南：
 *   1. 新代码应使用 service 层而非直接调用 supabase
 *   2. 现有代码可逐步迁移，service 与直接调用可共存
 *   3. 每个 service 文件对应一个业务域
 */

export * as transactionsService from './transactions.service';
export * as accountsService from './accounts.service';
export * as projectsService from './projects.service';
export * as exchangesService from './exchanges.service';
export * as dashboardService from './dashboard.service';
export * as alertsService from './alerts.service';
export * as balanceLedgerService from './balanceLedger.service';
export * as reportsService from './reports.service';
export * as monthlyReportsService from './monthlyReports.service';
export * as invoicesService from './invoices.service';
export * as contactsService from './contacts.service';
export * as fixedAssetsService from './fixedAssets.service';
export * as payrollService from './payroll.service';
export * as settingsService from './settings.service';
export * as payablesService from './payables.service';
export * as suppliersService from './suppliers.service';
export * as approvalsService from './approvals.service';
export * as profileService from './profile.service';
export * as crmService from './crm.service';
export * as workforceService from './workforce.service';
export * as costService from './cost.service';
export * as purchasingService from './purchasing.service';
export * as quotationService from './quotation.service';
export * as memosService from './memos.service';
export * as adminService from './admin.service';
export * as bankReconciliationService from './bankReconciliation.service';
export * as receiptsService from './receipts.service';

// Re-export base types for consumers
export type {
  PaginationParams,
  PaginatedResult,
  DateRangeFilter,
  SortParams,
} from './base';
export { ServiceError } from './base';
