// Whether an API error is the backend refusing access to a KPI (only its
// assigned collaborators and the Super Admin may open it).
export const isKpiAccessDenied = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  (err as { response?: { status?: number } }).response?.status === 403;
