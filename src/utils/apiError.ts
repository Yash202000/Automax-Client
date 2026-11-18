/**
 * Extract the translated error message from a backend error response
 * (`{ success: false, error: "<message>" }`), falling back to `fallback`.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (
    err as { response?: { data?: { error?: unknown; message?: unknown } } }
  )?.response?.data;
  if (data && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  if (data && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  return fallback;
}
