import { create } from "zustand";
import type { IncidentFilter } from "../types";

// The subset of IncidentFilter that should carry over between the "All
// Incidents", "Assigned to me" and "Created by me" views, and feed the
// sidebar's "By Status" counts. Deliberately excludes the fields that define
// which view you're in (assignee_id/reporter_id/my_record) and per-page
// mechanics (page/limit/record_type) — those aren't filters, they're scope.
export type SharedIncidentFilter = Pick<
  IncidentFilter,
  | "search"
  | "workflow_id"
  | "current_state_id"
  | "classification_ids"
  | "priority"
  | "department_ids"
  | "location_ids"
  | "sla_breached"
  | "source"
  | "converted_to_request"
  | "start_date"
  | "end_date"
  | "transition_id"
  | "reporter_phone"
  | "reporter_phone_search"
  | "momra_ref"
  | "channel"
>;

export const sharedIncidentFilterKeys: (keyof SharedIncidentFilter)[] = [
  "search",
  "workflow_id",
  "current_state_id",
  "classification_ids",
  "priority",
  "department_ids",
  "location_ids",
  "sla_breached",
  "source",
  "converted_to_request",
  "start_date",
  "end_date",
  "transition_id",
  "reporter_phone",
  "reporter_phone_search",
  "momra_ref",
  "channel",
];

const emptySharedFilter: SharedIncidentFilter = {};

interface IncidentFilterStoreState {
  filter: SharedIncidentFilter;
  setFilter: (filter: SharedIncidentFilter) => void;
  clearFilter: () => void;
}

export const useIncidentFilterStore = create<IncidentFilterStoreState>(
  (set) => ({
    filter: emptySharedFilter,
    setFilter: (filter) => set({ filter }),
    clearFilter: () => set({ filter: emptySharedFilter }),
  }),
);

// Picks just the shared/cross-tab fields out of a full IncidentFilter.
export const pickSharedIncidentFilter = (
  filter: IncidentFilter,
): SharedIncidentFilter => {
  const picked: SharedIncidentFilter = {};
  sharedIncidentFilterKeys.forEach((key) => {
    (picked as Record<string, unknown>)[key] = filter[key];
  });
  return picked;
};

const isEmptyValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

export const isSharedIncidentFilterEmpty = (
  filter: SharedIncidentFilter,
): boolean =>
  sharedIncidentFilterKeys.every((key) => isEmptyValue(filter[key]));
