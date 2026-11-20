import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INCIDENT_DRAG_TYPE,
  type IncidentMapMarker,
} from "../../components/dispatcher/incidentMap.types";
import { useFireStations } from "./useDispatchData";
import type { DummyIncident } from "./dummyIncidents";

const SHOWN = 6;

const km = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const r = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * r;
  const dLng = (b.longitude - a.longitude) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

/**
 * While an incident card is being dragged, shows the nearest fire stations as
 * big drop targets along the bottom of the map, so alerting a station never
 * needs a precise drop on a small (or far away, or clustered) pin.
 */
export function StationDropDock({
  incidents,
  onDrop,
}: {
  incidents: DummyIncident[];
  // eslint-disable-next-line no-unused-vars
  onDrop: (incidentId: string, target: IncidentMapMarker) => void;
}) {
  const { t, i18n } = useTranslation();
  const { stations } = useFireStations(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    const start = (e: DragEvent) => {
      // Runs after the card's own dragstart handler has filled dataTransfer.
      if (e.dataTransfer?.types.includes(INCIDENT_DRAG_TYPE)) {
        setDraggingId(
          // getData is protected during dragstart in some browsers, so fall
          // back to the id the card put in text/plain (incident number).
          e.dataTransfer.getData(INCIDENT_DRAG_TYPE) ||
            incidents.find(
              (i) => i.number === e.dataTransfer?.getData("text/plain"),
            )?.id ||
            null,
        );
      }
    };
    const end = () => {
      setDraggingId(null);
      setOverId(null);
    };
    window.addEventListener("dragstart", start);
    window.addEventListener("dragend", end);
    window.addEventListener("drop", end, true);
    return () => {
      window.removeEventListener("dragstart", start);
      window.removeEventListener("dragend", end);
      window.removeEventListener("drop", end, true);
    };
  }, [incidents]);

  const incident = draggingId
    ? incidents.find((i) => i.id === draggingId)
    : undefined;

  const nearest = useMemo(() => {
    if (!incident) return [];
    const hasPos =
      Number.isFinite(incident.latitude) && Number.isFinite(incident.longitude);
    return [...stations]
      .sort((a, b) =>
        hasPos
          ? km(incident, a) - km(incident, b)
          : a.name.localeCompare(b.name),
      )
      .slice(0, SHOWN)
      .map((s) => ({
        s,
        dist: hasPos ? km(incident, s) : null,
      }));
  }, [incident, stations]);

  if (!incident) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-[1250] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-xl">
      <p className="mb-1.5 px-1 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
        {t("dispatcher.dropOnStation", "Drop {{incident}} on a fire station", {
          incident: incident.number,
        })}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {nearest.map(({ s, dist }) => {
          const name = i18n.language === "ar" && s.name_ar ? s.name_ar : s.name;
          return (
            <div
              key={s.id}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(INCIDENT_DRAG_TYPE)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverId(s.id);
              }}
              onDragLeave={() => setOverId((v) => (v === s.id ? null : v))}
              onDrop={(e) => {
                const id = e.dataTransfer.getData(INCIDENT_DRAG_TYPE);
                if (!id) return;
                e.preventDefault();
                setOverId(null);
                onDrop(id, {
                  id: s.id,
                  latitude: s.latitude,
                  longitude: s.longitude,
                  label: name,
                  kind: "station",
                });
              }}
              className={cn(
                "flex min-w-[8.5rem] shrink-0 flex-col items-start gap-0.5 rounded-lg border-2 border-dashed px-3 py-2 transition",
                overId === s.id
                  ? "border-primary bg-primary/10"
                  : "border-[hsl(var(--border))]",
              )}
            >
              <Flame className="h-4 w-4 text-red-600" />
              <span className="max-w-[10rem] truncate text-xs font-semibold">
                {name}
              </span>
              {dist != null ? (
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {dist.toFixed(1)} km
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
