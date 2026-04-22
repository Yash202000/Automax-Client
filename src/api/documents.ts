import apiClient from "./client";
import type { ApiResponse } from "../types";
import type {
  DmsListResult,
  DmsSearchResult,
  DmsFile,
  DmsComment,
  DmsVersion,
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

  getFileBreadcrumb: async (
    fileId: string,
  ): Promise<ApiResponse<{ breadcrumb: Array<{ uuid: string; name: string }> }>> => {
    const res = await apiClient.get(`/documents/files/${fileId}/breadcrumb`);
    return res.data;
  },

  getPreviewUrl: async (
    fileId: string,
  ): Promise<ApiResponse<{ url: string }>> => {
    const res = await apiClient.get(`/documents/files/${fileId}/preview`);
    return res.data;
  },

  // download triggers a blob download in the browser. The backend streams the
  // file bytes with Content-Disposition: attachment. We turn that into a
  // programmatic click on an <a download> so the user sees a native save
  // dialog instead of the old "open JSON URL in new tab" behaviour.
  download: async (fileId: string, filename?: string): Promise<void> => {
    const res = await apiClient.get(`/documents/files/${fileId}/download`, {
      responseType: "blob",
    });
    const blob = res.data as Blob;
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
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

  listVersions: async (
    fileId: string,
  ): Promise<ApiResponse<DmsVersion[]>> => {
    const res = await apiClient.get(
      `/documents/files/${fileId}/versions`,
    );
    return res.data;
  },

  uploadVersion: async (
    fileId: string,
    file: File,
    description: string,
  ): Promise<ApiResponse<DmsVersion>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", description);
    const res = await apiClient.post(
      `/documents/files/${fileId}/versions`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },

  downloadVersion: async (versionId: string): Promise<Blob> => {
    const res = await apiClient.get(
      `/documents/versions/${versionId}/download`,
      { responseType: "blob" },
    );
    return res.data;
  },

  rollbackVersion: async (
    fileId: string,
    versionUuid: string,
  ): Promise<ApiResponse<null>> => {
    const res = await apiClient.post(
      `/documents/files/${fileId}/versions/rollback`,
      { version_uuid: versionUuid },
    );
    return res.data;
  },
};
