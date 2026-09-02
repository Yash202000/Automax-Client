import apiClient from "./client";
import type { ApiResponse } from "../types";
import type { IntegrationExecutionLog } from "./integration";

// Mirrors internal/models/momra_status_mapping.go
export interface MOMRAStatusMapping {
  id: string;
  workflow_id: string;
  state_id: string;
  state?: { id: string; name: string; code: string };
  case_status_id: string;
  is_closure_status: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MOMRAStatusMappingRequest {
  workflow_id: string;
  state_id: string;
  case_status_id: string;
  is_closure_status: boolean;
  is_active?: boolean;
}

// Mirrors internal/services/momra_sync_service.go result structs
export interface ClassificationSyncResult {
  main_created: number;
  main_updated: number;
  sub_created: number;
  sub_updated: number;
  special_created: number;
  special_updated: number;
}

export interface ExternalEntitySyncResult {
  created: number;
  updated: number;
}

export interface EEClassificationSyncResult {
  entities_linked: number;
  total_links: number;
  skipped_ees?: string[];
}

export interface MOMRASyncAllResult {
  classifications: ClassificationSyncResult;
  external_entities: ExternalEntitySyncResult;
  external_entity_classifications: EEClassificationSyncResult;
}

export interface MOMRAStatusSyncLogsResponse {
  logs: IntegrationExecutionLog[];
  total: number;
  limit: number;
  offset: number;
}

export const momraApi = {
  // Sync triggers (docs/MOMRA_Outbound_Integration_Spec_v1.0.md §4-6)
  syncClassifications: () =>
    apiClient.post<ApiResponse<ClassificationSyncResult>>(
      "/admin/momra/sync/classifications",
    ),
  syncExternalEntities: () =>
    apiClient.post<ApiResponse<ExternalEntitySyncResult>>(
      "/admin/momra/sync/external-entities",
    ),
  syncExternalEntityClassifications: () =>
    apiClient.post<ApiResponse<EEClassificationSyncResult>>(
      "/admin/momra/sync/external-entity-classifications",
    ),
  syncAll: () =>
    apiClient.post<ApiResponse<MOMRASyncAllResult>>("/admin/momra/sync/all"),

  // Status mapping CRUD (Story A)
  listStatusMappings: (workflowId: string) =>
    apiClient.get<ApiResponse<MOMRAStatusMapping[]>>(
      `/admin/momra/status-mappings?workflow_id=${workflowId}`,
    ),
  createStatusMapping: (req: MOMRAStatusMappingRequest) =>
    apiClient.post<ApiResponse<MOMRAStatusMapping>>(
      "/admin/momra/status-mappings",
      req,
    ),
  updateStatusMapping: (id: string, req: MOMRAStatusMappingRequest) =>
    apiClient.put<ApiResponse<MOMRAStatusMapping>>(
      `/admin/momra/status-mappings/${id}`,
      req,
    ),
  deleteStatusMapping: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/momra/status-mappings/${id}`),

  // Status sync logs + manual retry (Story B/C)
  listStatusSyncLogs: (limit = 50, offset = 0) =>
    apiClient.get<ApiResponse<MOMRAStatusSyncLogsResponse>>(
      `/admin/momra/status-sync/logs?limit=${limit}&offset=${offset}`,
    ),
  retryStatusSync: (logId: string) =>
    apiClient.post<ApiResponse<null>>(
      `/admin/momra/status-sync/logs/${logId}/retry`,
    ),
};
