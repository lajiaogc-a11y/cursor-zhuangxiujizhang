// 统一的查询键管理，用于 React Query 缓存失效
export const queryKeys = {
  // 交易相关
  transactions: ['transactions'] as const,
  transactionStats: ['transactionStats'] as const,
  
  // 项目相关
  projects: ['projects'] as const,
  projectTransactions: (projectId: string) => ['projectTransactions', projectId] as const,
  projectAdditions: (projectId: string) => ['projectAdditions', projectId] as const,
  
  // 账户相关
  accounts: ['accounts'] as const,
  accountBalances: ['accountBalances'] as const,
  
  // 换汇相关
  exchanges: ['exchanges'] as const,
  exchangeRates: ['exchangeRates'] as const,
  
  // 仪表盘
  dashboard: ['dashboard'] as const,
  dashboardCategories: ['dashboardCategories'] as const,
  
  // 报表
  reports: ['reports'] as const,
  monthlyReports: ['monthlyReports'] as const,
  
  // 预警
  alerts: ['alerts'] as const,
  alertRules: ['alertRules'] as const,
  alertCount: ['alertCount'] as const,
  
  // 备忘录
  memos: ['memos'] as const,
  memoCount: ['memoCount'] as const,
  
  // 类别
  categories: ['categories'] as const,
  projectCategories: ['projectCategories'] as const,
  
  // 用户
  users: ['users'] as const,
  userRoles: ['userRoles'] as const,
  
  // 审计日志
  auditLogs: ['auditLogs'] as const,
  
  // 工资相关
  employees: ['employees'] as const,
  salaryPayments: ['salaryPayments'] as const,
  salaryAdvances: ['salaryAdvances'] as const,
  insurancePayments: ['insurancePayments'] as const,
  
  // 应收应付
  payables: ['payables'] as const,
  
  // 银行对账
  bankStatements: ['bankStatements'] as const,
  bankBatches: ['bankBatches'] as const,
  
  // 余额明细
  balanceLedger: ['balanceLedger'] as const,
  calculatedBalances: ['calculatedBalances'] as const,
  
  // 财务汇总
  financialSummary: ['financialSummary'] as const,
  companyAccounts: ['companyAccounts'] as const,
  
  // 其他模块
  fixedAssets: ['fixedAssets'] as const,
  contacts: ['contacts'] as const,
  invoices: ['invoices'] as const,
  taxRates: ['taxRates'] as const,
  approvalRules: ['approvalRules'] as const,
  approvalRequests: ['approvalRequests'] as const,

  // ===== 报价系统 =====
  qQuotations: ['q_quotations'] as const,
  qQuotationDrafts: ['q_quotation_drafts'] as const,
  qProducts: ['q_products'] as const,
  qProductCategories: ['q_product_categories'] as const,
  qProductFavorites: ['q_product_favorites'] as const,
  qCustomers: ['q_customers'] as const,
  qMeasurementUnits: ['q_measurement_units'] as const,
  qNotesTemplates: ['q_quotation_notes_templates'] as const,
  qCompanySettings: ['q_company_settings'] as const,
  qUserProductCategories: ['q_user_product_categories'] as const,

  // ===== 成本控制 =====
  qMethods: ['q_methods'] as const,
  qMethodMaterials: (methodId: string) => ['q_method_materials', methodId] as const,
  qMaterials: ['q_materials'] as const,
  qWorkerTypes: ['q_worker_types'] as const,
  qProjectBreakdowns: ['q_project_breakdowns'] as const,
  qBreakdownItems: (breakdownId: string) => ['q_breakdown_items', breakdownId] as const,
  qBreakdownVersions: (breakdownId: string) => ['q_breakdown_versions', breakdownId] as const,
  qCostStats: ['q-cost-control-stats'] as const,

  // ===== 采购系统 =====
  qPurchaseOrders: ['q_purchase_orders'] as const,
  qPurchaseOrderItems: (orderId: string) => ['q_purchase_order_items', orderId] as const,
  qPurchasePayments: (orderId: string) => ['q_purchase_payments', orderId] as const,
  qPurchaseReceivings: (orderId: string) => ['q_purchase_receivings', orderId] as const,
  qPurchaseReceivingItems: (receivingId: string) => ['q_purchase_receiving_items', receivingId] as const,
  qPoAuditLogs: (orderId: string) => ['q_po_audit_logs', orderId] as const,
  qPoAttachments: (orderId: string) => ['q_po_attachments', orderId] as const,
  qSuppliers: ['q_suppliers'] as const,
  qMaterialSupplierPrices: ['q_material_supplier_prices'] as const,
  qPurchasingSummary: ['q_purchasing_summary'] as const,
  qInventory: ['q_inventory'] as const,
} as const;

// 定义哪些操作应该触发哪些查询失效
export const invalidationMap = {
  // 交易操作影响的查询
  transactionMutation: [
    queryKeys.transactions,
    queryKeys.transactionStats,
    queryKeys.accounts,
    queryKeys.accountBalances,
    queryKeys.dashboard,
    queryKeys.dashboardCategories,
    queryKeys.reports,
    queryKeys.monthlyReports,
    queryKeys.balanceLedger,
    queryKeys.calculatedBalances,
    queryKeys.financialSummary,
  ],
  
  // 项目操作影响的查询
  projectMutation: [
    queryKeys.projects,
    queryKeys.dashboard,
  ],
  
  // 项目交易操作影响的查询
  projectTransactionMutation: (projectId: string) => [
    queryKeys.transactions,
    queryKeys.transactionStats,
    queryKeys.projects,
    queryKeys.projectTransactions(projectId),
    queryKeys.accounts,
    queryKeys.accountBalances,
    queryKeys.dashboard,
    queryKeys.balanceLedger,
    queryKeys.calculatedBalances,
  ],
  
  // 项目增项操作影响的查询
  projectAdditionMutation: (projectId: string) => [
    queryKeys.transactions,
    queryKeys.projects,
    queryKeys.projectAdditions(projectId),
    queryKeys.dashboard,
  ],
  
  // 换汇操作影响的查询
  exchangeMutation: [
    queryKeys.exchanges,
    queryKeys.transactions,
    queryKeys.accounts,
    queryKeys.accountBalances,
    queryKeys.dashboard,
    queryKeys.balanceLedger,
    queryKeys.calculatedBalances,
  ],
  
  // 账户操作影响的查询
  accountMutation: [
    queryKeys.accounts,
    queryKeys.accountBalances,
    queryKeys.dashboard,
    queryKeys.balanceLedger,
    queryKeys.calculatedBalances,
    queryKeys.financialSummary,
  ],
  
  // 工资操作影响的查询
  payrollMutation: [
    queryKeys.employees,
    queryKeys.salaryPayments,
    queryKeys.salaryAdvances,
    queryKeys.insurancePayments,
  ],
  
  // 应收应付操作
  payableMutation: [
    queryKeys.payables,
    queryKeys.dashboard,
  ],
  
  // 备忘录操作
  memoMutation: [
    queryKeys.memos,
    queryKeys.memoCount,
  ],
  
  // 预警操作
  alertMutation: [
    queryKeys.alerts,
    queryKeys.alertRules,
    queryKeys.alertCount,
  ],
} as const;
