import apiClient from './client';
import type { ApiResponse } from '../types';

interface SSOLaunchResponse {
  redirect_url: string;
  token: string;
}

export const ssoApi = {
  launch: (appLinkId: string): Promise<{ data: SSOLaunchResponse }> =>
    apiClient
      .post<ApiResponse<SSOLaunchResponse>>('/sso/launch', { app_link_id: appLinkId })
      .then((res) => ({ data: res.data.data as SSOLaunchResponse })),
};
