import { isAxiosError } from "axios";
import { imageApi } from "../api/admin";

export interface RejectedAttachment {
  name: string;
  reason: string;
}

export interface ImageValidationResult {
  valid: File[];
  rejected: RejectedAttachment[];
}

export interface ImageValidationMessages {
  /** Shown when the API says the image is too dark/bright or has no details. */
  notClear: string;
  /** Shown when the image could not be checked (network or server error). */
  checkFailed: string;
}

const isImageFile = (file: File) => file.type.startsWith("image/");

// The validate endpoint may signal failure either with a non-2xx status or
// with a 2xx body carrying success/valid = false.
const isInvalidResponse = (body: unknown): boolean => {
  if (!body || typeof body !== "object") return false;
  const res = body as Record<string, unknown>;
  const data = (res.data ?? {}) as Record<string, unknown>;
  return (
    res.success === false ||
    data.valid === false ||
    data.is_valid === false ||
    res.valid === false ||
    res.is_valid === false
  );
};

/**
 * Validates image files against the image validation API. Non-image files are
 * passed through untouched. Files that fail validation (or cannot be
 * validated) are returned in `rejected` with a user-facing reason.
 */
export async function validateImageFiles(
  files: File[],
  messages: ImageValidationMessages,
): Promise<ImageValidationResult> {
  const results = await Promise.all(
    files.map(async (file): Promise<RejectedAttachment | null> => {
      if (!isImageFile(file)) return null;
      try {
        const body = await imageApi.validate(file);
        return isInvalidResponse(body)
          ? { name: file.name, reason: messages.notClear }
          : null;
      } catch (error) {
        // A 4xx means the API rejected the image; anything else (no response,
        // 5xx) means we couldn't check it.
        const status = isAxiosError(error) ? error.response?.status : undefined;
        const rejectedByApi = !!status && status >= 400 && status < 500;
        return {
          name: file.name,
          reason: rejectedByApi ? messages.notClear : messages.checkFailed,
        };
      }
    }),
  );

  const valid: File[] = [];
  const rejected: RejectedAttachment[] = [];
  files.forEach((file, i) => {
    const r = results[i];
    if (r) rejected.push(r);
    else valid.push(file);
  });
  return { valid, rejected };
}
