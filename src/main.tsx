import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";
import { I18nProvider } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

// ── Global error reporter (fire-and-forget to error_logs) ──
function reportGlobalError(message: string, stack?: string) {
  try {
    supabase.auth.getUser().then(({ data }) => {
      (supabase.from('error_logs' as any) as any).insert({
        error_message: message.slice(0, 2000),
        error_stack: stack?.slice(0, 4000) || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        user_id: data?.user?.id || null,
      }).then(() => {});
    });
  } catch {
    // Silent
  }
}

// Auto-reload on stale chunk errors (happens after redeployment)
window.addEventListener('error', (event) => {
  if (event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Importing a module script failed')) {
    const reloadKey = 'chunk_reload_' + window.location.pathname;
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    }
  } else if (event.error) {
    // Report non-chunk errors
    reportGlobalError(event.message || 'Unknown error', event.error?.stack);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason);
  if (msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed')) {
    const reloadKey = 'chunk_reload_' + window.location.pathname;
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    }
  } else {
    reportGlobalError(msg, event.reason?.stack);
  }
});

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
