import type { FeedFilters } from "@/types";

/** Empty filter model for the /incidents/list feed + filter drawer. */
export const EMPTY_FEED_FILTERS: FeedFilters = {
  stateIds: [],
  transitionId: undefined,
  assigneeIds: [],
  reporterId: undefined,
  workflowId: undefined,
  source: undefined,
  momraRef: undefined,
  convertedToRequest: undefined,
  departmentIds: [],
  classificationIds: [],
  locationIds: [],
  priority: undefined,
  startDate: undefined,
  endDate: undefined,
  sla: undefined,
  reporterPhone: undefined,
};

export function isFeedFilterActive(f: FeedFilters): boolean {
  return (
    f.stateIds.length > 0 ||
    !!f.transitionId ||
    f.assigneeIds.length > 0 ||
    !!f.reporterId ||
    f.departmentIds.length > 0 ||
    f.classificationIds.length > 0 ||
    f.locationIds.length > 0 ||
    f.priority !== undefined ||
    !!f.startDate ||
    !!f.endDate ||
    !!f.sla ||
    !!f.reporterPhone ||
    !!f.workflowId ||
    !!f.source ||
    !!f.momraRef ||
    f.convertedToRequest !== undefined
  );
}
