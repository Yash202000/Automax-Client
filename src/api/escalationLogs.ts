import { apiClient } from "./client";
import type {
  ApiResponse,
  EscalationLogEntry,
  EscalationLogFilter,
  EscalationLogListData,
} from "../types";

const BuildParams = (filter: EscalationLogFilter): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  return params;
};

export const escalationLogApi = {
  // Escalation log: one entry per recipient, newest first.
  List: async (
    filter: EscalationLogFilter = {},
  ): Promise<ApiResponse<EscalationLogListData>> => {
    const response = await apiClient.get<ApiResponse<EscalationLogListData>>(
      `/escalation/logs?${BuildParams(filter).toString()}`,
    );
    return response.data;
  },

  // Same per-recipient history for one report.
  ByIncident: async (
    incidentId: string,
    limit = 100,
  ): Promise<EscalationLogEntry[]> => {
    const response = await apiClient.get<ApiResponse<EscalationLogListData>>(
      `/escalation/logs?incident_id=${incidentId}&limit=${limit}`,
    );
    return response.data.data?.entries ?? [];
  },

  // Downloads the filtered per-recipient log as a real .xlsx workbook.
  Export: async (filter: EscalationLogFilter = {}): Promise<Blob> => {
    const params = BuildParams(filter);
    params.delete("page");
    params.delete("limit");
    const response = await apiClient.get(
      `/escalation/logs/export?${params.toString()}`,
      { responseType: "blob" },
    );
    return response.data as Blob;
  },
};
