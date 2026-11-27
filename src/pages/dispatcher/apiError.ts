import axios from "axios";

export interface ApiErrorInfo {
  status?: number;
  message?: string;
  /** Field-level validation errors keyed by field name. */
  fields: Record<string, string[]>;
}

export const parseApiError = (e: unknown): ApiErrorInfo => {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as
      | { message?: string; errors?: Record<string, string | string[]> }
      | undefined;
    // Field errors arrive as `{ field: "msg" }` or `{ field: ["msg"] }`.
    const fields: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(data?.errors ?? {})) {
      fields[k] = Array.isArray(v) ? v : [String(v)];
    }
    return {
      status: e.response?.status,
      message: data?.message,
      fields,
    };
  }
  return { fields: {} };
};

export const apiErrorMessage = (e: unknown, fallback: string): string =>
  parseApiError(e).message || fallback;
