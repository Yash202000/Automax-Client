import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  resourceApi,
  servicePointApi,
  unitTypeApi,
  type UnitType,
  type FireStation,
  type Resource,
  type ServicePoint,
} from "../../api/dispatcher";

/** A unit that can be plotted on the dispatcher map. */
export interface MapUnit {
  id: string;
  name: string;
  status?: Resource["status"];
  latitude: number;
  longitude: number;
}

const isActive = (x: { is_active?: boolean }) => x.is_active !== false;

const toFireStation = (s: ServicePoint): FireStation => ({
  id: s.id,
  name: s.name,
  name_ar: s.alt_name ?? undefined,
  location_name: s.location_name ?? "",
  // The service-point API has no address/phone; the UI hides empty values.
  address: "",
  phone: "",
  latitude: s.location.lat,
  longitude: s.location.lng,
});

const STALE_MS = 60_000;

/** Active fire stations (service points) from the dispatch API. */
export function useFireStations(enabled = true) {
  const query = useQuery({
    queryKey: ["dispatcher", "service-points", "all"],
    queryFn: servicePointApi.all,
    enabled,
    staleTime: STALE_MS,
  });
  const stations = useMemo(
    () =>
      (query.data ?? [])
        .filter(
          (s) =>
            isActive(s) &&
            Number.isFinite(s.location?.lat) &&
            Number.isFinite(s.location?.lng),
        )
        .map(toFireStation),
    [query.data],
  );
  return {
    stations,
    /** Full service-point records (for detail views). */
    servicePoints: query.data ?? [],
    isLoading: query.isLoading,
  };
}

/** Active units (resources) that have a known position. */
export function useMapUnits(enabled = true, refetchMs?: number) {
  const query = useQuery({
    queryKey: ["dispatcher", "resources", "all"],
    queryFn: resourceApi.all,
    enabled,
    staleTime: refetchMs ? 0 : STALE_MS,
    refetchInterval: refetchMs ?? false,
  });
  const units = useMemo<MapUnit[]>(
    () =>
      (query.data ?? [])
        .filter(
          (r) =>
            isActive(r) &&
            typeof r.latitude === "number" &&
            typeof r.longitude === "number",
        )
        .map((r) => ({
          id: r.id,
          name: r.unique_id || r.name,
          status: r.status,
          latitude: r.latitude as number,
          longitude: r.longitude as number,
        })),
    [query.data],
  );
  return {
    units,
    /** Full resource records (for detail views). */
    resources: query.data ?? [],
    isLoading: query.isLoading,
  };
}

/** Unit types, for showing a unit's type name. */
export function useUnitTypes(enabled = true) {
  const query = useQuery<UnitType[]>({
    queryKey: ["dispatcher", "resource-types", "all"],
    queryFn: unitTypeApi.all,
    enabled,
    staleTime: STALE_MS,
  });
  return { unitTypes: query.data ?? [] };
}
