import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Eye,
  MapPin,
  Plus,
  Search,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
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
  DISPATCHED_TAB_STATE_CODES,
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

const PRIORITY_BORDER: Record<number, string> = {
  1: "border-s-emerald-500",
  2: "border-s-amber-500",
  3: "border-s-orange-500",
  4: "border-s-rose-500",
};

const PRIORITY_BADGE: Record<number, string> = {
  1: "bg-emerald-500/10 text-emerald-700",
  2: "bg-amber-500/10 text-amber-700",
  3: "bg-orange-500/10 text-orange-700",
  4: "bg-rose-500/10 text-rose-700",
};

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
  // Sidebar "By Status" selects any other workflow state via ?current_state_id.
  const [searchParams] = useSearchParams();
  const stateId = searchParams.get("current_state_id");
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
  const stateQuery = (code: string | string[]) => ({
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
  const waitingQuery = useQuery({
    ...stateQuery(WAITING_STATE_CODE),
    enabled: !stateId,
  });
  const dispatchedQuery = useQuery({
    ...stateQuery(DISPATCHED_TAB_STATE_CODES),
    enabled: !stateId,
  });
  const selectedStateQuery = useQuery({
    queryKey: [
      "incidents",
      "dispatcher",
      "state-id",
      stateId,
      { search: serverSearch, ...scope },
    ],
    queryFn: () =>
      incidentApi.list({
        record_type: "incident",
        current_state_id: stateId ?? undefined,
        page: 1,
        limit: FETCH_LIMIT,
        search: serverSearch,
        ...scope,
      }),
    enabled: !!stateId,
    placeholderData: keepPreviousData,
  });
  const isLoading = stateId
    ? selectedStateQuery.isLoading
    : waitingQuery.isLoading || dispatchedQuery.isLoading;
  const selectedStateName =
    selectedStateQuery.data?.data?.[0]?.current_state?.name ?? "";

  const allIncidents = useMemo<DummyIncident[]>(
    () =>
      (stateId
        ? (selectedStateQuery.data?.data ?? [])
        : [
            ...(waitingQuery.data?.data ?? []),
            ...(dispatchedQuery.data?.data ?? []),
          ]
      ).map((inc) => {
        const base = toDispatchIncident(inc);
        return { ...base, ...overrides[base.id] };
      }),
    [
      stateId,
      selectedStateQuery.data,
      waitingQuery.data,
      dispatchedQuery.data,
      overrides,
    ],
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

  // The Dispatched tab spans several workflow states (dispatched, en route,
  // reached, completed), so membership comes from its query, not the status.
  const dispatchedIds = useMemo(
    () => new Set((dispatchedQuery.data?.data ?? []).map((inc) => inc.id)),
    [dispatchedQuery.data],
  );

  const incidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allIncidents.filter(
      (i) =>
        (stateId ||
          (tab === "dispatched") ===
            (dispatchedIds.has(i.id) ||
              overrides[i.id]?.status === "dispatched")) &&
        (!q ||
          [i.number, i.title, i.title_ar, i.location].some((v) =>
            v.toLowerCase().includes(q),
          )),
    );
  }, [allIncidents, tab, query, stateId, dispatchedIds, overrides]);

  const visible = incidents;
  // Only incidents with coordinates can be plotted on the map.
  const mappable = useMemo(() => incidents.filter(hasCoordinates), [incidents]);

  // Dropping an incident on a fire station pushes it to that station
  // (POST /dispatch/fcm/push, with the incident). The responders panel's Alert
  // button uses POST /dispatch/fire-station-alerts instead.
  const pushMutation = useMutation({
    mutationFn: (v: {
      serviceId: string;
      incidentId: string;
      via: "drop" | "alert";
    }) =>
      v.via === "drop"
        ? dispatcherApi.pushToFireStation(v.serviceId, v.incidentId)
        : dispatcherApi.alertFireStations([v.serviceId]),
  });

  const assign = (
    incidentId: string,
    target: IncidentMapMarker,
    via: "drop" | "alert" = "drop",
  ) => {
    // Only fire stations can be alerted; units have no assignment endpoint.
    if (target.kind !== "station") return;
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
        [incidentId]: {
          // Alerting a fire station doesn't move the incident between tabs.
          assignee: target.label,
        },
      }));
      toast.success(
        t(
          "dispatcher.incidentAssigned",
          "{{incident}} assigned to {{target}}",
          { incident: inc.number, target: target.label },
        ),
      );
    };
    pushMutation.mutate(
      { serviceId: target.id, incidentId, via },
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
    navigate(
      `/dispatcher/${next}${stateId ? `?current_state_id=${encodeURIComponent(stateId)}` : ""}`,
      {
        replace: true,
      },
    );

  return (
    <>
      <div className="flex h-[calc(100vh-70px-1rem)] min-h-0 w-full overflow-hidden lg:h-[calc(100vh-70px-2rem)]">
        <div className="flex min-h-0 w-full max-w-[19rem] shrink-0 flex-col border-e border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="space-y-2.5 border-b border-[hsl(var(--border))] p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(
                    "dispatcher.searchIncidents",
                    "Search incidents...",
                  )}
                  className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] ps-9 pe-8 text-sm outline-none transition focus:border-primary focus:bg-[hsl(var(--card))] focus:ring-2 focus:ring-primary/20"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label={t("common.clear", "Clear")}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setFireStationModalOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm transition hover:opacity-90"
                aria-label={t("common.create", "Create")}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {stateId ? (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                <span className="truncate">
                  {selectedStateName || t("dispatcher.status", "Status")}
                </span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-white">
                  {selectedStateQuery.data?.total_items ?? incidents.length}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/dispatcher")}
                  className="ms-auto rounded p-0.5 hover:bg-primary/20"
                  aria-label={t("common.clear", "Clear")}
                  title={t(
                    "dispatcher.backToDispatch",
                    "Back to dispatch tabs",
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-1 rounded-lg bg-[hsl(var(--muted))] p-1">
                {tabs.map((tb) => (
                  <button
                    key={tb.key}
                    type="button"
                    onClick={() => setTab(tb.key)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition",
                      tab === tb.key
                        ? "bg-[hsl(var(--card))] text-primary shadow-sm"
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                    )}
                  >
                    <span className="truncate">{tb.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                        tab === tb.key
                          ? "bg-primary text-white"
                          : "bg-[hsl(var(--border))]",
                      )}
                    >
                      {counts[tb.key]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[hsl(var(--muted)/0.3)] p-2">
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
                    "w-full rounded-lg border border-s-4 bg-[hsl(var(--card))] p-3 text-start shadow-sm transition hover:shadow-md",
                    PRIORITY_BORDER[i.priority] ?? "border-s-slate-400",
                    id === i.id
                      ? "border-primary ring-1 ring-primary"
                      : "border-[hsl(var(--border))]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">
                      {i.number}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                        PRIORITY_BADGE[i.priority] ??
                          "bg-slate-500/10 text-slate-600",
                      )}
                    >
                      {i.priorityName}
                    </span>
                    {i.slaBreached ? (
                      <span
                        title={t("incidents.slaBreached", "SLA breached")}
                        className="flex items-center gap-0.5 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                      >
                        <TriangleAlert className="h-3 w-3" />
                        SLA
                      </span>
                    ) : null}
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
                      className="ms-auto rounded-md p-1 text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">
                    {i18n.language === "ar" ? i.title_ar : i.title}
                  </div>
                  {i.location ? (
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{i.location}</span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>
                      {new Date(i.reportedAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {i.assignee !== "Unassigned" ? (
                      <span className="ms-auto flex min-w-0 items-center gap-1">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{i.assignee}</span>
                      </span>
                    ) : null}
                  </div>
                  {i.stateName || i.department || i.source ? (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-[hsl(var(--border))] pt-2 text-[10px]">
                      {i.stateName ? (
                        <span
                          className="max-w-[10rem] truncate rounded px-1.5 py-0.5 font-semibold text-white"
                          style={{
                            background: i.stateColor ?? STATUS_COLORS[i.status],
                          }}
                        >
                          {i.stateName}
                        </span>
                      ) : null}
                      {i.department ? (
                        <span className="max-w-[10rem] truncate rounded bg-[hsl(var(--muted))] px-1.5 py-0.5">
                          {i.department}
                        </span>
                      ) : null}
                      {i.source ? (
                        <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5">
                          {i.source}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
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
            onAlertIncident={(incidentId, target) =>
              assign(incidentId, target, "alert")
            }
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
