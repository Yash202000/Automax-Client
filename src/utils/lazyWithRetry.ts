import { lazy, type ComponentType } from "react";

type ModuleDefault<T> = { default: T };

/**
 * Wraps React.lazy with automatic retry for stale chunk errors.
 *
 * After a new deployment, hashed chunk filenames change. Users with a cached
 * index.html will try to load old chunks that no longer exist (HTTP 404).
 * This wrapper catches that failure and forces a hard reload to fetch the
 * new index.html (which has correct chunk references).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<ModuleDefault<T>>,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    importFn().catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module") ||
        msg.includes("Loading chunk") ||
        msg.includes("Loading CSS chunk");

      if (!isChunkError) throw error;

      // Prevent infinite reload loops — allow one reload per page path per session
      const retryKey = "chunk_reload:" + window.location.pathname;
      if (sessionStorage.getItem(retryKey)) {
        // Already reloaded once for this path — don't loop, let error boundary handle it
        sessionStorage.removeItem(retryKey);
        throw error;
      }

      sessionStorage.setItem(retryKey, "1");

      // Force a hard reload bypassing browser cache to get fresh index.html
      // The new index.html will have correct chunk filenames
      window.location.href =
        window.location.pathname +
        window.location.search +
        (window.location.search ? "&" : "?") +
        "_r=" +
        Date.now() +
        window.location.hash;

      // Return a never-resolving promise so React doesn't render an error
      return new Promise<ModuleDefault<T>>(() => {});
    }),
  );
}
