import client from "./client";
import type { Settings, SettingsUpdateRequest } from "../types";

/** Settings fields that hold an uploaded branding image. */
export type BrandingImageField = "logo_url" | "logo_small_url" | "favicon_url";

export const settingsApi = {
  // Get settings (public endpoint)
  get: async () => {
    const response = await client.get<{ success: boolean; data: Settings }>(
      "/settings",
    );
    return response.data;
  },

  // Update settings (admin only)
  update: async (data: SettingsUpdateRequest) => {
    const response = await client.put<{
      success: boolean;
      message: string;
      data: Settings;
    }>("/admin/settings", data);
    return response.data;
  },

  // Upload a branding image (admin only) via the config attachments endpoint.
  // POST creates the attachment; PUT replaces an existing one. The server
  // saves its URL under settings_attachments[field]; callers refetch settings
  // afterwards to pick up the new value.
  uploadBrandingImage: async (
    field: BrandingImageField,
    file: File,
    {
      replace = false,
      onUploadProgress,
    }: {
      replace?: boolean;
      onUploadProgress?: (progress: number) => void;
    } = {},
  ): Promise<void> => {
    const formData = new FormData();
    formData.append("files", file);
    await client.request({
      method: replace ? "put" : "post",
      url: `/admin/configs/settings/attachments/${field}`,
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total)
          onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
  },
};
