import type { AppRoute } from "./types";
import { P } from "@/constants/permissions";
import { lazyRetry } from "./lazyRetry";

const QuotationIndex = lazyRetry(() => import("@/pages/quotation/Index"));
const QuotationProducts = lazyRetry(() => import("@/pages/quotation/Products"));
const QuotationCustomers = lazyRetry(() => import("@/pages/quotation/Customers"));
const QuotationHistory = lazyRetry(() => import("@/pages/quotation/History"));
const QuotationEditor = lazyRetry(() => import("@/pages/quotation/Editor"));
const QuotationEditorSPA = lazyRetry(() => import("@/pages/quotation/EditorSPA"));
const QuotationTemplates = lazyRetry(() => import("@/pages/quotation/Templates"));
const QuotationCategories = lazyRetry(() => import("@/pages/quotation/Categories"));
const QuotationSettings = lazyRetry(() => import("@/pages/quotation/Settings"));
const QuotationUnits = lazyRetry(() => import("@/pages/quotation/Units"));
const PlaceholderPage = lazyRetry(() => import("@/pages/PlaceholderPage"));

export const quotationRoutes: AppRoute[] = [
  { path: "/quotation", element: <QuotationIndex />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/products", element: <QuotationProducts />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/customers", element: <QuotationCustomers />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/history", element: <QuotationHistory />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/editor", element: <QuotationEditor />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/editor/:quotationId", element: <QuotationEditorSPA />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/templates", element: <QuotationTemplates />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/categories", element: <QuotationCategories />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/settings", element: <QuotationSettings />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/units", element: <QuotationUnits />, permissionKey: P.SYSTEM_QUOTATION },
  { path: "/quotation/placeholder", element: <PlaceholderPage />, permissionKey: P.SYSTEM_QUOTATION },
];
