import client from "./client";
import type { Settings, SettingsUpdateRequest } from "../types";

/** Settings fields that hold an uploaded branding image. */
export type BrandingImageField =
  | "logo_url"
  | "logo_small_url"
  | "favicon_url"
  | "inc_logo_left"
  | "inc_logo_right";

/** Config the attachment is stored under. */
export type BrandingImageConfig = "settings" | "report";

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

  // Current report logo (admin only), one call per field. Returns the
  // attachment value (URL string or object), or null when not set.
  getReportLogo: async (field: BrandingImageField): Promise<unknown> => {
    try {
      const response = await client.get<{
        success: boolean;
        data?: { value?: { url?: string; preview_url?: string }[] | null };
      }>(`/admin/configs/report-attachments/${field}`);
      // value is a list of attachments; the most recent one is the logo.
      const value = response.data.data?.value;
      const latest = Array.isArray(value) ? value[value.length - 1] : null;
      return latest?.preview_url ?? latest?.url ?? null;
    } catch (error) {
      if (
        (error as { response?: { status?: number } }).response?.status === 404
      )
        return null;
      throw error;
    }
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
      config = "settings",
      onUploadProgress,
    }: {
      replace?: boolean;
      config?: BrandingImageConfig;
      onUploadProgress?: (progress: number) => void;
    } = {},
  ): Promise<void> => {
    const formData = new FormData();
    formData.append("files", file);
    await client.request({
      method: replace ? "put" : "post",
      url: `/admin/configs/${config}/attachments/${field}`,
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total)
          onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
  },
};
