import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, MapPin, Minimize2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import IncidentsMap from "../../components/dispatcher/IncidentsMap";
import type {
  FocusPoint,
  IncidentMapMarker,
} from "../../components/dispatcher/incidentMap.types";
import { useMapProvider } from "../../utils/mapProvider";
import {
  searchGooglePlaces,
  type PlaceSuggestion,
} from "../../utils/googleGeo";
import { DUMMY_FIRE_STATIONS } from "../../api/dispatcher";
import {
  DUMMY_UNITS,
  STATUS_COLORS,
  type DummyIncident,
} from "./dummyIncidents";

type Layer = "all" | "stations" | "units";

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
}: {
  incidents: DummyIncident[];
  selectedId: string | null;
  // eslint-disable-next-line no-unused-vars
  onSelect: (id: string) => void;
  // eslint-disable-next-line no-unused-vars
  onDropIncident: (incidentId: string, target: IncidentMapMarker) => void;
}) {
  const { t, i18n } = useTranslation();
  const [layer, setLayer] = useState<Layer>("all");
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

  const markers = useMemo<IncidentMapMarker[]>(() => {
    const out: IncidentMapMarker[] = [];
    // Incidents are always plotted; the switch only adds stations/units.
    for (const i of incidents)
      out.push({
        id: i.id,
        latitude: i.latitude,
        longitude: i.longitude,
        label: i.number,
        color: STATUS_COLORS[i.status],
        kind: "incident",
      });
    if (layer === "all" || layer === "stations") {
      for (const s of DUMMY_FIRE_STATIONS)
        out.push({
          id: s.id,
          latitude: s.latitude,
          longitude: s.longitude,
          label: i18n.language === "ar" && s.name_ar ? s.name_ar : s.name,
          color: STATION_COLOR,
          kind: "station",
        });
    }
    if (layer === "all" || layer === "units") {
      for (const u of DUMMY_UNITS)
        out.push({
          id: u.id,
          latitude: u.latitude,
          longitude: u.longitude,
          label: u.name,
          color: UNIT_COLOR,
          kind: "unit",
        });
    }
    return out;
  }, [layer, incidents, i18n.language]);

  const handleSelect = useCallback(
    (id: string) => {
      if (incidents.some((i) => i.id === id)) onSelect(id);
    },
    [incidents, onSelect],
  );

  const options: { key: Layer; label: string }[] = [
    { key: "all", label: t("dispatcher.all", "All") },
    { key: "stations", label: t("dispatcher.fireStations", "Fire stations") },
    { key: "units", label: t("dispatcher.units", "Units") },
  ];

  return (
    <div
      className={cn(
        "flex w-full flex-col bg-[hsl(var(--background))]",
        maximized ? "fixed inset-0 z-[1300] h-screen" : "h-full min-h-[320px]",
      )}
    >
      <div className="relative z-[1200] flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2">
        <div className="inline-flex rounded-lg border border-[hsl(var(--border))] p-0.5">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setLayer(o.key)}
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
        />
      </div>
    </div>
  );
}
