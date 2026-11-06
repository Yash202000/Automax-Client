import { apiClient } from "./client";
import type {
  ApiResponse,
  ErrorLog,
  ErrorLogFilter,
  ErrorLogStatus,
  PaginatedResponse,
} from "../types";

const BuildParams = (filter: ErrorLogFilter): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  return params;
};

export interface ReportErrorPayload {
  module:
    | "import"
    | "attachment"
    | "incident"
    | "integration"
    | "contact"
    | "auth";
  action: string;
  error_type?: string;
  severity?: "low" | "medium" | "high";
  message: string;
  details?: string;
  related_type?: string;
  related_id?: string;
  related_label?: string;
}

export const errorLogApi = {
  // Reports an error found in the browser (it never reached the API) to the Error Log.
  // Fire-and-forget: it must never block or break the user's action.
  Report: async (payload: ReportErrorPayload): Promise<void> => {
    try {
      await apiClient.post("/error-logs/report", payload);
    } catch {
      // ignore: logging must never affect the user
    }
  },

  List: async (
    filter: ErrorLogFilter = {},
  ): Promise<PaginatedResponse<ErrorLog>> => {
    const response = await apiClient.get<PaginatedResponse<ErrorLog>>(
      `/error-logs?${BuildParams(filter).toString()}`,
    );
    return response.data;
  },

  // Users that appear in the error log (for the User filter)
  Users: async (): Promise<ApiResponse<{ id: string; name: string }[]>> => {
    const response =
      await apiClient.get<ApiResponse<{ id: string; name: string }[]>>(
        "/error-logs/users",
      );
    return response.data;
  },

  GetById: async (id: string): Promise<ApiResponse<ErrorLog>> => {
    const response = await apiClient.get<ApiResponse<ErrorLog>>(
      `/error-logs/${id}`,
    );
    return response.data;
  },

  UpdateStatus: async (
    id: string,
    status: ErrorLogStatus,
    note?: string,
  ): Promise<ApiResponse<ErrorLog>> => {
    const response = await apiClient.put<ApiResponse<ErrorLog>>(
      `/error-logs/${id}/status`,
      { status, note },
    );
    return response.data;
  },

  // Downloads the filtered list as CSV (same masking as the screen).
  Export: async (filter: ErrorLogFilter = {}): Promise<Blob> => {
    const params = BuildParams(filter);
    params.delete("page");
    params.delete("limit");
    const response = await apiClient.get(
      `/error-logs/export?${params.toString()}`,
      { responseType: "blob" },
    );
    return response.data as Blob;
  },
};
