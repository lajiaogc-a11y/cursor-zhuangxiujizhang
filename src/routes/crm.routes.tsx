import type { AppRoute } from "./types";
import { P } from "@/constants/permissions";
import { lazyRetry } from "./lazyRetry";

const CRMDashboard = lazyRetry(() => import("@/pages/crm/Dashboard"));
const CRMCustomers = lazyRetry(() => import("@/pages/crm/Customers"));
const CRMCustomerDetail = lazyRetry(() => import("@/pages/crm/CustomerDetail"));
const CRMContracts = lazyRetry(() => import("@/pages/crm/Contracts"));
const CRMTemplates = lazyRetry(() => import("@/pages/crm/Templates"));
const CRMAmendments = lazyRetry(() => import("@/pages/crm/Amendments"));
const CRMReports = lazyRetry(() => import("@/pages/crm/Reports"));

export const crmRoutes: AppRoute[] = [
  { path: "/crm", element: <CRMDashboard />, permissionKey: P.SYSTEM_CRM },
  { path: "/crm/customers", element: <CRMCustomers />, permissionKey: P.NAV_CRM_CUSTOMERS },
  { path: "/crm/customers/:customerId", element: <CRMCustomerDetail />, permissionKey: P.NAV_CRM_CUSTOMERS },
  { path: "/crm/contracts", element: <CRMContracts />, permissionKey: P.NAV_CRM_CONTRACTS },
  { path: "/crm/templates", element: <CRMTemplates />, permissionKey: P.NAV_CRM_TEMPLATES },
  { path: "/crm/amendments", element: <CRMAmendments />, permissionKey: P.NAV_CRM_AMENDMENTS },
  { path: "/crm/reports", element: <CRMReports />, permissionKey: P.NAV_CRM_REPORTS },
];
