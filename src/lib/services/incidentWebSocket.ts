import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface WSMessage {
  type: string;
  incident_id: string;
  data: any;
  user_id: string;
  timestamp: number;
}

// Singleton connections per incident to prevent duplicates
const incidentConnections = new Map<string, {
  ws: WebSocket;
  subscriberCount: number;
  queryClients: Set<any>;
  reconnectTimeout: number | null;
  reconnectAttempts: number;
  isConnecting: boolean;
}>();

const maxReconnectAttempts = 5;

/**
 * WebSocket hook for real-time incident updates
 * Uses singleton connections per incident (shared across components viewing same incident)
 */
export function useIncidentWebSocket(
  incidentId: string | undefined,
  userId: string | undefined
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!incidentId || !userId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[WebSocket] No auth token found');
      return;
    }

    // Get or create connection state for this incident
    let connState = incidentConnections.get(incidentId);

    if (connState) {
      // Existing connection for this incident
      connState.subscriberCount++;
      connState.queryClients.add(queryClient);

      return () => {
        const state = incidentConnections.get(incidentId);
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
              // Remove event handlers to prevent error toasts during intentional close
              ws.onerror = null;
              ws.onclose = null;

              if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'No more subscribers');
              } else if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => ws.close(1000, 'No more subscribers');
              }
            }

            incidentConnections.delete(incidentId);
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
    incidentConnections.set(incidentId, connState);

    const connectWebSocket = () => {
      const state = incidentConnections.get(incidentId);
      if (!state || state.isConnecting) return;

      state.isConnecting = true;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use runtime config (Docker) if available, otherwise use build-time config
      const wsHost = (window as any).APP_CONFIG?.WS_URL || import.meta.env.VITE_WS_URL;

      if (!wsHost) {
        console.error('[WebSocket] No WebSocket URL configured. Please set VITE_WS_URL in .env file');
        state.isConnecting = false;
        return;
      }

      const wsUrl = wsHost.replace(/^https?:/, wsProtocol.replace(':', '')).replace(/\/$/, '');

      // Get user info from localStorage or auth store
      const userStr = localStorage.getItem('user');
      let userName = 'Unknown User';
      try {
        if (userStr) {
          const user = JSON.parse(userStr);
          userName = user.username || user.email || 'Unknown User';
        }
      } catch (e) {
        console.warn('[WebSocket] Failed to parse user info');
      }

      const params = new URLSearchParams({
        incident_id: incidentId,
        user_id: userId,
        user_name: userName,
        token: token,
      });

      const fullUrl = `${wsUrl}/api/v1/ws?${params.toString()}`;

      const ws = new WebSocket(fullUrl);
      state.ws = ws;

      ws.onopen = () => {
        state.isConnecting = false;
        state.reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        let message: WSMessage;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
          return;
        }


        // Update all query clients subscribed to this incident
        state.queryClients.forEach((qc) => {
          // Handle different message types
          switch (message.type) {
            case 'incident_updated':
              toast.info('Incident Updated', {
                description: 'This incident was just updated by another user.',
                duration: 4000,
              });
              qc.invalidateQueries({ queryKey: ['incident', incidentId] });
              break;

            case 'state_changed':
              const data = message.data as any;
              // Only show toast if we have valid state data
              if (data?.from_state && data?.to_state) {
                toast.success('State Changed', {
                  description: `Status changed from ${data.from_state} to ${data.to_state}`,
                  duration: 5000,
                });
              }
              qc.invalidateQueries({ queryKey: ['incident', incidentId] });
              qc.invalidateQueries({ queryKey: ['incident', incidentId, 'transitions'] });
              qc.invalidateQueries({ queryKey: ['incident', incidentId, 'available-transitions'] });
              break;

            case 'comment_added':
              toast.info('New Comment', {
                description: 'A new comment was added to this incident.',
                duration: 4000,
              });
              qc.invalidateQueries({ queryKey: ['incident', incidentId, 'comments'] });
              qc.invalidateQueries({ queryKey: ['incident', incidentId] });
              break;

            case 'attachment_added':
              toast.info('New Attachment', {
                description: 'A new file was attached to this incident.',
                duration: 4000,
              });
              qc.invalidateQueries({ queryKey: ['incident', incidentId, 'attachments'] });
              qc.invalidateQueries({ queryKey: ['incident', incidentId] });
              break;

            case 'user_joined':
              const joinData = message.data as any;
              // Only show toast if we have valid user data and it's not the current user
              if (joinData?.user_name && joinData.user_name !== 'Unknown User' && joinData.user_id !== userId) {
                toast.info('User Joined', {
                  description: `${joinData.user_name} is now viewing this incident`,
                  duration: 3000,
                });
              }
              qc.invalidateQueries({ queryKey: ['incident-presence', incidentId] });
              break;

            case 'user_left':
              const leftData = message.data as any;
              // Only show toast if we have valid user data and it's not the current user
              if (leftData?.user_name && leftData.user_name !== 'Unknown User' && leftData.user_id !== userId) {
                toast.info('User Left', {
                  description: `${leftData.user_name} stopped viewing this incident`,
                  duration: 3000,
                });
              }
              qc.invalidateQueries({ queryKey: ['incident-presence', incidentId] });
              break;

            default:
          }
        });
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        state.isConnecting = false;
        // Don't show error toast here - wait for onclose to determine if it's a real error
      };

      ws.onclose = (event) => {
        state.isConnecting = false;

        // Normal closures (1000 = normal, 1001 = going away, 1006 can happen during navigation)
        const isExpectedClosure = event.code === 1000 || event.code === 1001 || state.subscriberCount === 0;

        if (isExpectedClosure) {
          // Clean disconnect during navigation or manual close - no action needed
          return;
        }

        // Unexpected disconnection - show error and try to reconnect
        if (state.subscriberCount > 0 && state.reconnectAttempts < maxReconnectAttempts) {
          state.reconnectAttempts += 1;
          const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);


          // Only show error toast on first reconnect attempt
          if (state.reconnectAttempts === 1) {
            toast.error('Connection Lost', {
              description: 'Attempting to reconnect...',
              duration: 3000,
            });
          }

          state.reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (state.reconnectAttempts >= maxReconnectAttempts) {
          toast.error('Connection Lost', {
            description: 'Failed to reconnect. Please refresh the page.',
            duration: 10000,
          });
        }
      };
    };

    // Initial connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      const state = incidentConnections.get(incidentId);
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
            // Remove event handlers to prevent error toasts during intentional close
            ws.onerror = null;
            ws.onclose = null;

            // Only close if connection is active
            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1000, 'No more subscribers');
            } else if (ws.readyState === WebSocket.CONNECTING) {
              // Wait for open then close immediately
              ws.onopen = () => ws.close(1000, 'No more subscribers');
            }
          }

          incidentConnections.delete(incidentId);
        }
      }
    };
  }, [incidentId, userId, queryClient]);
}
