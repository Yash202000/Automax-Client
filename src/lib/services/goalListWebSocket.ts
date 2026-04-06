import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { goalKeys } from "../../hooks/useGoals";

// Singleton WebSocket connection to prevent duplicates
let broadcastWs: WebSocket | null = null;
let isConnecting = false;
let reconnectTimeout: number | null = null;
let reconnectAttempts = 0;
let subscriberCount = 0;
const maxReconnectAttempts = 5;
const queryClients = new Set<any>();

/**
 * WebSocket hook for real-time goal list updates
 * Uses a singleton connection shared across all goal list pages
 */
export function useGoalListWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Register this query client
    queryClients.add(queryClient);
    subscriberCount++;

    // If already connected, just increment counter
    if (broadcastWs?.readyState === WebSocket.OPEN) {
      return () => {
        queryClients.delete(queryClient);
        subscriberCount--;

        if (subscriberCount === 0) {
          isConnecting = false;

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }

          if (broadcastWs) {
            const ws = broadcastWs;
            broadcastWs = null;

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
    if (isConnecting || broadcastWs) {
      return () => {
        queryClients.delete(queryClient);
        subscriberCount--;
      };
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("[GoalList WS] No auth token found");
      return;
    }

    const connectWebSocket = () => {
      if (isConnecting || broadcastWs) return;
      isConnecting = true;

      const wsProtocol =
        window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost =
        (window as any).APP_CONFIG?.WS_URL || import.meta.env.VITE_WS_URL;

      if (!wsHost) {
        console.error(
          "[GoalList WS] No WebSocket URL configured. Please set VITE_WS_URL in .env file",
        );
        isConnecting = false;
        return;
      }

      const wsUrl = wsHost
        .replace(/^https?:/, wsProtocol.replace(":", ""))
        .replace(/\/$/, "");

      const params = new URLSearchParams({
        channel: "goal_list",
        token: token,
      });

      const fullUrl = `${wsUrl}/api/v1/ws/goal/broadcast?${params.toString()}`;

      const ws = new WebSocket(fullUrl);
      broadcastWs = ws;

      ws.onopen = () => {
        isConnecting = false;
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error("[GoalList WS] Failed to parse message:", error);
          return;
        }

        try {
          if (message.type === "goal_updated") {
            // Invalidate goal lists so they refetch
            queryClients.forEach((qc) => {
              qc.invalidateQueries({ queryKey: goalKeys.lists() });
            });
          }

          if (message.type === "evidence_transitioned") {
            // Evidence transitions may change goal progress
            queryClients.forEach((qc) => {
              qc.invalidateQueries({ queryKey: goalKeys.lists() });
              qc.invalidateQueries({
                queryKey: [...goalKeys.all, "approvals"],
              });
            });
          }

          if (message.type === "metric_batch_transitioned") {
            // Metric batch transitions affect batch list and potentially goal progress
            queryClients.forEach((qc) => {
              qc.invalidateQueries({ queryKey: goalKeys.metricBatches() });
              qc.invalidateQueries({ queryKey: goalKeys.lists() });
            });
          }
        } catch (error) {
          console.error(
            "[GoalList WS] Failed to handle message:",
            error,
            message,
          );
        }
      };

      ws.onerror = () => {
        isConnecting = false;
      };

      ws.onclose = (event) => {
        broadcastWs = null;
        isConnecting = false;

        const isExpectedClosure =
          event.code === 1000 || event.code === 1001 || subscriberCount === 0;

        if (isExpectedClosure) {
          return;
        }

        // Unexpected disconnection - try to reconnect
        if (subscriberCount > 0 && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts += 1;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts),
            30000,
          );

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

        if (broadcastWs) {
          const ws = broadcastWs;
          broadcastWs = null;

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
