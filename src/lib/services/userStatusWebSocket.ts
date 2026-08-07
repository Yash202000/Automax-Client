import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UserStatusMessage {
  id: string;
  extension?: string;
  call_status?: string;
  updated_at?: string;
}

// Singleton WebSocket connection to prevent duplicates. This mirrors the
// pattern used by incidentListWebSocket.ts but listens for `user_status_changed`
// broadcasts so the incident assignee dropdowns can reflect live agent
// availability. Both hooks connect to the same /ws/broadcast endpoint; the
// backend fans every BroadcastToAll message out to all broadcast clients, so
// each hook simply ignores message types it does not care about.
let statusWs: WebSocket | null = null;
let isConnecting = false;
let reconnectTimeout: number | null = null;
let reconnectAttempts = 0;
let subscriberCount = 0;
const maxReconnectAttempts = 5;
const queryClients = new Set<any>();

/**
 * Patch the matching user's call_status inside every registered React Query
 * cache entry under the ["admin","users"] key. userApi.list returns a
 * PaginatedResponse<User> ({ success, data: User[], ... }); we also defensively
 * handle a bare array in case the shape ever changes.
 */
function applyStatusToCaches(data: UserStatusMessage) {
  if (!data?.id) return;

  queryClients.forEach((qc) => {
    qc.setQueriesData({ queryKey: ["admin", "users"] }, (oldData: any) => {
      if (!oldData) return oldData;

      let users: any[] = [];
      if (Array.isArray(oldData)) {
        users = oldData;
      } else if (Array.isArray(oldData.data)) {
        users = oldData.data;
      } else {
        return oldData;
      }

      const updatedUsers = users.map((u: any) =>
        u.id === data.id ? { ...u, call_status: data.call_status } : u,
      );

      if (Array.isArray(oldData)) {
        return updatedUsers;
      }
      return { ...oldData, data: updatedUsers };
    });
  });
}

/**
 * WebSocket hook for real-time agent availability (call_status) updates.
 * Uses a singleton connection shared across all components.
 */
export function useUserStatusWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Register this query client
    queryClients.add(queryClient);
    subscriberCount++;

    // If already connected, just increment counter
    if (statusWs?.readyState === WebSocket.OPEN) {
      return () => {
        queryClients.delete(queryClient);
        subscriberCount--;

        if (subscriberCount === 0) {
          isConnecting = false;

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }

          if (statusWs) {
            const ws = statusWs;
            statusWs = null;

            ws.onerror = null;
            ws.onclose = null;

            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1000, "No more subscribers");
            } else if (ws.readyState === WebSocket.CONNECTING) {
              ws.onopen = () => ws.close(1000, "No more subscribers");
            }
          }
        }
      };
    }

    // Only connect if not already connecting/connected
    if (isConnecting || statusWs) {
      return () => {
        queryClients.delete(queryClient);
        subscriberCount--;
      };
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("[UserStatus WS] No auth token found");
      return;
    }

    const connectWebSocket = () => {
      if (isConnecting || statusWs) return;
      isConnecting = true;

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Use runtime config (Docker) if available, otherwise build-time config
      const wsHost =
        (window as any).APP_CONFIG?.WS_URL || import.meta.env.VITE_WS_URL;

      if (!wsHost) {
        console.error(
          "[UserStatus WS] No WebSocket URL configured. Please set VITE_WS_URL in .env file",
        );
        isConnecting = false;
        return;
      }

      const wsUrl = wsHost
        .replace(/^https?:/, wsProtocol.replace(":", ""))
        .replace(/\/$/, "");

      const params = new URLSearchParams({
        channel: "user_status",
        token: token,
      });

      const fullUrl = `${wsUrl}/api/v1/ws/broadcast?${params.toString()}`;

      const ws = new WebSocket(fullUrl);
      statusWs = ws;

      ws.onopen = () => {
        isConnecting = false;
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error("[UserStatus WS] Failed to parse message:", error);
          return;
        }

        try {
          if (message.type === "user_status_changed") {
            applyStatusToCaches(message.data as UserStatusMessage);
          }
        } catch (error) {
          console.error(
            "[UserStatus WS] Failed to handle message:",
            error,
            message,
          );
        }
      };

      ws.onerror = (error) => {
        console.error("[UserStatus WS] Error:", error);
        isConnecting = false;
      };

      ws.onclose = (event) => {
        statusWs = null;
        isConnecting = false;

        const isExpectedClosure =
          event.code === 1000 || event.code === 1001 || subscriberCount === 0;

        if (isExpectedClosure) {
          return;
        }

        if (subscriberCount > 0 && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

          reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };
    };

    // Initial connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      queryClients.delete(queryClient);
      subscriberCount--;

      if (subscriberCount === 0) {
        isConnecting = false;

        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }

        if (statusWs) {
          const ws = statusWs;
          statusWs = null;

          ws.onerror = null;
          ws.onclose = null;

          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, "No more subscribers");
          } else if (ws.readyState === WebSocket.CONNECTING) {
            ws.onopen = () => ws.close(1000, "No more subscribers");
          }
        }
      }
    };
  }, [queryClient]);
}
