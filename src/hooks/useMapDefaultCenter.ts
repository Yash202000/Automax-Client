import { useQuery } from "@tanstack/react-query";
import {
  FALLBACK_MAP_CENTER,
  MAP_DEFAULT_CENTER_QUERY_KEY,
  mapConfigApi,
  type MapDefaultCenter,
} from "../api/mapConfig";

/**
 * The configured default map center (Settings → Map), or the fallback while
 * it loads, when it isn't set, or if the request fails.
 */
export function useMapDefaultCenter(): MapDefaultCenter {
  const { data } = useQuery({
    queryKey: MAP_DEFAULT_CENTER_QUERY_KEY,
    queryFn: mapConfigApi.getDefaultCenter,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return data ?? FALLBACK_MAP_CENTER;
}
