import type { AppRoute } from "./types";
import { P } from "@/constants/permissions";
import { lazyRetry } from "./lazyRetry";

const Dashboard = lazyRetry(() => import("@/pages/Dashboard"));
const Memos = lazyRetry(() => import("@/pages/Memos"));
const Alerts = lazyRetry(() => import("@/pages/Alerts"));
const Reports = lazyRetry(() => import("@/pages/Reports"));
const MonthlyReports = lazyRetry(() => import("@/pages/MonthlyReports"));
const BalanceLedger = lazyRetry(() => import("@/pages/BalanceLedger"));
const Analytics = lazyRetry(() => import("@/pages/Analytics"));

export const dashboardRoutes: AppRoute[] = [
  { path: "/dashboard", element: <Dashboard />, permissionKey: P.NAV_DASHBOARD },
  { path: "/memos", element: <Memos />, permissionKey: P.NAV_MEMOS },
  { path: "/alerts", element: <Alerts />, permissionKey: P.NAV_ALERTS },
  { path: "/reports", element: <Reports />, permissionKey: P.NAV_REPORTS },
  { path: "/monthly-reports", element: <MonthlyReports />, permissionKey: P.NAV_MONTHLY_REPORTS },
  { path: "/balance-ledger", element: <BalanceLedger />, permissionKey: P.NAV_BALANCE_LEDGER },
  { path: "/analytics", element: <Analytics />, permissionKey: P.NAV_SETTINGS },
];
