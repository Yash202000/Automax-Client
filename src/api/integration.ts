import apiClient from "./client";
import type { ApiResponse } from "../types";

export interface IntegrationVariable {
  id: string;
  name: string;
  description: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
  created_by_id?: string;
}

export interface IntegrationVariableCreateRequest {
  name: string;
  description?: string;
  value: string;
  is_secret?: boolean;
}

export interface IntegrationScript {
  id: string;
  name: string;
  description: string;
  script_type: "http_request" | "javascript";
  script_content: string;
  auth_config: string;
  bridge_config: string;
  is_active: boolean;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationScriptRequest {
  name: string;
  description?: string;
  script_type: "http_request" | "javascript";
  script_content: string;
  auth_config?: string;
  bridge_config?: string;
  is_active?: boolean;
}

export interface ScriptBridgeConfig {
  remote_system_name: string;
  remote_system_url: string;
  response_id_field: string;
  response_number_field: string;
}

export interface IncidentBridge {
  id: string;
  local_incident_id: string;
  remote_system_name: string;
  remote_system_url: string;
  remote_incident_id: string;
  remote_incident_number: string;
  direction: "outbound" | "inbound";
  status: "open" | "closed" | "error";
  integration_script_id?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface WebhookCallbackConfig {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  action_mappings: string;
  state_code_mappings: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookCallbackConfigRequest {
  name: string;
  description?: string;
  is_active?: boolean;
  shared_secret: string;
  action_mappings?: string;
  state_code_mappings?: string;
}

export interface WorkflowStateTrigger {
  id: string;
  workflow_state_id: string;
  integration_script_id: string;
  integration_script?: IntegrationScript;
  trigger_on: "enter" | "exit" | "both";
  field_mappings: string;
  execution_order: number;
  is_async: boolean;
  is_active: boolean;
  classifications?: { id: string; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowStateTriggerRequest {
  integration_script_id: string;
  trigger_on: "enter" | "exit" | "both";
  field_mappings?: string;
  execution_order?: number;
  is_async?: boolean;
  is_active?: boolean;
  classification_ids?: string[];
}

export interface WorkflowTransitionTrigger {
  id: string;
  workflow_transition_id: string;
  integration_script_id: string;
  integration_script?: IntegrationScript;
  field_mappings: string;
  execution_order: number;
  is_async: boolean;
  is_active: boolean;
  classifications?: { id: string; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowTransitionTriggerRequest {
  integration_script_id: string;
  field_mappings?: string;
  execution_order?: number;
  is_async?: boolean;
  is_active?: boolean;
  classification_ids?: string[];
}

export interface IntegrationExecutionLog {
  id: string;
  integration_script_id: string;
  script_name?: string;
  incident_id: string;
  incident_number: string;
  trigger_type: string;
  trigger_ref_id: string;
  trigger_ref_name: string;
  status: "pending" | "running" | "success" | "failed" | "timeout";
  request_payload: string;
  response_body: string;
  status_code: number;
  error_message: string;
  duration_ms: number;
  executed_at: string;
  completed_at?: string;
}

export interface IntegrationLogsResponse {
  logs: IntegrationExecutionLog[];
  total: number;
  limit: number;
  offset: number;
}

export const integrationApi = {
  // Variables
  createVariable: (req: IntegrationVariableCreateRequest) =>
    apiClient.post<ApiResponse<IntegrationVariable>>(
      "/admin/integration-variables",
      req,
    ),
  listVariables: () =>
    apiClient.get<ApiResponse<IntegrationVariable[]>>(
      "/admin/integration-variables",
    ),
  deleteVariable: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/integration-variables/${id}`),

  // Scripts
  createScript: (req: IntegrationScriptRequest) =>
    apiClient.post<ApiResponse<IntegrationScript>>(
      "/admin/integration-scripts",
      req,
    ),
  listScripts: (activeOnly = false) =>
    apiClient.get<ApiResponse<IntegrationScript[]>>(
      `/admin/integration-scripts?active_only=${activeOnly}`,
    ),
  getScript: (id: string) =>
    apiClient.get<ApiResponse<IntegrationScript>>(
      `/admin/integration-scripts/${id}`,
    ),
  updateScript: (id: string, req: IntegrationScriptRequest) =>
    apiClient.put<ApiResponse<IntegrationScript>>(
      `/admin/integration-scripts/${id}`,
      req,
    ),
  deleteScript: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/integration-scripts/${id}`),
  testScript: (id: string, incidentId: string) =>
    apiClient.post<ApiResponse<IntegrationExecutionLog>>(
      `/admin/integration-scripts/${id}/test`,
      { incident_id: incidentId },
    ),
  listScriptLogs: (id: string, limit = 50, offset = 0) =>
    apiClient.get<ApiResponse<IntegrationLogsResponse>>(
      `/admin/integration-scripts/${id}/logs?limit=${limit}&offset=${offset}`,
    ),

  // State triggers
  createStateTrigger: (stateId: string, req: WorkflowStateTriggerRequest) =>
    apiClient.post<ApiResponse<WorkflowStateTrigger>>(
      `/admin/workflow-states/${stateId}/triggers`,
      req,
    ),
  listStateTriggers: (stateId: string) =>
    apiClient.get<ApiResponse<WorkflowStateTrigger[]>>(
      `/admin/workflow-states/${stateId}/triggers`,
    ),
  updateStateTrigger: (
    stateId: string,
    triggerId: string,
    req: WorkflowStateTriggerRequest,
  ) =>
    apiClient.put<ApiResponse<WorkflowStateTrigger>>(
      `/admin/workflow-states/${stateId}/triggers/${triggerId}`,
      req,
    ),
  deleteStateTrigger: (stateId: string, triggerId: string) =>
    apiClient.delete<ApiResponse<null>>(
      `/admin/workflow-states/${stateId}/triggers/${triggerId}`,
    ),

  // Transition triggers
  createTransitionTrigger: (
    transitionId: string,
    req: WorkflowTransitionTriggerRequest,
  ) =>
    apiClient.post<ApiResponse<WorkflowTransitionTrigger>>(
      `/admin/workflow-transitions/${transitionId}/triggers`,
      req,
    ),
  listTransitionTriggers: (transitionId: string) =>
    apiClient.get<ApiResponse<WorkflowTransitionTrigger[]>>(
      `/admin/workflow-transitions/${transitionId}/triggers`,
    ),
  updateTransitionTrigger: (
    transitionId: string,
    triggerId: string,
    req: WorkflowTransitionTriggerRequest,
  ) =>
    apiClient.put<ApiResponse<WorkflowTransitionTrigger>>(
      `/admin/workflow-transitions/${transitionId}/triggers/${triggerId}`,
      req,
    ),
  deleteTransitionTrigger: (transitionId: string, triggerId: string) =>
    apiClient.delete<ApiResponse<null>>(
      `/admin/workflow-transitions/${transitionId}/triggers/${triggerId}`,
    ),

  // Logs by incident
  listIncidentLogs: (incidentId: string, limit = 50, offset = 0) =>
    apiClient.get<ApiResponse<IntegrationLogsResponse>>(
      `/incidents/${incidentId}/integration-logs?limit=${limit}&offset=${offset}`,
    ),

  // Incident bridges
  listIncidentBridges: (incidentId: string) =>
    apiClient.get<ApiResponse<IncidentBridge[]>>(
      `/incidents/${incidentId}/bridges`,
    ),

  // Webhook callback configs
  createWebhookConfig: (req: WebhookCallbackConfigRequest) =>
    apiClient.post<ApiResponse<WebhookCallbackConfig>>(
      "/admin/webhook-configs",
      req,
    ),
  listWebhookConfigs: () =>
    apiClient.get<ApiResponse<WebhookCallbackConfig[]>>(
      "/admin/webhook-configs",
    ),
  updateWebhookConfig: (id: string, req: WebhookCallbackConfigRequest) =>
    apiClient.put<ApiResponse<WebhookCallbackConfig>>(
      `/admin/webhook-configs/${id}`,
      req,
    ),
  deleteWebhookConfig: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/webhook-configs/${id}`),
};
