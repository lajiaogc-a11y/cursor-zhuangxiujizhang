import type { AppRoute } from "./types";
import { P } from "@/constants/permissions";
import { lazyRetry } from "./lazyRetry";

const WorkforceDashboard = lazyRetry(() => import("@/pages/workforce/Dashboard"));
const WorkforceSites = lazyRetry(() => import("@/pages/workforce/Sites"));
const WorkforceWorkers = lazyRetry(() => import("@/pages/workforce/Workers"));
const WorkforceShifts = lazyRetry(() => import("@/pages/workforce/Shifts"));
const WorkforceAttendance = lazyRetry(() => import("@/pages/workforce/Attendance"));
const WorkforceLeaves = lazyRetry(() => import("@/pages/workforce/Leaves"));
const WorkforcePayroll = lazyRetry(() => import("@/pages/workforce/Payroll"));

export const workforceRoutes: AppRoute[] = [
  { path: "/workforce", element: <WorkforceDashboard />, permissionKey: P.SYSTEM_WORKFORCE },
  { path: "/workforce/sites", element: <WorkforceSites />, permissionKey: P.NAV_WF_SITES },
  { path: "/workforce/workers", element: <WorkforceWorkers />, permissionKey: P.NAV_WF_WORKERS },
  { path: "/workforce/shifts", element: <WorkforceShifts />, permissionKey: P.NAV_WF_SHIFTS },
  { path: "/workforce/attendance", element: <WorkforceAttendance />, permissionKey: P.NAV_WF_ATTENDANCE },
  { path: "/workforce/leaves", element: <WorkforceLeaves />, permissionKey: P.NAV_WF_LEAVES },
  { path: "/workforce/payroll", element: <WorkforcePayroll />, permissionKey: P.NAV_WF_PAYROLL },
];
