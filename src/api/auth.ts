import apiClient from "./client";
import type {
  ApiResponse,
  AuthResponse,
  AuthLoginResponse,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  User,
} from "../types";

export interface ForgotPasswordRequest {
  value: string;
  channel: "sms" | "email";
}

export interface ForgotPasswordResponse {
  sessionID: string;
}

export interface VerifyResetOtpRequest {
  value: string;
  channel: "sms" | "email";
  session_id: string;
  otp: string;
}

export interface VerifyResetOtpResponse {
  resetToken: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export const authApi = {
  login: async (
    data: LoginRequest,
  ): Promise<ApiResponse<AuthLoginResponse>> => {
    const response = await apiClient.post<ApiResponse<AuthLoginResponse>>(
      "/auth/login",
      data,
    );
    return response.data;
  },

  register: async (
    data: RegisterRequest,
  ): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/register",
      data,
    );
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>("/auth/logout");
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>("/users/me");
    return response.data;
  },

  updateProfile: async (
    data: UpdateProfileRequest,
  ): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<ApiResponse<User>>("/users/me", data);
    return response.data;
  },

  changePassword: async (
    data: ChangePasswordRequest,
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.put<ApiResponse<null>>(
      "/users/me/password",
      data,
    );
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<ApiResponse<User>> => {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await apiClient.post<ApiResponse<User>>(
      "/users/me/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  deleteAccount: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>("/users/me");
    return response.data;
  },
  forgotPassword: async (
    data: ForgotPasswordRequest,
  ): Promise<ApiResponse<ForgotPasswordResponse>> => {
    const response = await apiClient.post<ApiResponse<ForgotPasswordResponse>>(
      "/auth/forgot-password",
      data,
    );
    return response.data;
  },

  verifyResetOtp: async (
    data: VerifyResetOtpRequest,
  ): Promise<ApiResponse<VerifyResetOtpResponse>> => {
    const response = await apiClient.post<ApiResponse<VerifyResetOtpResponse>>(
      "/auth/verify-reset-otp",
      data,
    );
    return response.data;
  },

  resetPassword: async (
    data: ResetPasswordRequest,
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(
      "/auth/reset-password",
      data,
    );
    return response.data;
  },
};
