import apiClient from './client';
import type {
  ApplicationLink,
  ApplicationLinkCreateRequest,
  ApplicationLinkUpdateRequest,
  ApiResponse
} from '../types';

export const applicationLinkApi = {
  // Get all application links (admin)
  list: async (): Promise<ApiResponse<ApplicationLink[]>> => {
    const response = await apiClient.get<ApiResponse<ApplicationLink[]>>('/admin/application-links');
    return response.data;
  },

  // Get active application links (for dashboard display)
  listActive: async (): Promise<ApiResponse<ApplicationLink[]>> => {
    const response = await apiClient.get<ApiResponse<ApplicationLink[]>>('/application-links');
    return response.data;
  },

  // Get single application link
  getById: async (id: string): Promise<ApiResponse<ApplicationLink>> => {
    const response = await apiClient.get<ApiResponse<ApplicationLink>>(`/admin/application-links/${id}`);
    return response.data;
  },

  // Create application link
  create: async (data: ApplicationLinkCreateRequest): Promise<ApiResponse<ApplicationLink>> => {
    const response = await apiClient.post<ApiResponse<ApplicationLink>>('/admin/application-links', data);
    return response.data;
  },

  // Update application link
  update: async (id: string, data: ApplicationLinkUpdateRequest): Promise<ApiResponse<ApplicationLink>> => {
    const response = await apiClient.put<ApiResponse<ApplicationLink>>(`/admin/application-links/${id}`, data);
    return response.data;
  },

  // Delete application link
  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/application-links/${id}`);
    return response.data;
  },

  // Upload logo image for application link
  uploadImage: async (id: string, file: File): Promise<ApiResponse<{ image_url: string; link: ApplicationLink }>> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post<ApiResponse<{ image_url: string; link: ApplicationLink }>>(
      `/admin/application-links/${id}/upload-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};
