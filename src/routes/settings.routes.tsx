import type { AppRoute } from "./types";
import { P } from "@/constants/permissions";
import { lazyRetry } from "./lazyRetry";

const Settings = lazyRetry(() => import("@/pages/Settings"));
const GlobalSettings = lazyRetry(() => import("@/pages/GlobalSettings"));
const Profile = lazyRetry(() => import("@/pages/Profile"));

export const settingsRoutes: AppRoute[] = [
  { path: "/settings", element: <Settings />, permissionKey: P.NAV_SETTINGS },
  { path: "/global-settings", element: <GlobalSettings />, permissionKey: P.NAV_SETTINGS },
  { path: "/profile", element: <Profile /> },
];
