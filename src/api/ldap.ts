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

export interface LDAPUserListItem {
  dn: string;
  username: string;
  display_name: string;
  upn: string;
  email: string;
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
  ): Promise<ApiResponse<LDAPLoginResponse>> => {
    const response = await apiClient.post<ApiResponse<LDAPLoginResponse>>(
      "/ldap/login",
      data,
    );
    return response.data;
  },

  fetchUsers: async (): Promise<ApiResponse<LDAPUserListItem[]>> => {
    const response =
      await apiClient.post<ApiResponse<LDAPUserListItem[]>>("/ldap/users");
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
