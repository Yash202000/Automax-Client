import type { Settings } from "@/types";

/**
 * Returns the correct URL for a file in the public/ directory,
 * respecting the deployment base path (BASE_PATH from runtime config
 * or Vite's BASE_URL from build time).
 *
 * Usage: publicUrl('epm-logo.png')  →  '/ax3/epm-logo.png'
 */
export function publicUrl(filePath: string): string {
  const base = (
    window.APP_CONFIG?.BASE_PATH ??
    import.meta.env.BASE_URL ??
    "/"
  ).replace(/\/$/, "");
  const p = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${base}${p}`;
}

const API_PATH_PREFIX = "/api/v1";

/** Joins a backend-relative path ("/api/v1/...") onto the configured API URL. */
function apiUrl(path: string): string {
  const base = (
    window.APP_CONFIG?.API_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:8080/api/v1"
  ).replace(/\/$/, "");
  return `${base}${path.slice(API_PATH_PREFIX.length)}`;
}

/**
 * Extracts a URL string from an API value that may be a string, an
 * attachment object ({ url } / { preview_url } / { file_url }), or an array of
 * those (first entry wins). Anything else yields "".
 */
function toUrlString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return toUrlString(value[0]);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return toUrlString(o.url ?? o.preview_url ?? o.file_url ?? o.path);
  }
  return "";
}

/**
 * Resolves a logo setting that may be a full URL, a backend path such as
 * "/api/v1/public/attachments/{id}/preview" (uploaded images), or a file
 * name inside public/. Returns null when empty.
 */
export function resolveLogoUrl(value?: unknown): string | null {
  const v = toUrlString(value);
  if (!v) return null;
  if (/^(https?:|data:|blob:|\/\/)/i.test(v)) return v;
  if (v.startsWith(`${API_PATH_PREFIX}/`)) return apiUrl(v);
  return publicUrl(v);
}

type BrandingField = "logo_url" | "logo_small_url" | "favicon_url";

/** The uploaded attachment for a branding field, if one exists. */
export function brandingAttachment(
  settings: Pick<Settings, "settings_attachments"> | null | undefined,
  field: BrandingField,
): string | null {
  return resolveLogoUrl(settings?.settings_attachments?.[field]);
}

/**
 * Resolved URL for a branding image: the uploaded attachment
 * (settings_attachments[field]) when present, else the plain field value.
 */
export function resolveBrandingImage(
  settings:
    | Partial<Pick<Settings, BrandingField | "settings_attachments">>
    | null
    | undefined,
  field: BrandingField,
): string | null {
  return (
    brandingAttachment(settings, field) ?? resolveLogoUrl(settings?.[field])
  );
}
