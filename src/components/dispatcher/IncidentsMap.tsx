import MapSwitch from "../maps/MapSwitch";
import IncidentsGoogleMap from "./IncidentsGoogleMap";
import IncidentsLeafletMap from "./IncidentsLeafletMap";
import type { IncidentsMapProps } from "./incidentMap.types";

// Native Google Maps when a key is configured (and working), otherwise the
// Leaflet + OSM map.
export default function IncidentsMap(props: IncidentsMapProps) {
  return (
    <MapSwitch
      google={<IncidentsGoogleMap {...props} />}
      osm={<IncidentsLeafletMap {...props} />}
    />
  );
}
