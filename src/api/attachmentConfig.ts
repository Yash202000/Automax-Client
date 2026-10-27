import client from "./client";
import type { ApiResponse } from "../types";
import { BLOCKED_EXTENSIONS } from "../utils/attachmentPolicy";

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

// Fills in missing/null fields so the rest of the app can rely on the shape.
const normalizeAudience = (
  config?: Partial<AttachmentAudienceConfig> | null,
): AttachmentAudienceConfig => ({
  enabled: config?.enabled ?? false,
  max_file_size_mb: config?.max_file_size_mb ?? 0,
  max_files_per_upload: config?.max_files_per_upload ?? 0,
  file_types: (config?.file_types ?? [])
    .filter((type) => typeof type?.type === "string")
    .map((type) => ({
      type: type.type,
      enabled: type.enabled ?? false,
      // Blocked types are never offered, even if the backend lists them.
      extensions: (type.extensions ?? [])
        .filter(
          (ext) =>
            typeof ext?.name === "string" &&
            !BLOCKED_EXTENSIONS.includes(ext.name.toLowerCase()),
        )
        .map((ext) => ({
          name: ext.name,
          active: ext.active ?? false,
        })),
    })),
});

export const attachmentConfigApi = {
  get: async (): Promise<AttachmentConfig | null> => {
    const response = await client.get<ApiResponse<AttachmentConfig>>(
      "/admin/configs/setting/attachment_config",
    );
    const config = response.data.data;
    if (!config?.id) return null;
    return {
      id: config.id,
      value: {
        citizen: normalizeAudience(config.value?.citizen),
        internal: normalizeAudience(config.value?.internal),
      },
    };
  },

  update: async (id: string, value: AttachmentConfigValue) => {
    const response = await client.put<ApiResponse<AttachmentConfig>>(
      `/admin/configs/${id}`,
      { value },
    );
    return response.data;
  },
};
