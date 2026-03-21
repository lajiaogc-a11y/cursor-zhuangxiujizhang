import type { AppRoute } from "./types";
import { lazyRetry } from "./lazyRetry";

const SuperAdmin = lazyRetry(() => import("@/pages/SuperAdmin"));

export const adminRoutes: AppRoute[] = [
  // No permissionKey — SuperAdmin page does its own isSuperAdmin check internally
  // Using nav.settings would allow any tenant admin to load the component
  { path: "/super-admin", element: <SuperAdmin /> },
];
