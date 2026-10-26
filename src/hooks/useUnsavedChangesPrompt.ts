import { useEffect, useRef, useState } from "react";

const GUARD_STATE_KEY = "unsavedChangesGuard";

/**
 * Warns before leaving the current page with unsaved changes.
 * - Refresh / tab close: the browser's native "Leave site?" prompt.
 * - Clicking a link or pressing Back: opens the page's own dialog
 *   (`isOpen`), which calls `leave()` or `stay()`.
 *
 * Works with the existing <BrowserRouter>, so it only affects the page that
 * uses it. Programmatic `navigate()` calls (e.g. logout) are not intercepted.
 */
export function useUnsavedChangesPrompt(isDirty: boolean) {
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const isLeavingRef = useRef(false);

  // Refresh / close tab
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isLeavingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Link clicks (sidebar, navbar, breadcrumbs, ...)
  useEffect(() => {
    if (!isDirty) return;
    const handleClick = (event: MouseEvent) => {
      if (isLeavingRef.current) return;
      const anchor = (event.target as HTMLElement).closest("a");
      if (
        !anchor?.href ||
        anchor.target === "_blank" ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const url = new URL(anchor.href);
      const isSamePage =
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname;
      if (isSamePage) return;

      event.preventDefault();
      event.stopPropagation();
      // Re-click the link once the user confirms, so the router handles it.
      setPendingLeave(() => () => anchor.click());
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty]);

  // Back button: keep an extra history entry for this page, so pressing Back
  // lands on the same page and we can ask before really going back.
  useEffect(() => {
    if (!isDirty) return;
    if (!window.history.state?.[GUARD_STATE_KEY]) {
      window.history.pushState(
        { ...window.history.state, [GUARD_STATE_KEY]: true },
        "",
      );
    }
    const handlePopState = (event: PopStateEvent) => {
      if (isLeavingRef.current || event.state?.[GUARD_STATE_KEY]) return;
      setPendingLeave(() => () => window.history.back());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty]);

  const leave = () => {
    isLeavingRef.current = true;
    pendingLeave?.();
    setPendingLeave(null);
  };

  const stay = () => {
    // Back already removed the extra entry; add it again.
    if (!window.history.state?.[GUARD_STATE_KEY]) {
      window.history.pushState(
        { ...window.history.state, [GUARD_STATE_KEY]: true },
        "",
      );
    }
    setPendingLeave(null);
  };

  return { isOpen: pendingLeave !== null, leave, stay };
}
