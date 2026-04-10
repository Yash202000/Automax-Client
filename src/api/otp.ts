import apiClient from "./client";
import type { OtpSendRequest, OtpVerifyRequest, User } from "../types";

// Send OTP: returns { message, session_id } directly
export interface OtpSendResult {
  message: string;
  session_id: string;
}

// Verify OTP: returns standard ApiResponse with tokens + user
export interface OtpVerifyResult {
  success: boolean;
  message: string;
  data?: {
    token: string;
    refresh_token: string;
    expires_in: number;
    user: User;
  };
}

export const otpApi = {
  send: async (data: OtpSendRequest): Promise<OtpSendResult> => {
    const response = await apiClient.post<OtpSendResult>("/otp/send", data);
    return response.data;
  },

  verify: async (data: OtpVerifyRequest): Promise<OtpVerifyResult> => {
    const response = await apiClient.post<OtpVerifyResult>("/otp/verify", data);
    return response.data;
  },
};
