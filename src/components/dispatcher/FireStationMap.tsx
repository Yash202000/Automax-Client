import MapSwitch from "../maps/MapSwitch";
import FireStationGoogleMap from "./FireStationGoogleMap";
import FireStationLeafletMap from "./FireStationLeafletMap";
import type { FireStationMapProps } from "./fireStationMap.types";

// Native Google Maps when a key is configured (and working), otherwise the
// Leaflet + OSM map.
export default function FireStationMap(props: FireStationMapProps) {
  return (
    <MapSwitch
      google={<FireStationGoogleMap {...props} />}
      osm={<FireStationLeafletMap {...props} />}
    />
  );
}
