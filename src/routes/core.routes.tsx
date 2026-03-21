import type { AppRoute } from "./types";
import { lazyRetry } from "./lazyRetry";

const Auth = lazyRetry(() => import("@/pages/Auth"));
const SystemSelect = lazyRetry(() => import("@/pages/SystemSelect"));
const Unauthorized = lazyRetry(() => import("@/pages/Unauthorized"));
const NotFound = lazyRetry(() => import("@/pages/NotFound"));
const ResetPassword = lazyRetry(() => import("@/pages/ResetPassword"));

export const coreRoutes: AppRoute[] = [
  { path: "/", element: <SystemSelect /> },
  { path: "/auth", element: <Auth /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/unauthorized", element: <Unauthorized /> },
];

// NotFound is a catch-all and handled separately
export const notFoundRoute: AppRoute = { path: "*", element: <NotFound /> };
