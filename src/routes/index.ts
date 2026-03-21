/**
 * Route Aggregation Module
 *
 * All business module routes are declared in their own *.routes.tsx file.
 * To add a new module:
 *   1. Create src/routes/mymodule.routes.tsx exporting an AppRoute[]
 *   2. Import and spread it into `appRoutes` below
 *   3. No changes to App.tsx needed
 */

export type { AppRoute } from "./types";

import { coreRoutes, notFoundRoute } from "./core.routes";
import { dashboardRoutes } from "./dashboard.routes";
import { financeRoutes } from "./finance.routes";
import { projectRoutes } from "./projects.routes";
import { settingsRoutes } from "./settings.routes";
import { quotationRoutes } from "./quotation.routes";
import { costRoutes } from "./cost.routes";
import { purchasingRoutes } from "./purchasing.routes";
import { adminRoutes } from "./admin.routes";
import { crmRoutes } from "./crm.routes";
import { workforceRoutes } from "./workforce.routes";

export const appRoutes = [
  ...coreRoutes,
  ...dashboardRoutes,
  ...projectRoutes,
  ...financeRoutes,
  ...settingsRoutes,
  ...quotationRoutes,
  ...costRoutes,
  ...purchasingRoutes,
  ...adminRoutes,
  ...crmRoutes,
  ...workforceRoutes,
  notFoundRoute,
];

export default appRoutes;
