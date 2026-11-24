import apiClient from "./client";
import type { OtpSendRequest, OtpVerifyRequest, User } from "../types";

// Send OTP: returns { message, session_id } directly
export interface OtpSendResult {
  message: string;
  session_id: string;
  success: boolean;
  error?: string;
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

// Error text for a failed OTP send. A 503 means the SMS/WhatsApp provider is
// down; its raw message isn't meant for users, so show the fallback instead.
export const getOtpSendErrorMessage = (err: unknown, fallback: string) => {
  const response = (
    err as {
      response?: {
        status?: number;
        data?: { error?: string; message?: string };
      };
    }
  )?.response;
  if (response?.status === 503) return fallback;
  return response?.data?.error || response?.data?.message || fallback;
};

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
