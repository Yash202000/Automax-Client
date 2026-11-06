import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { incidentApi, workflowApi } from "../api/admin";
import { usePermissions } from "./usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { useAuthStore } from "../stores/authStore";

export interface IncidentStateOption {
  id: string;
  name: string;
  name_ar?: string;
}

/**
 * Id/name map of incident workflow states for URL-driven filters
 * (?status=name from the sidebar). States from stats, fallback to the
 * incident workflows — same sources as the feed FilterDrawer.
 */
export function useIncidentStates(): IncidentStateOption[] {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const user = useAuthStore((s) => s.user);
  const canViewAll =
    isSuperAdmin ||
    hasPermission(PERMISSIONS.INCIDENTS_VIEW_ALL) ||
    hasPermission(PERMISSIONS.INCIDENTS_VIEW_DEPARTMENT_ONLY);

  const { data: statsData } = useQuery({
    queryKey: [
      "incidents",
      "v2-list",
      "state-options",
      canViewAll ? "all" : (user?.id ?? "anon"),
    ],
    queryFn: () =>
      incidentApi.getIncidentStatsV2({
        ...(canViewAll ? {} : { my_record: user?.id }),
      }),
    staleTime: 300_000,
  });

  const { data: workflowsData } = useQuery({
    queryKey: ["workflows", "incident"],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        workflowApi.listByRecordType("incident", false),
        workflowApi.listByRecordType("both", false),
      ]);
      const combined = [...(a.data || []), ...(b.data || [])];
      return combined.filter(
        (w, i, self) => i === self.findIndex((x) => x.id === w.id),
      );
    },
    staleTime: 300_000,
  });

  return useMemo(() => {
    const fromStats =
      statsData?.data?.workflow_stats?.flatMap(
        (w) => w.by_state_details || [],
      ) || [];
    if (fromStats.length) {
      const seen = new Map<string, IncidentStateOption>();
      for (const s of fromStats) {
        if (!seen.has(s.id))
          seen.set(s.id, { id: s.id, name: s.name, name_ar: s.name_ar });
      }
      return [...seen.values()];
    }
    const all = (workflowsData || []).flatMap((w) => w.states || []);
    const uniq: IncidentStateOption[] = [];
    for (const s of all) {
      if (!uniq.find((x) => x.name === s.name))
        uniq.push({
          id: s.id,
          name: s.name,
          name_ar: (s as { name_ar?: string }).name_ar,
        });
    }
    return uniq;
  }, [statsData, workflowsData]);
}
