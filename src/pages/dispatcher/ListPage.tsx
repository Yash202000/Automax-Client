import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isAxiosError } from "axios";
import {
  INCIDENT_DRAG_TYPE,
  type IncidentMapMarker,
} from "../../components/dispatcher/incidentMap.types";
import { dispatcherApi } from "../../api/dispatcher";
import { DispatcherMapPanel } from "./DispatcherMapPanel";
import { IncidentDetailModal } from "./IncidentDetailModal";
import { FireStationAlertModal } from "../../components/dispatcher/FireStationAlertModal";
import { STATUS_COLORS, type DummyIncident } from "./dummyIncidents";
import {
  DISPATCHED_STATE_CODE,
  WAITING_STATE_CODE,
  hasCoordinates,
  toDispatchIncident,
} from "./incidentAdapter";
import { incidentApi } from "../../api/admin";
import { useAuthStore } from "../../stores/authStore";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";

/** Incidents loaded per request (the API's page size). */
const FETCH_LIMIT = 100;

type Tab = "waiting" | "dispatched";

/**
 * Dispatcher view: status tabs, a searchable incident list and a clustered
 * map. Incidents come from the same incident API as the incident management
 * list (scoped the same way). Assigning by drag-and-drop is still local to
 * this page, as there is no dispatch endpoint for it yet. The selected
 * incident is reflected in the URL as /dispatcher/:id.
 */
export function DispatcherListPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canViewAllIncidents =
    isSuperAdmin ||
    hasPermission(PERMISSIONS.INCIDENTS_VIEW_ALL) ||
    hasPermission(PERMISSIONS.INCIDENTS_VIEW_DEPARTMENT_ONLY);
  // Local overrides so dropping an incident on a unit/station can assign it.
  const [overrides, setOverrides] = useState<
    Record<string, Partial<DummyIncident>>
  >({});
  const [tab, setTab] = useState<Tab>("waiting");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [fireStationModalOpen, setFireStationModalOpen] = useState(false);

  // Same request the incident management list makes. Searches shorter than
  // 3 characters are applied locally, like there.
  const search = query.trim();
  const serverSearch = search.length >= 3 ? search : undefined;
  const scope = canViewAllIncidents ? {} : { my_record: user?.id };
  // One query per tab, filtered by workflow state code on the server.
  const stateQuery = (code: string) => ({
    queryKey: [
      "incidents",
      "dispatcher",
      code,
      { search: serverSearch, ...scope },
    ],
    queryFn: () =>
      incidentApi.list({
        record_type: "incident",
        current_state_code: code,
        page: 1,
        limit: FETCH_LIMIT,
        search: serverSearch,
        ...scope,
      }),
    placeholderData: keepPreviousData,
  });
  const waitingQuery = useQuery(stateQuery(WAITING_STATE_CODE));
  const dispatchedQuery = useQuery(stateQuery(DISPATCHED_STATE_CODE));
  const isLoading = waitingQuery.isLoading || dispatchedQuery.isLoading;

  const allIncidents = useMemo<DummyIncident[]>(
    () =>
      [
        ...(waitingQuery.data?.data ?? []),
        ...(dispatchedQuery.data?.data ?? []),
      ].map((inc) => {
        const base = toDispatchIncident(inc);
        return { ...base, ...overrides[base.id] };
      }),
    [waitingQuery.data, dispatchedQuery.data, overrides],
  );

  const tabs: { key: Tab; label: string }[] = [
    {
      key: "waiting",
      label: t("dispatcher.waitingForDispatch", "Waiting for dispatch"),
    },
    { key: "dispatched", label: t("dispatcher.dispatched", "Dispatched") },
  ];

  // Server totals, adjusted for incidents dropped onto a unit/station here.
  const counts = useMemo(() => {
    const movedToDispatched = (waitingQuery.data?.data ?? []).filter(
      (inc) => overrides[inc.id]?.status === "dispatched",
    ).length;
    return {
      waiting: Math.max(
        0,
        (waitingQuery.data?.total_items ?? 0) - movedToDispatched,
      ),
      dispatched: (dispatchedQuery.data?.total_items ?? 0) + movedToDispatched,
    };
  }, [waitingQuery.data, dispatchedQuery.data, overrides]);

  const incidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allIncidents.filter(
      (i) =>
        i.status === tab &&
        (!q ||
          [i.number, i.title, i.title_ar, i.location].some((v) =>
            v.toLowerCase().includes(q),
          )),
    );
  }, [allIncidents, tab, query]);

  const visible = incidents;
  // Only incidents with coordinates can be plotted on the map.
  const mappable = useMemo(() => incidents.filter(hasCoordinates), [incidents]);

  // Dropping an incident on a fire station sends it a push notification.
  const pushMutation = useMutation({
    mutationFn: (v: { serviceId: string; incidentId: string }) =>
      dispatcherApi.pushToFireStation(v.serviceId, v.incidentId),
  });

  const assign = (incidentId: string, target: IncidentMapMarker) => {
    const inc = allIncidents.find((x) => x.id === incidentId);
    if (!inc) return;
    if (inc.status === "resolved" || inc.status === "completed") {
      toast.info(
        t(
          "dispatcher.alreadyClosed",
          "{{incident}} is already closed and can't be assigned",
          { incident: inc.number },
        ),
      );
      return;
    }
    const apply = () => {
      setOverrides((prev) => ({
        ...prev,
        [incidentId]: { status: "dispatched", assignee: target.label },
      }));
      toast.success(
        t(
          "dispatcher.incidentAssigned",
          "{{incident}} assigned to {{target}}",
          { incident: inc.number, target: target.label },
        ),
      );
    };
    // Units have no endpoint yet: assignment stays local for them.
    if (target.kind !== "station") return apply();
    pushMutation.mutate(
      { serviceId: target.id, incidentId },
      {
        onSuccess: apply,
        onError: (error) => {
          const message = isAxiosError(error)
            ? error.response?.data?.message
            : undefined;
          toast.error(
            message ||
              t(
                "dispatcher.pushFailed",
                "Could not notify {{target}} about {{incident}}",
                { target: target.label, incident: inc.number },
              ),
          );
        },
      },
    );
  };

  const detailIncident = detailId
    ? allIncidents.find((x) => x.id === detailId)
    : undefined;

  const select = (next: string) =>
    navigate(`/dispatcher/${next}`, { replace: true });

  return (
    <>
      <div className="flex h-[calc(100vh-70px-1rem)] min-h-0 w-full overflow-hidden lg:h-[calc(100vh-70px-2rem)]">
        <div className="flex min-h-0 w-full max-w-[19rem] shrink-0 flex-col border-e border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] p-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.search", "Search")}
                className="h-9 w-full rounded-md border border-[hsl(var(--border))] bg-transparent ps-8 pe-2 text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setFireStationModalOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white"
              aria-label={t("common.create", "Create")}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex border-b border-[hsl(var(--border))]">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                className={cn(
                  "flex-1 truncate px-2 py-1.5 text-xs font-medium",
                  tab === tb.key
                    ? "border-b-2 border-primary text-primary"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                {tb.label} ({counts[tb.key]})
              </button>
            ))}
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {visible.map((i) => (
              <li
                key={i.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(INCIDENT_DRAG_TYPE, i.id);
                  e.dataTransfer.setData("text/plain", i.number);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <button
                  type="button"
                  onClick={() => select(i.id)}
                  className={cn(
                    "w-full border-b border-[hsl(var(--border))] px-3 py-1.5 text-start hover:bg-[hsl(var(--muted))]",
                    id === i.id && "bg-[hsl(var(--muted))]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: STATUS_COLORS[i.status] }}
                    />
                    <span className="text-[13px] font-semibold">
                      {i.number}
                    </span>
                    <span className="ms-auto text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(i.reportedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      title={t("dispatcher.viewDetails", "View details")}
                      aria-label={t("dispatcher.viewDetails", "View details")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailId(i.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          setDetailId(i.id);
                        }
                      }}
                      className="rounded p-0.5 text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="truncate text-[13px] leading-snug">
                    {i18n.language === "ar" ? i.title_ar : i.title}
                  </div>
                  <div className="truncate text-[11px] leading-snug text-[hsl(var(--muted-foreground))]">
                    {i.location}
                    {i.assignee !== "Unassigned" ? ` · ${i.assignee}` : ""}
                  </div>
                </button>
              </li>
            ))}
            {incidents.length === 0 ? (
              <li className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                {isLoading
                  ? t("common.loading", "Loading...")
                  : t("common.noResults", "No results")}
              </li>
            ) : null}
          </ul>
        </div>

        <main className="min-h-0 min-w-0 flex-1">
          <DispatcherMapPanel
            incidents={mappable}
            selectedId={id ?? null}
            onSelect={select}
            onDropIncident={assign}
          />
        </main>
      </div>

      {detailIncident ? (
        <IncidentDetailModal
          incident={detailIncident}
          onClose={() => setDetailId(null)}
          onAssociate={(ids) => {
            const inc = detailIncident;
            setOverrides((prev) => ({
              ...prev,
              [inc.id]: {
                ...prev[inc.id],
                fireStationIds: Array.from(
                  new Set([...inc.fireStationIds, ...ids]),
                ),
              },
            }));
            toast.success(
              t(
                "dispatcher.fireStationsAssociated",
                "{{count}} fire station(s) associated with {{incident}}",
                { count: ids.length, incident: inc.number },
              ),
            );
          }}
        />
      ) : null}
      {fireStationModalOpen ? (
        <FireStationAlertModal
          isOpen
          onClose={() => setFireStationModalOpen(false)}
          onProceed={() => {
            setFireStationModalOpen(false);
            navigate("/incidents/new");
          }}
        />
      ) : null}
    </>
  );
}
