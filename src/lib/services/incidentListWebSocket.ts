import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ViewerUpdateMessage {
  incident_id: string;
  active_viewers: number;
}

// Singleton WebSocket connection to prevent duplicates
let broadcastWs: WebSocket | null = null;
let isConnecting = false;
let reconnectTimeout: number | null = null;
let reconnectAttempts = 0;
let subscriberCount = 0;
const maxReconnectAttempts = 5;
const queryClients = new Set<any>();

/**
 * WebSocket hook for real-time incident list viewer updates
 * Uses a singleton connection shared across all components
 */
export function useIncidentListWebSocket() {
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

        // Disconnect if no more subscribers
        if (subscriberCount === 0) {
          isConnecting = false;

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }

          if (broadcastWs) {
            const ws = broadcastWs;
            broadcastWs = null;

            // Remove event handlers to prevent errors during intentional close
            ws.onerror = null;
            ws.onclose = null;

            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1000, 'No more subscribers');
            } else if (ws.readyState === WebSocket.CONNECTING) {
              ws.onopen = () => ws.close(1000, 'No more subscribers');
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

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[IncidentList WS] No auth token found');
      return;
    }

    const connectWebSocket = () => {
      if (isConnecting || broadcastWs) return;
      isConnecting = true;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use runtime config (Docker) if available, otherwise use build-time config
      const wsHost = (window as any).APP_CONFIG?.WS_URL || import.meta.env.VITE_WS_URL;

      if (!wsHost) {
        console.error('[IncidentList WS] No WebSocket URL configured. Please set VITE_WS_URL in .env file');
        isConnecting = false;
        return;
      }

      const wsUrl = wsHost.replace(/^https?:/, wsProtocol.replace(':', ''));

      const params = new URLSearchParams({
        channel: 'incident_list',
        token: token,
      });

      const fullUrl = `${wsUrl}/api/v1/ws/broadcast?${params.toString()}`;

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
          console.error('[IncidentList WS] Failed to parse message:', error);
          return;
        }

        try {
          // Handle viewer count updates
          if (message.type === 'viewer_count_update') {
            const data = message.data as ViewerUpdateMessage;

            // Update ALL registered query clients
            queryClients.forEach((qc) => {
              qc.setQueriesData(
                { queryKey: ['incidents'] },
                (oldData: any) => {
                  if (!oldData) return oldData;

                  // Handle different data structures
                  let incidents: any[] = [];

                  if (Array.isArray(oldData)) {
                    incidents = oldData;
                  } else if (Array.isArray(oldData.data)) {
                    incidents = oldData.data;
                  } else {
                    return oldData;
                  }

                  // Update the viewer count for the matching incident
                  const updatedIncidents = incidents.map((incident: any) =>
                    incident.id === data.incident_id
                      ? { ...incident, active_viewers: data.active_viewers }
                      : incident
                  );

                  // Return in the same structure as input
                  if (Array.isArray(oldData)) {
                    return updatedIncidents;
                  } else {
                    return {
                      ...oldData,
                      data: updatedIncidents,
                    };
                  }
                }
              );
            });
          }

          // Handle incident creation
          if (message.type === 'incident_created') {
            const newIncident = message.data.incident;

            // Show notification
            toast.success('New Incident Created', {
              description: `${newIncident.incident_number || 'Incident'} - ${newIncident.title}`,
              duration: 5000,
            });

            // Invalidate and refetch incident list
            queryClients.forEach((qc) => {
              qc.invalidateQueries({ queryKey: ['incidents'] });
            });
          }

          // Handle incident updates (including assignee changes)
          if (message.type === 'incident_updated' || message.type === 'assignee_changed') {
            const updatedIncident = message.data.incident;

            // Show notification for assignee changes
            if (message.type === 'assignee_changed') {
              const assigneeName = updatedIncident.assignee
                ? `${updatedIncident.assignee.first_name} ${updatedIncident.assignee.last_name}`
                : 'Unassigned';

              toast.info('Incident Reassigned', {
                description: `${updatedIncident.incident_number} assigned to ${assigneeName}`,
                duration: 4000,
              });
            }

            // Update the specific incident in the cache
            queryClients.forEach((qc) => {
              qc.setQueriesData(
                { queryKey: ['incidents'] },
                (oldData: any) => {
                  if (!oldData) return oldData;

                  // Handle different data structures
                  let incidents: any[] = [];

                  if (Array.isArray(oldData)) {
                    incidents = oldData;
                  } else if (Array.isArray(oldData.data)) {
                    incidents = oldData.data;
                  } else {
                    return oldData;
                  }

                  // Update the specific incident
                  const updatedIncidents = incidents.map((incident: any) =>
                    incident.id === updatedIncident.id ? updatedIncident : incident
                  );

                  // Return in the same structure as input
                  if (Array.isArray(oldData)) {
                    return updatedIncidents;
                  } else {
                    return {
                      ...oldData,
                      data: updatedIncidents,
                    };
                  }
                }
              );
            });
          }
        } catch (error) {
          console.error('[IncidentList WS] Failed to handle message:', error, message);
        }
      };

      ws.onerror = (error) => {
        console.error('[IncidentList WS] Error:', error);
        isConnecting = false;
        // Don't show error toast here - wait for onclose to determine if it's a real error
      };

      ws.onclose = (event) => {
        broadcastWs = null;
        isConnecting = false;

        // Normal closures or when no more subscribers
        const isExpectedClosure = event.code === 1000 || event.code === 1001 || subscriberCount === 0;

        if (isExpectedClosure) {
          // Clean disconnect - no action needed
          return;
        }

        // Unexpected disconnection - try to reconnect
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

      // Only close if no more subscribers
      if (subscriberCount === 0) {
        isConnecting = false;

        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }

        if (broadcastWs) {
          const ws = broadcastWs;
          broadcastWs = null;

          // Remove event handlers to prevent errors during intentional close
          ws.onerror = null;
          ws.onclose = null;

          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'No more subscribers');
          } else if (ws.readyState === WebSocket.CONNECTING) {
            ws.onopen = () => ws.close(1000, 'No more subscribers');
          }
        }
      }
    };
  }, [queryClient]);
}
