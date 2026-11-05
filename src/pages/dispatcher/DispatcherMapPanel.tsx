import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import IncidentsMap from "../../components/dispatcher/IncidentsMap";
import type { IncidentMapMarker } from "../../components/dispatcher/incidentMap.types";
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
    <div className="flex h-full w-full min-h-[320px] flex-col">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2">
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
        <span className="ms-auto flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {t("dispatcher.itemsOnMap", "{{count}} on map", {
            count: markers.length,
          })}
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <IncidentsMap
          markers={markers}
          selectedId={selectedId}
          onSelect={handleSelect}
          onDropIncident={onDropIncident}
        />
      </div>
    </div>
  );
}
