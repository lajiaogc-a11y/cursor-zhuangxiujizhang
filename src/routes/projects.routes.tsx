import type { AppRoute } from "./types";
import { P } from "@/constants/permissions";
import { lazyRetry } from "./lazyRetry";

const Projects = lazyRetry(() => import("@/pages/Projects"));
const ProjectFinancialsPage = lazyRetry(() => import("@/pages/ProjectFinancialsPage"));

export const projectRoutes: AppRoute[] = [
  { path: "/projects", element: <Projects />, permissionKey: P.NAV_PROJECTS },
  { path: "/projects/:projectId/financials", element: <ProjectFinancialsPage />, permissionKey: P.NAV_PROJECTS },
];
