import client from "./client";
import type { ApiResponse } from "../types";

export type AttachmentAudience = "citizen" | "internal";

export interface AttachmentExtension {
  name: string;
  active: boolean;
}

export interface AttachmentFileType {
  type: string;
  enabled: boolean;
  extensions: AttachmentExtension[];
}

export interface AttachmentAudienceConfig {
  enabled: boolean;
  file_types: AttachmentFileType[];
  max_file_size_mb: number;
  max_files_per_upload: number;
}

export type AttachmentConfigValue = Record<
  AttachmentAudience,
  AttachmentAudienceConfig
>;

export interface AttachmentConfig {
  id: string;
  value: AttachmentConfigValue;
}

export const ATTACHMENT_CONFIG_QUERY_KEY = ["configs", "attachment_config"];

export const attachmentConfigApi = {
  get: async () => {
    const response = await client.get<ApiResponse<AttachmentConfig>>(
      "/admin/configs/setting/attachment_config",
    );
    return response.data.data;
  },

  update: async (id: string, value: AttachmentConfigValue) => {
    const response = await client.put<ApiResponse<AttachmentConfig>>(
      `/admin/configs/${id}`,
      { value },
    );
    return response.data;
  },
};
