import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
    },
  },
});

const PageLoader = () => (
  <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-primary/20 overflow-hidden">
    <div className="h-full w-1/3 bg-primary rounded-r" 
      style={{ animation: 'progressSlide 1.2s ease-in-out infinite' }} />
    <style>{`@keyframes progressSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
  </div>
);

/**
 * Core routes (auth, unauthorized) are rendered without ProtectedRoute.
 * All other routes with a permissionKey are wrapped in ProtectedRoute.
 * Routes without permissionKey but not in the "unprotected" set get a basic ProtectedRoute wrapper.
 */
const UNPROTECTED_PATHS = new Set(["/auth", "/unauthorized", "/reset-password", "*"]);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <TenantProvider>
              <SkipNavLink />
              <Suspense fallback={<PageLoader />}>
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
