import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Maximize2, MapPin, Minimize2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import IncidentsMap from "../../components/dispatcher/IncidentsMap";
import type {
  FocusPoint,
  IncidentMapMarker,
  MapLink,
} from "../../components/dispatcher/incidentMap.types";
import { useMapProvider } from "../../utils/mapProvider";
import {
  searchGooglePlaces,
  type PlaceSuggestion,
} from "../../utils/googleGeo";
import { incidentApi } from "../../api/admin";
import { getRoutePath } from "../../utils/roadRoute";
import { hasCoordinates, toDispatchIncident } from "./incidentAdapter";
import { STATUS_COLORS, type DummyIncident } from "./dummyIncidents";
import { useFireStations, useMapUnits } from "./useDispatchData";
import { NearestRespondersPanel } from "./NearestRespondersPanel";
import { StationDropDock } from "./StationDropDock";
import { MapEntityCard, type MapEntity } from "./MapEntityCard";

type Layer = "all" | "stations" | "units";
/**
 * default: incidents plus the chosen layer.
 * live: units only, refreshed every few seconds.
 * incident: incidents only (just the selected one when there is one).
 */
type Mode = "default" | "live" | "incident";

const LIVE_REFRESH_MS = 3_000;
/** Most unit → incident road routes drawn at once. */
const MAX_ROUTED_LINKS = 15;

/** "Show closest N" choices; 0 shows everything. */
const CLOSEST_OPTIONS = [2, 5, 10, 20];

/** Great-circle distance in km. */
function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const STATION_COLOR = "#dc2626";
const UNIT_COLOR = "#2563eb";

/**
 * Map of (dummy) incidents, fire stations and units. Incidents are always
 * shown; the switch above the map adds fire stations, units, or both.
 * Only incident pins are selectable.
 */
export function DispatcherMapPanel({
  incidents,
  selectedId,
  onSelect,
  onDropIncident,
  onAlertIncident,
}: {
  incidents: DummyIncident[];
  selectedId: string | null;
  // eslint-disable-next-line no-unused-vars
  onSelect: (id: string) => void;
  // eslint-disable-next-line no-unused-vars
  onDropIncident: (incidentId: string, target: IncidentMapMarker) => void;
  /** The responders panel's Alert button (defaults to the drop handler). */
  // eslint-disable-next-line no-unused-vars
  onAlertIncident?: (incidentId: string, target: IncidentMapMarker) => void;
}) {
  const { t, i18n } = useTranslation();
  const [layer, setLayer] = useState<Layer>("all");
  const [mode, setMode] = useState<Mode>("default");
  // 0 = all; otherwise only the N stations/units closest to the selected incident.
  const [closest, setClosest] = useState(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);

  // Escape leaves the maximized view.
  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaximized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maximized]);
  const [focus, setFocus] = useState<FocusPoint | null>(null);

  const { provider } = useMapProvider();
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Same geocoders as the location picker: Google Places when the map is
  // Google, otherwise OpenStreetMap Nominatim.
  const runSearch = async (q: string) => {
    setSearching(true);
    try {
      if (provider === "google") {
        setResults(await searchGooglePlaces(q));
      } else {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
          {
            headers: {
              "Accept-Language": i18n.language === "ar" ? "ar" : "en",
            },
          },
        );
        const data: { display_name: string; lat: string; lon: string }[] =
          res.ok ? await res.json() : [];
        setResults(
          data.map((r) => ({
            label: r.display_name,
            resolve: async () => ({
              latitude: parseFloat(r.lat),
              longitude: parseFloat(r.lon),
            }),
          })),
        );
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onQueryChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    clearTimeout(timer.current);
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(() => runSearch(value.trim()), 500);
  };

  const goTo = async (r: PlaceSuggestion) => {
    try {
      const loc = await r.resolve();
      setQuery(r.label);
      setOpen(false);
      setFocus((prev) => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        label: r.label.split(",")[0],
        nonce: (prev?.nonce ?? 0) + 1,
      }));
    } catch {
      setResults([]);
    }
  };

  const clearSearch = () => {
    clearTimeout(timer.current);
    setResults([]);
    setQuery("");
    setOpen(false);
    setFocus(null);
  };

  // Stations/units are only fetched once their layer is shown.
  const showStations =
    mode === "default" && (layer === "all" || layer === "stations");
  const showUnits =
    mode === "live" ||
    (mode === "default" && (layer === "all" || layer === "units"));
  const showIncidents = mode !== "live";
  const { stations, servicePoints } = useFireStations(showStations);
  const { units, resources } = useMapUnits(
    showUnits,
    mode === "live" ? LIVE_REFRESH_MS : undefined,
  );
  const [entity, setEntity] = useState<MapEntity | null>(null);

  // Live tracking: each unit's assigned incident (`incident_id` on the unit).
  // Known incidents come from the list; the rest are fetched by id.
  const assignedIds = useMemo(
    () =>
      mode === "live"
        ? Array.from(
            new Set(
              units.map((u) => u.incidentId).filter((x): x is string => !!x),
            ),
          )
        : [],
    [mode, units],
  );
  const missingIds = assignedIds.filter(
    (id) => !incidents.some((i) => i.id === id),
  );
  const fetched = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: ["incidents", "dispatcher", "detail", id],
      queryFn: () => incidentApi.getById(id),
      staleTime: 60_000,
    })),
  });
  const assignedIncidents = useMemo(() => {
    const byId = new Map<string, DummyIncident>();
    for (const id of assignedIds) {
      const known = incidents.find((i) => i.id === id);
      if (known) byId.set(id, known);
    }
    for (const q of fetched) {
      const inc = q.data?.data;
      if (inc) byId.set(inc.id, toDispatchIncident(inc));
    }
    return byId;
  }, [assignedIds, incidents, fetched]);
  const [routePath, setRoutePath] = useState<
    { latitude: number; longitude: number }[] | null
  >(null);
  const selectedIncident = selectedId
    ? incidents.find((i) => i.id === selectedId)
    : undefined;

  // Unit → incident pairs to draw (capped so routing stays cheap).
  const pairs = useMemo(() => {
    if (mode !== "live") return [];
    const out: { unit: (typeof units)[number]; inc: DummyIncident }[] = [];
    for (const u of units) {
      const inc = u.incidentId
        ? assignedIncidents.get(u.incidentId)
        : undefined;
      if (inc && hasCoordinates(inc)) out.push({ unit: u, inc });
    }
    return out.slice(0, MAX_ROUTED_LINKS);
  }, [mode, units, assignedIncidents]);

  // Road route per pair, fetched once and refreshed every 30 s, not on every
  // 3 s position tick. The line is re-anchored to the unit's live position.
  const routeQueries = useQueries({
    queries: pairs.map(({ unit, inc }) => ({
      queryKey: [
        "dispatcher",
        "unit-route",
        provider,
        unit.id,
        inc.id,
        inc.latitude.toFixed(4),
        inc.longitude.toFixed(4),
      ],
      queryFn: () => getRoutePath(provider, unit, inc),
      staleTime: 30_000,
      refetchInterval: 30_000,
      placeholderData: keepPreviousData,
      retry: false,
    })),
  });
  const links = useMemo<MapLink[]>(() => {
    const out: MapLink[] = [];
    pairs.forEach(({ unit, inc }, idx) => {
      const q = routeQueries[idx];
      const road = q?.data?.path;
      if (road && road.length > 1) {
        out.push({
          id: unit.id,
          from: unit,
          to: inc,
          // Re-anchored to the unit's live position.
          path: [
            { latitude: unit.latitude, longitude: unit.longitude },
            ...road.slice(1),
          ],
        });
      } else if (q?.isError) {
        // Routing failed: a straight line is better than none.
        out.push({ id: unit.id, from: unit, to: inc });
      }
      // Still loading: draw nothing, so a straight line never flashes first.
    });
    return out;
  }, [pairs, routeQueries]);

  const markers = useMemo<IncidentMapMarker[]>(() => {
    const out: IncidentMapMarker[] = [];
    // Incidents are plotted except in live tracking; the layer switch adds
    // stations/units. "Show incident" narrows to the selected incident.
    const shownIncidents = showIncidents
      ? mode === "incident" && selectedId
        ? incidents.filter((i) => i.id === selectedId)
        : incidents
      : [];
    for (const i of shownIncidents)
      out.push({
        id: i.id,
        latitude: i.latitude,
        longitude: i.longitude,
        label: i.number,
        color: STATUS_COLORS[i.status],
        kind: i.status === "dispatched" ? "incident_dispatched" : "incident",
      });
    // With an incident selected, "show closest N" keeps only the N nearest
    // stations and units to it.
    const origin = selectedId
      ? incidents.find((i) => i.id === selectedId)
      : undefined;
    const nearest = <T extends { latitude: number; longitude: number }>(
      list: T[],
    ): T[] =>
      closest > 0 && origin
        ? [...list]
            .sort((a, b) => distanceKm(origin, a) - distanceKm(origin, b))
            .slice(0, closest)
        : list;
    if (showStations) {
      for (const s of nearest(stations))
        out.push({
          id: s.id,
          latitude: s.latitude,
          longitude: s.longitude,
          label: i18n.language === "ar" && s.name_ar ? s.name_ar : s.name,
          color: STATION_COLOR,
          kind: "station",
        });
    }
    if (mode === "live") {
      // Pins for the incidents the tracked units are working on.
      for (const i of assignedIncidents.values()) {
        if (!hasCoordinates(i)) continue;
        out.push({
          id: i.id,
          latitude: i.latitude,
          longitude: i.longitude,
          label: i.number,
          color: STATUS_COLORS[i.status],
          kind: i.status === "dispatched" ? "incident_dispatched" : "incident",
        });
      }
    }
    if (showUnits) {
      for (const u of nearest(units)) {
        const assigned = u.incidentId
          ? assignedIncidents.get(u.incidentId)
          : undefined;
        out.push({
          id: u.id,
          latitude: u.latitude,
          longitude: u.longitude,
          label: assigned ? `${u.name} → ${assigned.number}` : u.name,
          color: UNIT_COLOR,
          kind: "unit",
        });
      }
    }
    return out;
  }, [
    mode,
    closest,
    selectedId,
    showIncidents,
    showStations,
    showUnits,
    incidents,
    stations,
    units,
    assignedIncidents,
    i18n.language,
  ]);

  const handleSelect = useCallback(
    (id: string) => {
      if (incidents.some((i) => i.id === id)) {
        setEntity(null);
        onSelect(id);
      } else if (stations.some((s) => s.id === id)) {
        setEntity({ kind: "station", id });
      } else if (units.some((u) => u.id === id)) {
        setEntity({ kind: "unit", id });
      }
    },
    [incidents, stations, units, onSelect],
  );

  const options: { key: Layer; label: string }[] = [
    { key: "all", label: t("dispatcher.all", "All") },
    { key: "stations", label: t("dispatcher.fireStations", "Fire stations") },
    { key: "units", label: t("dispatcher.units", "Units") },
  ];

  const modes: { key: Mode; label: string }[] = [
    { key: "default", label: t("dispatcher.modeDefault", "Default mode") },
    { key: "live", label: t("dispatcher.modeLive", "Live tracking") },
    { key: "incident", label: t("dispatcher.modeIncident", "Show incident") },
  ];

  return (
    <div
      className={cn(
        "flex w-full flex-col bg-[hsl(var(--background))]",
        maximized
          ? "fixed inset-0 z-[1300] h-screen"
          : // isolate: keeps the header's/map's high z-indexes inside this
            // panel so modals opened over the page stay on top.
            "isolate h-full min-h-[320px]",
      )}
    >
      <div className="relative z-[1200] flex flex-wrap items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1.5">
        <div className="inline-flex rounded-lg border border-[hsl(var(--border))] p-0.5">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMode(m.key);
                setEntity(null);
              }}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                mode === m.key
                  ? "bg-primary text-white"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode !== "incident" ? (
          <select
            value={closest}
            onChange={(e) => setClosest(Number(e.target.value))}
            disabled={!selectedId}
            title={
              selectedId
                ? undefined
                : t(
                    "dispatcher.closestNeedsIncident",
                    "Select an incident to filter by distance",
                  )
            }
            aria-label={t("dispatcher.closest", "Show closest")}
            className="ms-auto h-8 rounded-md border border-[hsl(var(--border))] bg-transparent px-2 text-xs font-semibold outline-none disabled:opacity-50"
          >
            <option value={0}>{t("dispatcher.closestAll", "Show all")}</option>
            {CLOSEST_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {t("dispatcher.closestN", "Show closest {{count}}", {
                  count: n,
                })}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="relative z-[1200] flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2">
        {mode === "default" ? (
          <div className="inline-flex rounded-lg border border-[hsl(var(--border))] p-0.5">
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  setLayer(o.key);
                  setEntity(null);
                }}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                  layer === o.key
                    ? "bg-primary text-white"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="relative ms-2 w-72 max-w-[45%]">
          <Search className="pointer-events-none absolute start-2.5 top-2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) goTo(results[0]);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={t("dispatcher.searchMap", "Search the map")}
            className="h-8 w-full rounded-md border border-[hsl(var(--border))] bg-transparent ps-8 pe-7 text-xs outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={t("common.clear", "Clear")}
              className="absolute end-1.5 top-1.5 text-[hsl(var(--muted-foreground))]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          {open && query.trim().length >= 3 ? (
            <ul className="absolute start-0 top-9 w-full overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg">
              {searching ? (
                <li className="px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                  {t("common.loading", "Loading…")}
                </li>
              ) : results.length === 0 ? (
                <li className="px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                  {t("common.noResults", "No results")}
                </li>
              ) : (
                results.map((r, idx) => (
                  <li key={`${r.label}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => goTo(r)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-start text-xs hover:bg-[hsl(var(--muted))]"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="line-clamp-2">{r.label}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
        <span className="ms-auto flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {t("dispatcher.itemsOnMap", "{{count}} on map", {
            count: markers.length,
          })}
        </span>
        <button
          type="button"
          onClick={() => setMaximized((v) => !v)}
          title={
            maximized
              ? t("dispatcher.exitFullscreen", "Exit full screen")
              : t("dispatcher.maximizeMap", "Maximize map")
          }
          aria-label={
            maximized
              ? t("dispatcher.exitFullscreen", "Exit full screen")
              : t("dispatcher.maximizeMap", "Maximize map")
          }
          className="rounded-md border border-[hsl(var(--border))] p-1.5 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
        >
          {maximized ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <IncidentsMap
          markers={markers}
          selectedId={selectedId}
          onSelect={handleSelect}
          onDropIncident={onDropIncident}
          focusPoint={focus}
          routePath={routePath}
          links={links}
        />
        {mode !== "live" &&
        selectedIncident &&
        hasCoordinates(selectedIncident) ? (
          <NearestRespondersPanel
            key={selectedIncident.id}
            incident={selectedIncident}
            onRoute={setRoutePath}
            onAlert={onAlertIncident ?? onDropIncident}
          />
        ) : null}
        <StationDropDock incidents={incidents} onDrop={onDropIncident} />
        {entity ? (
          <MapEntityCard
            entity={entity}
            servicePoints={servicePoints}
            resources={resources}
            assignedIncident={(() => {
              const id = resources.find((r) => r.id === entity.id)?.incident_id;
              const inc = id ? assignedIncidents.get(id) : undefined;
              return inc ? { number: inc.number, title: inc.title } : undefined;
            })()}
            onClose={() => setEntity(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
