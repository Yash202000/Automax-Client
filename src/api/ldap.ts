import apiClient from "./client";
import type { ApiResponse, User } from "../types";

export interface LDAPLoginRequest {
  username: string;
  password: string;
}

export interface LDAPLoginResponse {
  user: User;
  token: string;
  refresh_token?: string;
  expires_in?: number;
  source: string;
}

// Returned by /ldap/login instead of tokens when AD-Baseer (OTP) login is on.
export interface ADOtpChallenge {
  otp_required: true;
  challenge_id: string;
  expires_in: number;
  source: string;
}

export interface ADVerifyOtpRequest {
  challenge_id: string;
  otp: string;
}

export const isADOtpChallenge = (
  data: LDAPLoginResponse | ADOtpChallenge | undefined,
): data is ADOtpChallenge =>
  !!data && (data as ADOtpChallenge).otp_required === true;

export interface LDAPUserListItem {
  dn: string;
  username: string;
  display_name: string;
  upn: string;
  email: string;
  phone?: string;
}

export interface LDAPSearchRequest {
  username: string;
}

export interface LDAPSearchResponse {
  found: boolean;
  user?: {
    dn: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    department: string;
    title: string;
    groups?: string[];
  };
  message?: string;
}

export const ldapApi = {
  login: async (
    data: LDAPLoginRequest,
  ): Promise<ApiResponse<LDAPLoginResponse | ADOtpChallenge>> => {
    const response = await apiClient.post<
      ApiResponse<LDAPLoginResponse | ADOtpChallenge>
    >("/ldap/login", data);
    return response.data;
  },

  verifyOtp: async (
    data: ADVerifyOtpRequest,
  ): Promise<ApiResponse<LDAPLoginResponse>> => {
    const response = await apiClient.post<ApiResponse<LDAPLoginResponse>>(
      "/ldap/login/verify-otp",
      data,
    );
    return response.data;
  },

  fetchUsers: async (): Promise<ApiResponse<LDAPUserListItem[]>> => {
    const response =
      await apiClient.post<ApiResponse<LDAPUserListItem[]>>("/ldap/users");
    return response.data;
  },

  // Whether the AD directory can be browsed over LDAP ("Add AD User" picker).
  // enabled: LDAP directory can be browsed; ad_users: AD users can be created.
  directoryStatus: async (): Promise<
    ApiResponse<{ enabled: boolean; ad_users: boolean }>
  > => {
    const response = await apiClient.get<
      ApiResponse<{ enabled: boolean; ad_users: boolean }>
    >("/ldap/directory-status");
    return response.data;
  },

  register: async (data: LDAPSearchRequest): Promise<ApiResponse<User>> => {
    const response = await apiClient.post<ApiResponse<User>>(
      "/ldap/register",
      data,
    );
    return response.data;
  },
};
