import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Route,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui";
import type { IncidentMapMarker } from "../../components/dispatcher/incidentMap.types";
import { useMapProvider } from "../../utils/mapProvider";
import {
  formatDistance,
  formatDuration,
  getRoadRoutes,
  getRoutePath,
  straightLineKm,
  type LatLng,
} from "../../utils/roadRoute";
import type { DummyIncident } from "./dummyIncidents";
import { useFireStations, useMapUnits } from "./useDispatchData";

const STATUS_LABELS: Record<string, [string, string]> = {
  available: ["dispatcher.resourceStatus.available", "Available"],
  offered: ["dispatcher.resourceStatus.offered", "Offered"],
  dispatched: ["dispatcher.resourceStatus.dispatched", "Dispatched"],
  maintenance: ["dispatcher.resourceStatus.maintenance", "Maintenance"],
};

/** How often unit positions are re-read; a moved unit re-routes on its own. */
const UNIT_REFRESH_MS = 15_000;
/** ~11 m grid: GPS jitter is ignored, a real move changes the key. */
const round = (n: number) => n.toFixed(4);

/** Candidates routed per incident, shortlisted by straight-line distance. */
const SHORTLIST = 10;
/** Responders listed. */
const SHOWN = 5;

type Filter = "all" | "station" | "unit";

interface Candidate {
  id: string;
  kind: "station" | "unit";
  name: string;
  point: LatLng;
  status?: string;
}

/**
 * Nearest fire stations and units to the selected incident by exact road
 * route (Google Routes on the Google map, OSRM on the OSM map). Picking a row
 * draws its route on the map; the action button alerts that responder.
 */
export function NearestRespondersPanel({
  incident,
  onRoute,
  onAlert,
}: {
  incident: DummyIncident;
  // eslint-disable-next-line no-unused-vars
  onRoute: (path: LatLng[] | null) => void;
  // eslint-disable-next-line no-unused-vars
  onAlert: (incidentId: string, target: IncidentMapMarker) => void;
}) {
  const { t, i18n } = useTranslation();
  // Routing follows the map: Google Routes on the Google map, OSRM on OSM.
  const { provider } = useMapProvider();
  const { stations } = useFireStations(true);
  const { units } = useMapUnits(true, UNIT_REFRESH_MS);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // The incident is the DESTINATION: every route runs responder → incident.
  const incidentPoint = useMemo<LatLng>(
    () => ({ latitude: incident.latitude, longitude: incident.longitude }),
    [incident.latitude, incident.longitude],
  );

  const candidates = useMemo<Candidate[]>(() => {
    const all: Candidate[] = [
      ...stations.map((s) => ({
        id: s.id,
        kind: "station" as const,
        name: i18n.language === "ar" && s.name_ar ? s.name_ar : s.name,
        point: { latitude: s.latitude, longitude: s.longitude },
      })),
      ...units
        .filter((u) => u.status !== "maintenance")
        .map((u) => ({
          id: u.id,
          kind: "unit" as const,
          name: u.name,
          point: { latitude: u.latitude, longitude: u.longitude },
          status: u.status,
        })),
    ];
    return all
      .sort(
        (a, b) =>
          straightLineKm(incidentPoint, a.point) -
          straightLineKm(incidentPoint, b.point),
      )
      .slice(0, SHORTLIST);
  }, [stations, units, incidentPoint, i18n.language]);

  // Key on identity AND position, so a unit that moves is re-routed from its
  // new coordinates (positions are re-read every UNIT_REFRESH_MS).
  const candidateKey = candidates
    .map(
      (c) => `${c.id}@${round(c.point.latitude)},${round(c.point.longitude)}`,
    )
    .join("|");
  const routesQuery = useQuery({
    queryKey: [
      "dispatcher",
      "road-routes",
      provider,
      incident.id,
      incidentPoint.latitude,
      incidentPoint.longitude,
      candidateKey,
    ],
    queryFn: () =>
      getRoadRoutes(
        provider,
        candidates.map((c) => ({ id: c.id, point: c.point })),
        incidentPoint,
      ),
    enabled: candidates.length > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const ranked = useMemo(() => {
    const byId = new Map(
      (routesQuery.data?.routes ?? []).map((r) => [r.id, r]),
    );
    return candidates
      .flatMap((c) => {
        const r = byId.get(c.id);
        return r ? [{ ...c, ...r }] : [];
      })
      .sort((a, b) => a.distanceM - b.distanceM);
  }, [candidates, routesQuery.data]);

  const rows = ranked
    .filter((r) => filter === "all" || r.kind === filter)
    .slice(0, SHOWN);
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  // Draw the chosen responder's route.
  const selectedPoint = selected?.point;
  const pathQuery = useQuery({
    queryKey: [
      "dispatcher",
      "road-path",
      provider,
      incident.id,
      selected?.id,
      selectedPoint ? round(selectedPoint.latitude) : null,
      selectedPoint ? round(selectedPoint.longitude) : null,
    ],
    queryFn: () =>
      getRoutePath(provider, selectedPoint as LatLng, incidentPoint),
    enabled: !!selectedPoint,
    staleTime: 60_000,
  });
  const path = pathQuery.data?.path;
  useEffect(() => {
    onRoute(path ?? null);
  }, [path, onRoute]);
  // Clear the route when leaving the incident / closing the panel.
  useEffect(() => () => onRoute(null), [onRoute]);

  const counts = {
    all: ranked.length,
    station: ranked.filter((r) => r.kind === "station").length,
    unit: ranked.filter((r) => r.kind === "unit").length,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("dispatcher.all", "All") },
    { key: "station", label: t("dispatcher.fireStations", "Fire stations") },
    { key: "unit", label: t("dispatcher.units", "Units") },
  ];

  const alertSelected = () => {
    if (!selected) return;
    onAlert(incident.id, {
      id: selected.id,
      latitude: selected.point.latitude,
      longitude: selected.point.longitude,
      label: selected.name,
      kind: selected.kind,
    });
  };

  const body = () => {
    if (routesQuery.isLoading)
      return t("dispatcher.routingLoading", "Calculating road routes…");
    if (routesQuery.isError)
      return t(
        "dispatcher.routingFailed",
        "Couldn't calculate road routes. Try again later.",
      );
    if (rows.length === 0)
      return t(
        "dispatcher.noResponders",
        "No reachable fire stations or units nearby.",
      );
    return null;
  };
  const message = body();

  return (
    <div className="absolute bottom-3 start-3 z-[1100] w-[min(24rem,calc(100%-1.5rem))] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-start"
      >
        <Route className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">
          {t("dispatcher.nearestResponders", "Nearest responders")}
        </span>
        <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
          {incident.number}
        </span>
        <span className="ms-auto text-[hsl(var(--muted-foreground))]">
          {collapsed ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>
      {collapsed ? null : (
        <div className="space-y-2 border-t border-[hsl(var(--border))] p-3">
          <div className="flex gap-1 rounded-lg bg-[hsl(var(--muted))] p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-xs font-semibold transition",
                  filter === f.key
                    ? "bg-[hsl(var(--card))] text-primary shadow-sm"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                {f.label} ({counts[f.key]})
              </button>
            ))}
          </div>

          {message ? (
            <p className="flex items-center gap-1.5 py-3 text-xs text-[hsl(var(--muted-foreground))]">
              {routesQuery.isError ? (
                <TriangleAlert className="h-3.5 w-3.5 text-rose-600" />
              ) : null}
              {message}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((r, idx) => {
                const isSel = r.id === selected?.id;
                const statusEntry =
                  r.kind === "unit" && r.status
                    ? STATUS_LABELS[r.status]
                    : undefined;
                const statusLabel = statusEntry ? t(...statusEntry) : null;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border p-2 text-start transition hover:border-[hsl(var(--primary)/0.5)]",
                        isSel
                          ? "border-primary ring-1 ring-primary"
                          : "border-[hsl(var(--border))]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                          idx === 0 ? "bg-primary" : "bg-slate-500",
                        )}
                      >
                        {idx + 1}
                      </span>
                      {r.kind === "station" ? (
                        <Building2 className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                      ) : (
                        <Truck className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {r.name}
                        </span>
                        <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                          {formatDistance(r.distanceM)} ·{" "}
                          {t("dispatcher.eta", "ETA")}{" "}
                          {formatDuration(r.durationS)}
                        </span>
                      </span>
                      {statusLabel ? (
                        <span className="shrink-0 rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px] font-semibold">
                          {statusLabel}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {provider === "google" && routesQuery.data?.source === "osrm" ? (
            <p className="text-[10px] text-amber-700">
              {t(
                "dispatcher.googleRoutingFallback",
                "Google routing is unavailable, showing OpenStreetMap routes.",
              )}
            </p>
          ) : null}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {provider === "google"
                ? t("dispatcher.routeByGoogle", "Road routes by Google")
                : t("dispatcher.routeByOsrm", "Road routes by OpenStreetMap")}
            </span>
            <Button
              size="sm"
              className="ms-auto"
              onClick={alertSelected}
              disabled={!selected}
            >
              {selected
                ? t("dispatcher.alertTarget", "Alert {{name}}", {
                    name: selected.name,
                  })
                : t("dispatcher.alert", "Alert")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
