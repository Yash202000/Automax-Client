import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { goalKeys } from "../../hooks/useGoals";

interface GoalWSMessage {
  type: string;
  goal_id: string;
  data: any;
  user_id: string;
  timestamp: number;
}

// Singleton connections per goal to prevent duplicates
const goalConnections = new Map<
  string,
  {
    ws: WebSocket;
    subscriberCount: number;
    queryClients: Set<any>;
    reconnectTimeout: number | null;
    reconnectAttempts: number;
    isConnecting: boolean;
  }
>();

const maxReconnectAttempts = 5;

/**
 * WebSocket hook for real-time goal updates
 * Uses singleton connections per goal (shared across components viewing same goal)
 */
export function useGoalWebSocket(
  goalId: string | undefined,
  userId: string | undefined,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!goalId || !userId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("[GoalWS] No auth token found");
      return;
    }

    // Get or create connection state for this goal
    let connState = goalConnections.get(goalId);

    if (connState) {
      // Existing connection for this goal
      connState.subscriberCount++;
      connState.queryClients.add(queryClient);

      return () => {
        const state = goalConnections.get(goalId);
        if (state) {
          state.subscriberCount--;
          state.queryClients.delete(queryClient);

          if (state.subscriberCount === 0) {
            state.isConnecting = false;

            if (state.reconnectTimeout) {
              clearTimeout(state.reconnectTimeout);
              state.reconnectTimeout = null;
            }

            if (state.ws) {
              const ws = state.ws;
              ws.onerror = null;
              ws.onclose = null;

              if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, "No more subscribers");
              } else if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => ws.close(1000, "No more subscribers");
              }
            }

            goalConnections.delete(goalId);
          }
        }
      };
    }

    // Create new connection state
    connState = {
      ws: null as any,
      subscriberCount: 1,
      queryClients: new Set([queryClient]),
      reconnectTimeout: null,
      reconnectAttempts: 0,
      isConnecting: false,
    };
    goalConnections.set(goalId, connState);

    const connectWebSocket = () => {
      const state = goalConnections.get(goalId);
      if (!state || state.isConnecting) return;

      state.isConnecting = true;

      const wsProtocol =
        window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost =
        (window as any).APP_CONFIG?.WS_URL || import.meta.env.VITE_WS_URL;

      if (!wsHost) {
        console.error(
          "[GoalWS] No WebSocket URL configured. Please set VITE_WS_URL in .env file",
        );
        state.isConnecting = false;
        return;
      }

      const wsUrl = wsHost
        .replace(/^https?:/, wsProtocol.replace(":", ""))
        .replace(/\/$/, "");

      // Get user info from localStorage
      const userStr = localStorage.getItem("user");
      let userName = "Unknown User";
      try {
        if (userStr) {
          const user = JSON.parse(userStr);
          userName = user.username || user.email || "Unknown User";
        }
      } catch {
        console.warn("[GoalWS] Failed to parse user info");
      }

      const params = new URLSearchParams({
        goal_id: goalId,
        user_id: userId,
        user_name: userName,
        token: token,
      });

      const fullUrl = `${wsUrl}/api/v1/ws/goal?${params.toString()}`;
      const ws = new WebSocket(fullUrl);
      state.ws = ws;

      ws.onopen = () => {
        state.isConnecting = false;
        state.reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        let message: GoalWSMessage;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error("[GoalWS] Failed to parse message:", error);
          return;
        }

        // Update all query clients subscribed to this goal
        state.queryClients.forEach((qc) => {
          switch (message.type) {
            case "goal_updated":
              toast.info("Goal Updated", {
                description:
                  "This goal was just updated by another user.",
                duration: 4000,
              });
              qc.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
              break;

            case "evidence_created":
              toast.info("New Evidence", {
                description: `New evidence "${message.data?.title || ""}" has been uploaded.`,
                duration: 4000,
              });
              qc.invalidateQueries({
                queryKey: goalKeys.evidences(goalId),
              });
              qc.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
              break;

            case "evidence_transitioned": {
              const data = message.data;
              toast.success("Evidence Status Changed", {
                description: `Evidence status changed to ${data?.status || "unknown"}`,
                duration: 5000,
              });
              qc.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
              qc.invalidateQueries({
                queryKey: goalKeys.evidences(goalId),
              });
              if (data?.evidence_id) {
                qc.invalidateQueries({
                  queryKey: goalKeys.evidenceTransitions(data.evidence_id),
                });
                qc.invalidateQueries({
                  queryKey: goalKeys.evidenceTransitionHistory(
                    data.evidence_id,
                  ),
                });
              }
              break;
            }

            case "check_in_created":
              toast.info("New Check-in", {
                description:
                  "A new check-in has been recorded for this goal.",
                duration: 4000,
              });
              qc.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
              // Invalidate all check-in pages for this goal
              qc.invalidateQueries({
                queryKey: [...goalKeys.all, "check-ins", goalId],
              });
              break;

            case "metric_batch_transitioned": {
              const batchData = message.data;
              toast.success("Metric Import Status Changed", {
                description: `Batch status changed to ${batchData?.status || "unknown"}`,
                duration: 5000,
              });
              qc.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
              qc.invalidateQueries({ queryKey: goalKeys.metricBatches() });
              if (batchData?.batch_id) {
                qc.invalidateQueries({
                  queryKey: goalKeys.metricBatch(batchData.batch_id),
                });
                qc.invalidateQueries({
                  queryKey: goalKeys.metricBatchTransitions(
                    batchData.batch_id,
                  ),
                });
                qc.invalidateQueries({
                  queryKey: goalKeys.metricBatchHistory(
                    batchData.batch_id,
                  ),
                });
              }
              break;
            }

            case "collaborator_changed":
              toast.info("Collaborators Updated", {
                description: "Goal collaborators have been changed.",
                duration: 4000,
              });
              qc.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
              break;

            default:
          }
        });
      };

      ws.onerror = () => {
        state.isConnecting = false;
      };

      ws.onclose = (event) => {
        state.isConnecting = false;

        const isExpectedClosure =
          event.code === 1000 ||
          event.code === 1001 ||
          state.subscriberCount === 0;

        if (isExpectedClosure) {
          return;
        }

        // Unexpected disconnection - try to reconnect
        if (
          state.subscriberCount > 0 &&
          state.reconnectAttempts < maxReconnectAttempts
        ) {
          state.reconnectAttempts += 1;
          const delay = Math.min(
            1000 * Math.pow(2, state.reconnectAttempts),
            30000,
          );

          if (state.reconnectAttempts === 1) {
            toast.error("Connection Lost", {
              description: "Attempting to reconnect...",
              duration: 3000,
            });
          }

          state.reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (state.reconnectAttempts >= maxReconnectAttempts) {
          toast.error("Connection Lost", {
            description: "Failed to reconnect. Please refresh the page.",
            duration: 10000,
          });
        }
      };
    };

    // Initial connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      const state = goalConnections.get(goalId);
      if (state) {
        state.subscriberCount--;
        state.queryClients.delete(queryClient);

        if (state.subscriberCount === 0) {
          state.isConnecting = false;

          if (state.reconnectTimeout) {
            clearTimeout(state.reconnectTimeout);
            state.reconnectTimeout = null;
          }

          if (state.ws) {
            const ws = state.ws;
            ws.onerror = null;
            ws.onclose = null;

            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1000, "No more subscribers");
            } else if (ws.readyState === WebSocket.CONNECTING) {
              ws.onopen = () => ws.close(1000, "No more subscribers");
            }
          }

          goalConnections.delete(goalId);
        }
      }
    };
  }, [goalId, userId, queryClient]);
}
