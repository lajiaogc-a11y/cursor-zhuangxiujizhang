import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RouterNavigateRegistrar } from "@/components/layout/RouterNavigateRegistrar";
import { RouteProgressBar } from "@/components/layout/RouteProgressBar";
import { AuthProvider } from "@/lib/auth";
import { TenantProvider } from "@/lib/tenant";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { AIChatbot } from "@/components/ai/AIChatbot";
import { SkipNavLink } from "@/components/accessibility/SkipNavLink";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import appRoutes from "@/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Core routes (auth, unauthorized) are rendered without ProtectedRoute.
 * All other routes with a permissionKey are wrapped in ProtectedRoute.
 * Routes without permissionKey but not in the "unprotected" set get a basic ProtectedRoute wrapper.
 */
const UNPROTECTED_PATHS = new Set(["/auth", "/unauthorized", "/reset-password", "*"]);

/**
 * 路由懒加载 chunk 加载中：不占用页面中心大 loading，仅依赖顶部 RouteProgressBar + 各页占位。
 * 避免切页时「整页壳级」闪白与重复全屏菊花。
 */
function RouteSuspenseFallback() {
  return null;
}

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    disableTransitionOnChange
  >
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouterNavigateRegistrar />
          <AuthProvider>
            <TenantProvider>
              <RouteProgressBar />
              <SkipNavLink />
              <Suspense fallback={<RouteSuspenseFallback />}>
                <Routes>
                  {appRoutes.map((route) => {
                    const isUnprotected = UNPROTECTED_PATHS.has(route.path);
                    const inner = isUnprotected
                      ? route.element
                      : (
                        <ProtectedRoute permissionKey={route.permissionKey}>
                          <ModuleErrorBoundary moduleName={route.path}>
                            {route.element}
                          </ModuleErrorBoundary>
                        </ProtectedRoute>
                      );
                    return <Route key={route.path} path={route.path} element={inner} />;
                  })}
                </Routes>
              </Suspense>
              <AIChatbot />
              <OfflineIndicator />
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  </ThemeProvider>
);

export default App;
