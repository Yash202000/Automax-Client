import type { Incident } from "../../types";
import type { DispatchStatus, DummyIncident } from "./dummyIncidents";

/** Workflow state codes the dispatcher tabs are built on. */
export const WAITING_STATE_CODE = "waiting_for_dispatch";
export const DISPATCHED_STATE_CODE = "dispatched";

const PRIORITY_NAMES = ["Low", "Medium", "High", "Critical"];

/**
 * Maps an incident from the incident management API to the shape the
 * dispatcher map/list/detail components render.
 *
 * Dispatch status comes from the incident's workflow state code
 * (`waiting_for_dispatch` / `dispatched`). Any other state is mapped to
 * resolved/completed when closed, otherwise to waiting; those incidents are
 * not listed by the dispatcher tabs, which query by state code.
 */
export function toDispatchIncident(inc: Incident): DummyIncident {
  const assignee =
    inc.assignee ??
    (inc.assignees && inc.assignees.length > 0 ? inc.assignees[0] : undefined);
  const assigneeName = assignee
    ? [assignee.first_name, assignee.last_name].filter(Boolean).join(" ") ||
      assignee.email ||
      ""
    : "";

  let status: DispatchStatus = "waiting";
  if (inc.current_state?.code === DISPATCHED_STATE_CODE) {
    status = "dispatched";
  } else if (inc.current_state?.code === WAITING_STATE_CODE) {
    status = "waiting";
  } else if (inc.current_state?.state_type === "terminal" || inc.closed_at) {
    status = "completed";
  } else if (inc.resolved_at) {
    status = "resolved";
  }

  const priority = inc.priority ?? 1;

  return {
    id: inc.id,
    number: inc.incident_number,
    title: inc.title,
    title_ar: inc.title,
    location: inc.address || inc.location?.name || inc.city || "",
    reportedAt: inc.created_at,
    status,
    // Incidents without coordinates are filtered out before plotting.
    latitude: inc.latitude ?? Number.NaN,
    longitude: inc.longitude ?? Number.NaN,
    description: inc.description ?? "",
    priority,
    priorityName: PRIORITY_NAMES[priority - 1] ?? String(priority),
    source: inc.source ?? "",
    channel: inc.channel ?? "",
    department: inc.department?.name ?? "",
    slaDeadline: inc.sla_deadline ?? "",
    slaBreached: inc.sla_breached,
    reporter: {
      name: inc.reporter_name ?? "",
      phone: inc.reporter_phone ?? "",
    },
    assignee: assigneeName || "Unassigned",
    fireStationIds: [],
    comments: [],
    activity: [],
  };
}

export const hasCoordinates = (i: DummyIncident) =>
  Number.isFinite(i.latitude) && Number.isFinite(i.longitude);
