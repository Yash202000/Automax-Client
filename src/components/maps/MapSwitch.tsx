import type { ReactNode } from "react";
import { useMapProvider } from "../../utils/mapProvider";
import GoogleMapBoundary from "./google/GoogleMapBoundary";

// Shows the Google version of a map when a Google Maps key is configured (and
// working), otherwise the Leaflet + OSM version. The boundary stays mounted
// across the switch so that a Google error while it's torn down — or at any
// other time — falls back to OSM instead of crashing the page.
export default function MapSwitch({
  google,
  osm,
}: {
  google: ReactNode;
  osm: ReactNode;
}) {
  const { provider } = useMapProvider();
  return (
    <GoogleMapBoundary fallback={osm}>
      {provider === "google" ? google : osm}
    </GoogleMapBoundary>
  );
}
