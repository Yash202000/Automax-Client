import type {
  AttachmentAudience,
  AttachmentAudienceConfig,
} from "../api/attachmentConfig";

// Executables are never accepted, whatever the attachment config says.
export const BLOCKED_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "msi",
  "js",
  "vbs",
  "ps1",
  "sh",
  "jar",
  "dll",
  "scr",
];

export interface AttachmentPolicy {
  enabled: boolean;
  maxFiles: number;
  maxSizeMB: number;
  /** Allowed extensions (lowercase, no dot). `null` means any non-blocked type. */
  extensions: string[] | null;
}

// Used until the config loads, or if it can't be fetched.
const FALLBACK_POLICY: Record<AttachmentAudience, AttachmentPolicy> = {
  internal: { enabled: true, maxFiles: 5, maxSizeMB: 5, extensions: null },
  citizen: { enabled: true, maxFiles: 5, maxSizeMB: 20, extensions: null },
};

export const getActiveExtensions = (config: AttachmentAudienceConfig) =>
  config.file_types
    .filter((type) => type.enabled)
    .flatMap((type) => type.extensions)
    .filter((ext) => ext.active)
    .map((ext) => ext.name.toLowerCase());

export const toAttachmentPolicy = (
  audience: AttachmentAudience,
  config?: AttachmentAudienceConfig,
): AttachmentPolicy => {
  if (!config) return FALLBACK_POLICY[audience];
  return {
    enabled: config.enabled,
    maxFiles: config.max_files_per_upload,
    maxSizeMB: config.max_file_size_mb,
    extensions: getActiveExtensions(config),
  };
};

export const getFileExtension = (fileName: string) => {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
};

export const isExtensionAllowed = (
  fileName: string,
  policy: AttachmentPolicy,
) => {
  const ext = getFileExtension(fileName);
  if (BLOCKED_EXTENSIONS.includes(ext)) return false;
  return policy.extensions === null || policy.extensions.includes(ext);
};

export const formatFileSizeMB = (bytes: number) =>
  (bytes / (1024 * 1024)).toFixed(1);
