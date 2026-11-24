import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { MapDefaultCenter } from "../../../api/mapConfig";

// The configured default center (Settings → Map) loads after the map mounts.
// Move there when it arrives, but only while `enabled` (e.g. the map has no
// pins of its own to fit to).
export default function GoogleDefaultView({
  center,
  enabled,
}: {
  center: MapDefaultCenter;
  enabled: boolean;
}) {
  const map = useMap();
  const { latitude, longitude, zoom } = center;
  useEffect(() => {
    if (!map || !enabled) return;
    map.panTo({ lat: latitude, lng: longitude });
    map.setZoom(zoom);
    // Only when the configured center itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, latitude, longitude, zoom]);
  return null;
}
