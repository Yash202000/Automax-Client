import client from './client';

export interface LicenseInfo {
  license_type: string;
  features: string[];
  max_users: number;
  active_user_count: number;
  expires_at: string | null;
  days_remaining: number | null;
  is_grace_period: boolean;
  validation_status: string;
}

export interface LicenseStatus extends LicenseInfo {
  license_id: string;
  client_name: string;
  client_email: string;
  company_name: string;
  product: string;
  activated_at: string | null;
  activated_by: string | null;
}

export interface LicenseActivateRequest {
  license_key: string;
  public_key: string;
}

export interface LicenseFeature {
  code: string;
  name: string;
  description: string;
  permission_modules: string[];
  dependencies?: string[];
  tier_minimum?: string;
}

export interface LicenseCatalog {
  features: LicenseFeature[];
}

export const licenseApi = {
  getInfo: async () => {
    const response = await client.get<{ success: boolean; data: LicenseInfo }>('/license/info');
    return response.data;
  },

  getCatalog: async () => {
    const response = await client.get<{ success: boolean; data: LicenseCatalog }>('/license/catalog');
    return response.data;
  },

  getStatus: async () => {
    const response = await client.get<{ success: boolean; data: LicenseStatus }>('/admin/license/status');
    return response.data;
  },

  activate: async (data: LicenseActivateRequest) => {
    const response = await client.post<{ success: boolean; message: string; data: LicenseStatus }>(
      '/admin/license/activate',
      data
    );
    return response.data;
  },

  deactivate: async () => {
    const response = await client.delete<{ success: boolean; message: string }>('/admin/license');
    return response.data;
  },
};
