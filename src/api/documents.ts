import apiClient from "./client";
import type { ApiResponse } from "../types";
import type {
  DmsListResult,
  DmsSearchResult,
  DmsFile,
  DmsComment,
} from "../types/document";

export const documentApi = {
  listFiles: async (
    parentId?: string,
  ): Promise<ApiResponse<DmsListResult>> => {
    const params = new URLSearchParams();
    if (parentId) params.append("parent", parentId);
    const res = await apiClient.get(`/documents/files?${params.toString()}`);
    return res.data;
  },

  searchFiles: async (
    query: string,
    tags?: Record<string, string>,
  ): Promise<ApiResponse<DmsSearchResult>> => {
    const payload: Record<string, unknown> = { query };
    if (tags && Object.keys(tags).length > 0) {
      payload.tags = tags;
    }
    const res = await apiClient.post("/documents/search", payload);
    return res.data;
  },

  getFileInfo: async (fileId: string): Promise<ApiResponse<DmsFile>> => {
    const res = await apiClient.get(`/documents/files/${fileId}/info`);
    return res.data;
  },

  getPreviewUrl: async (
    fileId: string,
  ): Promise<ApiResponse<{ url: string }>> => {
    const res = await apiClient.get(`/documents/files/${fileId}/preview`);
    return res.data;
  },

  getDownloadUrl: async (
    fileId: string,
  ): Promise<ApiResponse<{ url: string }>> => {
    const res = await apiClient.get(`/documents/files/${fileId}/download`);
    return res.data;
  },

  getComments: async (
    fileId: string,
  ): Promise<ApiResponse<DmsComment[]>> => {
    const res = await apiClient.get(`/documents/files/${fileId}/comments`);
    return res.data;
  },

  addComment: async (
    fileId: string,
    content: string,
  ): Promise<ApiResponse<null>> => {
    const res = await apiClient.post(`/documents/files/${fileId}/comments`, {
      content,
    });
    return res.data;
  },

  getTags: async (
    fileId: string,
  ): Promise<ApiResponse<Record<string, string>>> => {
    const res = await apiClient.get(`/documents/files/${fileId}/tags`);
    return res.data;
  },

  setTags: async (
    fileId: string,
    tags: Record<string, string>,
  ): Promise<ApiResponse<null>> => {
    const res = await apiClient.put(`/documents/files/${fileId}/tags`, {
      tags,
    });
    return res.data;
  },
};
