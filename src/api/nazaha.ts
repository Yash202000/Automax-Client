// Nazaha-only API. Create and edit use the generic incident API.
import { apiClient } from "./client";
import type { ApiResponse, LookupValue } from "../types";

// One option of the previous reports dropdown.
export interface CallerPreviousReport {
  id: string;
  incident_number: string;
  created_at: string;
  classification_name: string;
  classification_name_ar: string;
  status_name: string;
  status_name_ar: string;
}

export interface ReporterDetails {
  reporter_name: string;
  reporter_phone: string;
  reporter_email: string;
  reporter_national_id: string;
  reporter_nationality?: LookupValue;
  reporter_gender: string;
  reporter_address: string;
}

export const nazahaApi = {
  listPreviousReports: async (
    callerNumber: string,
  ): Promise<ApiResponse<CallerPreviousReport[]>> => {
    const response = await apiClient.get<ApiResponse<CallerPreviousReport[]>>(
      "/incidents/previous-reports",
      { params: { caller_number: callerNumber } },
    );
    return response.data;
  },

  // Every call is recorded in the activity log.
  revealReporter: async (
    incidentId: string,
  ): Promise<ApiResponse<ReporterDetails>> => {
    const response = await apiClient.get<ApiResponse<ReporterDetails>>(
      `/incidents/${incidentId}/reporter`,
    );
    return response.data;
  },
};
