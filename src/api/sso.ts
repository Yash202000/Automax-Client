import apiClient from "./client";
import type {
  ApiResponse,
  AuthResponse,
  AuthLoginResponse,
  SSORegisterRequest,
  SSOLoginRequest,
} from "../types";

interface SSOLaunchResponse {
  redirect_url: string;
  token: string;
}

export const ssoApi = {
  launch: (appLinkId: string): Promise<{ data: SSOLaunchResponse }> =>
    apiClient
      .post<
        ApiResponse<SSOLaunchResponse>
      >("/sso/launch", { app_link_id: appLinkId })
      .then((res) => ({ data: res.data.data as SSOLaunchResponse })),

  signup: async (
    data: SSORegisterRequest,
  ): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/sso/register",
      data,
    );
    return response.data;
  },

  login: async (
    data: SSOLoginRequest,
  ): Promise<ApiResponse<AuthLoginResponse>> => {
    const response = await apiClient.post<ApiResponse<AuthLoginResponse>>(
      "/auth/sso/login",
      data,
    );
    return response.data;
  },
};
