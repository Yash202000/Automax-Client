import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";

const DEFAULT_TIMEOUT_MINUTES = 15;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "click",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
];

function getTimeoutMs(): number {
  const minutes = parseInt(
    window.APP_CONFIG?.SESSION_TIMEOUT_MINUTES ??
      import.meta.env.VITE_SESSION_TIMEOUT_MINUTES ??
      String(DEFAULT_TIMEOUT_MINUTES),
    10,
  );
  return Math.max(1, minutes) * 60 * 1000;
}

function getWarningMs(timeoutMs: number): number {
  return Math.min(60_000, timeoutMs * 0.2);
}

export function useInactivityTimeout() {
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalWarningSeconds, setTotalWarningSeconds] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningShownRef = useRef(false);
  const lastActivityRef = useRef(0);
  const logoutRef = useRef(logout);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      warningShownRef.current = false;
      setShowWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    setShowWarning(false);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const timeoutMs = getTimeoutMs();
      const warningMs = getWarningMs(timeoutMs);

      if (elapsed >= timeoutMs) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        warningShownRef.current = false;
        setShowWarning(false);
        logoutRef.current();
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return;
      }

      if (elapsed >= timeoutMs - warningMs && !warningShownRef.current) {
        warningShownRef.current = true;
        setShowWarning(true);
        setTotalWarningSeconds(Math.ceil(warningMs / 1000));
      }

      if (warningShownRef.current) {
        setRemainingSeconds(Math.ceil((timeoutMs - elapsed) / 1000));
      }
    }, 1000);

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < 2000) return;
      lastActivityRef.current = now;
      warningShownRef.current = false;
      setShowWarning(false);
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      warningShownRef.current = false;
      setShowWarning(false);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated]);

  const stayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    setShowWarning(false);
  }, []);

  return { showWarning, remainingSeconds, totalWarningSeconds, stayLoggedIn };
}
