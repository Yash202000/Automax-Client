import client from './client';
import type { Settings, SettingsUpdateRequest } from '../types';

export const settingsApi = {
  // Get settings (public endpoint)
  get: async () => {
    const response = await client.get<{ success: boolean; data: Settings }>('/settings');
    return response.data;
  },

  // Update settings (admin only)
  update: async (data: SettingsUpdateRequest) => {
    const response = await client.put<{ success: boolean; message: string; data: Settings }>('/admin/settings', data);
    return response.data;
  },
};
