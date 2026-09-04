import { useCallback, useEffect, useRef, useState } from "react";

// Wraps the browser Fullscreen API for a single container element. Used by
// viewer-style modals (image lightbox, image comparison) that already fill
// the viewport via CSS but should also support real OS-level fullscreen.
export function useFullscreen<T extends HTMLElement>() {
  const containerRef = useRef<T | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement &&
          document.fullscreenElement === containerRef.current,
      );
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Requests fullscreen for the container if it isn't already showing it.
  // Safe to call speculatively (e.g. on mount) — failures (no user-gesture
  // context, an embedding iframe without `allow="fullscreen"`, etc.) are
  // swallowed since the viewer still fills the viewport via its existing
  // fixed-position CSS.
  const enterFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el || document.fullscreenElement === el) return;
    try {
      await el.requestFullscreen();
    } catch {
      // ignored — see comment above
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  return {
    containerRef,
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
