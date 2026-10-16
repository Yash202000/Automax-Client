import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { incidentApi } from "../api/admin";
import { usePermissions } from "./usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { useAuthStore } from "../stores/authStore";
import type { FeedFilters } from "../types";

interface UseIncidentsListParams {
  page: number;
  limit: number;
  search?: string;
  filters?: FeedFilters;
}

/**
 * Incident feed query for /incidents/list. Reuses the shared
 * incidentApi.list (POST /incidents/search) like every other incident view.
 */
export function useIncidentsList({
  page,
  limit,
  search,
  filters,
}: UseIncidentsListParams) {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const user = useAuthStore((s) => s.user);

  const canViewAll =
    isSuperAdmin ||
    hasPermission(PERMISSIONS.INCIDENTS_VIEW_ALL) ||
    hasPermission(PERMISSIONS.INCIDENTS_VIEW_DEPARTMENT_ONLY);

  // Mirror existing listing behaviour: ignore 1-2 char searches until 3+ chars.
  const isShortSearch =
    !!search && search.trim().length > 0 && search.trim().length < 3;
  const effectiveSearch = isShortSearch
    ? undefined
    : search?.trim() || undefined;

  // React Query hashes keys structurally, so a fresh literal per render is
  // safe (no refetch unless the content actually changes).
  const queryKey = [
    "incidents",
    "v2-list",
    {
      page,
      limit,
      search: effectiveSearch,
      states: filters?.stateIds ?? [],
      transition: filters?.transitionId ?? null,
      assignees: filters?.assigneeIds ?? [],
      departments: filters?.departmentIds ?? [],
      classifications: filters?.classificationIds ?? [],
      locations: filters?.locationIds ?? [],
      priority: filters?.priority ?? null,
      start: filters?.startDate ?? null,
      end: filters?.endDate ?? null,
      sla: filters?.sla ?? null,
      phone: filters?.reporterPhone ?? null,
      scope: canViewAll ? "all" : `mine:${user?.id ?? "anon"}`,
    },
  ];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      incidentApi.list({
        page,
        limit,
        record_type: "incident",
        search: effectiveSearch,
        ...(canViewAll ? {} : { my_record: user?.id }),
        ...(filters?.stateIds?.length
          ? { current_state_ids: filters.stateIds }
          : {}),
        ...(filters?.transitionId
          ? { transition_id: filters.transitionId }
          : {}),
        ...(filters?.assigneeIds?.length
          ? { assignee_ids: filters.assigneeIds }
          : {}),
        ...(filters?.departmentIds?.length
          ? { department_ids: filters.departmentIds }
          : {}),
        ...(filters?.classificationIds?.length
          ? { classification_ids: filters.classificationIds }
          : {}),
        ...(filters?.locationIds?.length
          ? { location_ids: filters.locationIds }
          : {}),
        ...(filters?.priority !== undefined
          ? { priority: filters.priority }
          : {}),
        ...(filters?.startDate ? { start_date: filters.startDate } : {}),
        ...(filters?.endDate ? { end_date: filters.endDate } : {}),
        // "At risk" items have not breached yet, so they sit in the
        // non-breached pool together with "within SLA".
        ...(filters?.sla === "breached"
          ? { sla_breached: true }
          : filters?.sla === "within" || filters?.sla === "atrisk"
            ? { sla_breached: false }
            : {}),
        ...(filters?.reporterPhone
          ? { reporter_phone_search: filters.reporterPhone }
          : {}),
      }),
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    incidents: query.data?.data ?? [],
    totalPages: query.data?.total_pages ?? 1,
    totalItems: query.data?.total_items ?? 0,
    isShortSearch,
    canViewAll,
  };
}

export default useIncidentsList;
