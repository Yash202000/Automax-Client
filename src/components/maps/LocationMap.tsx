import GoogleLocationMap from "./GoogleLocationMap";
import LeafletLocationMap, {
  type LocationMapProps,
} from "./LeafletLocationMap";
import MapSwitch from "./MapSwitch";

// Map of locations/incidents. Native Google Maps when a key is configured (and
// working), otherwise the Leaflet + OSM map.
export default function LocationMap(props: LocationMapProps) {
  return (
    <MapSwitch
      google={<GoogleLocationMap {...props} />}
      osm={<LeafletLocationMap {...props} />}
    />
  );
}
