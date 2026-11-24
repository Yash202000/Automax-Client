import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_MAP_CONFIG,
  FALLBACK_MAP_CENTER,
  MAP_CONFIG_QUERY_KEY,
  mapConfigApi,
  type MapDefaultCenter,
} from "../api/mapConfig";

// One request (map/map_config) shared by every map on the page.
function useMapConfigQuery() {
  return useQuery({
    queryKey: MAP_CONFIG_QUERY_KEY,
    queryFn: mapConfigApi.get,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/**
 * The configured default map center (Settings → Map configuration), or the
 * fallback while it loads, when it isn't set, or if the request fails.
 */
export function useMapDefaultCenter(): MapDefaultCenter {
  const { data } = useMapConfigQuery();
  return data?.default_center ?? FALLBACK_MAP_CENTER;
}

/**
 * Whether maps show the address search box (Settings → Map configuration).
 * Hidden while the setting loads so it doesn't flash in and out; on when it
 * isn't set or the request fails.
 */
export function useMapSearchEnabled(): boolean {
  const { data, isPending, isError } = useMapConfigQuery();
  if (isError) return DEFAULT_MAP_CONFIG.search_enabled;
  if (isPending) return false;
  return data.search_enabled;
}
