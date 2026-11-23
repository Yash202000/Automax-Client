import apiClient from "./client";
import type { ApiResponse, User } from "../types";

// National ID login through Nafath: start sends a Nafath request, status is
// polled every poll_interval seconds; the number stays the same until Nafath
// reports the request approved, rejected or expired.
export interface NafathPending {
  status: "waiting";
  challenge_id: string;
  random: string;
  poll_interval: number;
}

export interface NafathApproved {
  status: "approved";
  user: User;
  token: string;
  refresh_token?: string;
  expires_in?: number;
}

export type NafathStatus = NafathPending | NafathApproved;

export const nafathApi = {
  start: async (nationalId: string): Promise<ApiResponse<NafathPending>> => {
    const response = await apiClient.post<ApiResponse<NafathPending>>(
      "/auth/nafath/start",
      { national_id: nationalId },
    );
    return response.data;
  },

  status: async (challengeId: string): Promise<ApiResponse<NafathStatus>> => {
    const response = await apiClient.post<ApiResponse<NafathStatus>>(
      "/auth/nafath/status",
      { challenge_id: challengeId },
    );
    return response.data;
  },

  cancel: async (challengeId: string): Promise<void> => {
    await apiClient.post("/auth/nafath/cancel", { challenge_id: challengeId });
  },
};
