/**
 * Modules that are not rolled out yet. Hidden for all users (including super
 * admins): left out of navigation and redirected to /goals if opened directly.
 * The code is kept; to hide or bring back a module, edit this list only.
 */
export const HIDDEN_MODULE_PATHS = [
  "/goals/okr-alignment", // OKR Alignment
  "/goals/reviews", // Performance Reviews
  "/goals/templates", // Goal Templates
  "/goals/kpi/performance-bands", // Performance Bands
] as const;

/* 
Possible future hidden modules (part of the wider 2.0 scope) Move a path into HIDDEN_MODULE_PATHS to hide it.
"/goals/approvals", // My Approvals
  "/goals/documents", // Documents
  "/goals/metric-batches", // Metric Imports
  "/goals/kpi/performance", // KPI Performance
  "/goals/kpi/approvals", // KPI Approvals
  "/goals/kpi/segmentation", // KPI Segmentation
*/

export type HiddenModulePath = (typeof HIDDEN_MODULE_PATHS)[number];

/** True if the pathname is a hidden module's route or one of its sub-routes. */
export const isHiddenModulePath = (pathname: string): boolean =>
  HIDDEN_MODULE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
