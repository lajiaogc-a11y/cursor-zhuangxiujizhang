import type { AppRoute } from "./types";
import { P } from "@/constants/permissions";
import { lazyRetry } from "./lazyRetry";

const CostControlIndex = lazyRetry(() => import("@/pages/cost/Index"));
const CostMaterials = lazyRetry(() => import("@/pages/cost/Materials"));
const CostMethods = lazyRetry(() => import("@/pages/cost/Methods"));
const CostWorkerTypes = lazyRetry(() => import("@/pages/cost/WorkerTypes"));
const CostBudget = lazyRetry(() => import("@/pages/cost/Budget"));
const CostBreakdownDetail = lazyRetry(() => import("@/pages/cost/BreakdownDetail"));
const CostLabor = lazyRetry(() => import("@/pages/cost/Labor"));
const CostCategoryMapping = lazyRetry(() => import("@/pages/cost/CategoryMapping"));
const CostMethodMaterials = lazyRetry(() => import("@/pages/cost/MethodMaterials"));
const CostMethodLabor = lazyRetry(() => import("@/pages/cost/MethodLabor"));
const CostTaxSettings = lazyRetry(() => import("@/pages/cost/TaxSettings"));

export const costRoutes: AppRoute[] = [
  { path: "/cost", element: <CostControlIndex />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/materials", element: <CostMaterials />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/methods", element: <CostMethods />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/worker-types", element: <CostWorkerTypes />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/budget", element: <CostBudget />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/budget/:quotationId", element: <CostBreakdownDetail />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/labor", element: <CostLabor />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/category-mapping", element: <CostCategoryMapping />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/method-materials", element: <CostMethodMaterials />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/method-labor", element: <CostMethodLabor />, permissionKey: P.SYSTEM_COST },
  { path: "/cost/tax-settings", element: <CostTaxSettings />, permissionKey: P.SYSTEM_COST },
];
