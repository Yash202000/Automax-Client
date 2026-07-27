import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuthStore } from "../stores/authStore";
import { authApi } from "../api/auth";

export const useGlobalWebSocket = () => {
  const { user, token, isAuthenticated, setUser } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      if (wsRef.current) {
        wsRef.current.close(1000, "User logged out");
        wsRef.current = null;
      }
      return;
    }

    let isComponentMounted = true;
    let reconnectTimeout: number | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      ) {
        return;
      }

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.APP_CONFIG?.WS_URL || import.meta.env.VITE_WS_URL;

      if (!wsHost) {
        // console.warn("[Global WS] No WebSocket URL configured.");
        return;
      }

      const wsUrl = wsHost
        .replace(/^https?:/, wsProtocol.replace(":", ""))
        .replace(/\/$/, "");

      const params = new URLSearchParams({
        channel: "global",
        user_id: user.id,
        token: token,
      });

      const fullUrl = `${wsUrl}/api/v1/ws/broadcast?${params.toString()}`;
      const ws = new WebSocket(fullUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted) return;

        try {
          const message = JSON.parse(event.data);
          if (message.type === "permissions_changed") {
            authApi
              .getProfile()
              .then((profileResp) => {
                if (profileResp.success && profileResp.data) {
                  setUser(profileResp.data);
                  toast.success("Permissions Updated", {
                    description:
                      "Your session has been refreshed with the latest access rights.",
                    duration: 5000,
                  });
                }
              })
              .catch((err) => {
                // console.error("[Global WS] Error fetching profile after permission change:", err);
              });
          }
        } catch (error) {
          // console.error("[Global WS] Failed to parse message:", error);
        }
      };

      ws.onclose = (event) => {
        wsRef.current = null;

        const isExpectedClosure = event.code === 1000 || event.code === 1001;
        if (isExpectedClosure || !isComponentMounted) return;

        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeout = window.setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      isComponentMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Unmounting");
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, token, user?.id, setUser]);
};
