import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Flame, MapPin, Truck, X } from "lucide-react";
import type { Resource, ServicePoint } from "../../api/dispatcher";
import { useUnitTypes } from "./useDispatchData";

export type MapEntity = { kind: "station" | "unit"; id: string };

const STATUS: Record<NonNullable<Resource["status"]>, [string, string]> = {
  available: ["dispatcher.resourceStatus.available", "Available"],
  offered: ["dispatcher.resourceStatus.offered", "Offered"],
  dispatched: ["dispatcher.resourceStatus.dispatched", "Dispatched"],
  maintenance: ["dispatcher.resourceStatus.maintenance", "Maintenance"],
};

const STATUS_COLOR: Record<NonNullable<Resource["status"]>, string> = {
  available: "#16a34a",
  offered: "#e0a800",
  dispatched: "#dc2626",
  maintenance: "#6b7280",
};

const Row = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div className="flex justify-between gap-3 text-xs">
      <span className="shrink-0 text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <span className="min-w-0 truncate text-end font-medium" title={value}>
        {value}
      </span>
    </div>
  ) : null;

/**
 * Detail card shown over the map when a fire station or unit pin is clicked.
 */
export function MapEntityCard({
  entity,
  servicePoints,
  resources,
  onClose,
}: {
  entity: MapEntity;
  servicePoints: ServicePoint[];
  resources: Resource[];
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { unitTypes } = useUnitTypes();
  const ar = i18n.language === "ar";

  const station =
    entity.kind === "station"
      ? servicePoints.find((s) => s.id === entity.id)
      : undefined;
  const unit =
    entity.kind === "unit"
      ? resources.find((r) => r.id === entity.id)
      : undefined;

  const unitsAtStation = useMemo(
    () =>
      station ? resources.filter((r) => r.service_point_id === station.id) : [],
    [resources, station],
  );

  if (!station && !unit) return null;

  const homeStation = unit?.service_point_id
    ? servicePoints.find((s) => s.id === unit.service_point_id)
    : undefined;
  const typeName = unit
    ? unitTypes.find((x) => x.id === unit.resource_type_id)?.name
    : undefined;
  const stationName = (s: ServicePoint) =>
    ar && s.alt_name ? s.alt_name : s.name;

  const title = station ? stationName(station) : unit!.unique_id || unit!.name;
  const statusKey = unit?.status;

  return (
    <div className="absolute end-3 top-3 z-[1100] w-72 max-w-[calc(100%-1.5rem)] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] p-3">
        <div className="rounded-md bg-primary/10 p-1.5 text-primary">
          {station ? (
            <Flame className="h-4 w-4" />
          ) : (
            <Truck className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" title={title}>
            {title}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            {station
              ? t("dispatcher.fireStation", "Fire station")
              : t("dispatcher.unit", "Unit")}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close", "Close")}
          className="rounded p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[50vh] space-y-1.5 overflow-y-auto p-3">
        {station ? (
          <>
            <Row
              label={t("dispatcher.altName", "Alternate name")}
              value={ar ? station.name : station.alt_name}
            />
            <Row
              label={t("dispatcher.location", "Location")}
              value={station.location_name}
            />
            <Row
              label={t("dispatcher.radioId", "Radio ID")}
              value={station.radio_id}
            />
            <Row
              label={t("dispatcher.coordinates", "Coordinates")}
              value={`${station.location.lat.toFixed(5)}, ${station.location.lng.toFixed(5)}`}
            />
            <div className="pt-1.5">
              <div className="mb-1 text-xs font-semibold">
                {t("dispatcher.unitsAtStation", "Units")} (
                {unitsAtStation.length})
              </div>
              {unitsAtStation.length === 0 ? (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t("dispatcher.noUnitsAtStation", "No units assigned")}
                </p>
              ) : (
                <ul className="space-y-1">
                  {unitsAtStation.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background: STATUS_COLOR[r.status ?? "available"],
                        }}
                      />
                      <span className="truncate">{r.unique_id || r.name}</span>
                      <span className="ms-auto text-[hsl(var(--muted-foreground))]">
                        {t(...STATUS[r.status ?? "available"])}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            {statusKey ? (
              <div className="flex items-center gap-2 pb-1 text-xs font-semibold">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: STATUS_COLOR[statusKey] }}
                />
                {t(...STATUS[statusKey])}
              </div>
            ) : null}
            <Row label={t("dispatcher.unitName", "Name")} value={unit!.name} />
            <Row label={t("dispatcher.unitType", "Type")} value={typeName} />
            <Row
              label={t("dispatcher.homeStation", "Home station")}
              value={homeStation ? stationName(homeStation) : undefined}
            />
            <Row
              label={t("dispatcher.plateNumber", "Plate number")}
              value={unit!.plate_number}
            />
            <Row
              label={t("dispatcher.callCode", "Call code")}
              value={unit!.call_code}
            />
            <Row
              label={t("dispatcher.radioId", "Radio ID")}
              value={unit!.radio_id}
            />
            <Row
              label={t("dispatcher.location", "Location")}
              value={unit!.location_name}
            />
            {typeof unit!.latitude === "number" &&
            typeof unit!.longitude === "number" ? (
              <div className="flex items-center gap-1.5 pt-1 text-xs text-[hsl(var(--muted-foreground))]">
                <MapPin className="h-3 w-3 shrink-0" />
                {unit!.latitude.toFixed(5)}, {unit!.longitude.toFixed(5)}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
