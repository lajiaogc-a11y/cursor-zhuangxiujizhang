import type { AppRoute } from "./types";
import { P } from "@/constants/permissions";
import { lazyRetry } from "./lazyRetry";

const PurchasingIndex = lazyRetry(() => import("@/pages/purchasing/Index"));
const PurchasingSuppliers = lazyRetry(() => import("@/pages/purchasing/Suppliers"));
const PurchasingOrders = lazyRetry(() => import("@/pages/purchasing/Orders"));
const PurchasingOrderDetail = lazyRetry(() => import("@/pages/purchasing/OrderDetail"));
const PurchasingPayments = lazyRetry(() => import("@/pages/purchasing/Payments"));
const PurchasingReceiving = lazyRetry(() => import("@/pages/purchasing/Receiving"));
const PurchasingInventory = lazyRetry(() => import("@/pages/purchasing/Inventory"));
const PurchasingMaterials = lazyRetry(() => import("@/pages/purchasing/Materials"));
const PurchasingSummary = lazyRetry(() => import("@/pages/purchasing/Summary"));

export const purchasingRoutes: AppRoute[] = [
  { path: "/purchasing", element: <PurchasingIndex />, permissionKey: P.SYSTEM_PURCHASING },
  { path: "/purchasing/suppliers", element: <PurchasingSuppliers />, permissionKey: P.SYSTEM_PURCHASING },
  { path: "/purchasing/orders", element: <PurchasingOrders />, permissionKey: P.SYSTEM_PURCHASING },
  { path: "/purchasing/orders/:orderId", element: <PurchasingOrderDetail />, permissionKey: P.SYSTEM_PURCHASING },
  { path: "/purchasing/orders/:orderId/payments", element: <PurchasingPayments />, permissionKey: P.SYSTEM_PURCHASING },
  { path: "/purchasing/receiving", element: <PurchasingReceiving />, permissionKey: P.SYSTEM_PURCHASING },
  { path: "/purchasing/inventory", element: <PurchasingInventory />, permissionKey: P.SYSTEM_PURCHASING },
  { path: "/purchasing/materials", element: <PurchasingMaterials />, permissionKey: P.SYSTEM_PURCHASING },
  { path: "/purchasing/summary", element: <PurchasingSummary />, permissionKey: P.SYSTEM_PURCHASING },
];
