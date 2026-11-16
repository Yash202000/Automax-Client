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
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;
    return {
      status: e.response?.status,
      message: data?.message,
      fields: data?.errors ?? {},
    };
  }
  return { fields: {} };
};

export const apiErrorMessage = (e: unknown, fallback: string): string =>
  parseApiError(e).message || fallback;
