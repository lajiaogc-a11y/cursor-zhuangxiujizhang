import { Navigate } from "react-router-dom";
import type { AppRoute } from "./types";
import { P } from "@/constants/permissions";
import { lazyRetry } from "./lazyRetry";

const Transactions = lazyRetry(() => import("@/pages/Transactions"));
const BankReconciliation = lazyRetry(() => import("@/pages/BankReconciliation"));
const Contacts = lazyRetry(() => import("@/pages/Contacts"));
const TaxManagement = lazyRetry(() => import("@/pages/TaxManagement"));
const Invoices = lazyRetry(() => import("@/pages/Invoices"));
const Approvals = lazyRetry(() => import("@/pages/Approvals"));
const FixedAssets = lazyRetry(() => import("@/pages/FixedAssets"));

export const financeRoutes: AppRoute[] = [
  { path: "/transactions", element: <Transactions />, permissionKey: P.NAV_TRANSACTIONS },
  { path: "/exchange", element: <Navigate to="/transactions?tab=exchange" replace />, permissionKey: P.NAV_EXCHANGE },
  { path: "/payroll", element: <Navigate to="/transactions?tab=payroll" replace />, permissionKey: P.NAV_PAYROLL },
  { path: "/payables", element: <Navigate to="/transactions?tab=payables" replace />, permissionKey: P.NAV_PAYABLES },
  { path: "/bank-reconciliation", element: <BankReconciliation />, permissionKey: P.NAV_BANK_RECONCILIATION },
  { path: "/contacts", element: <Contacts />, permissionKey: P.NAV_CONTACTS },
  { path: "/tax-management", element: <TaxManagement />, permissionKey: P.NAV_TAX_MANAGEMENT },
  { path: "/invoices", element: <Invoices />, permissionKey: P.NAV_INVOICES },
  { path: "/approvals", element: <Approvals />, permissionKey: P.NAV_APPROVALS },
  { path: "/fixed-assets", element: <FixedAssets />, permissionKey: P.NAV_FIXED_ASSETS },
];
