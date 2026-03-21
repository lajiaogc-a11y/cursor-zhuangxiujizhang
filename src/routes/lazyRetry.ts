import { lazy } from "react";

/**
 * Wrapper around React.lazy that handles stale chunk errors after deployments.
 * If a dynamic import fails (e.g. old cached chunk hash), it reloads the page once.
 */
export const lazyRetry = (importFn: () => Promise<any>) =>
  lazy(() =>
    importFn().catch(() => {
      const key = 'chunk_retry';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      sessionStorage.removeItem(key);
      return importFn();
    })
  );
