// Mirrors the backend's transitionPermissionCode (KpiWorkflowService) so the
// UI only offers transition buttons the current user can actually execute —
// GetAvailableKpiPerformanceTransitions returns every transition valid from
// the current state regardless of the caller's permissions; the service-level
// check only runs when the transition is actually submitted.
export function kpiTransitionPermissionCode(code: string): string {
  switch (code) {
    case "submit":
      return "perf:submit";
    case "review":
      return "perf:review";
    case "approve":
    case "approve_l1":
    case "approve_l2":
    case "approve_l1_final":
      return "perf:approve";
    case "reject":
      return "perf:reject";
    case "publish":
      return "perf:publish";
    case "request_changes":
      return "perf:request_changes";
    default:
      return "perf:review";
  }
}
