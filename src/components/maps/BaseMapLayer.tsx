import { TileLayer } from "react-leaflet";
import { OSM_ATTRIBUTION } from "../../utils/mapProvider";
import { getOsmTileUrl } from "../../utils/osmTileUrl";

// OSM basemap for a react-leaflet <MapContainer> (the map used by clients that
// don't have a Google Maps API key, or when Google is unavailable).
export default function BaseMapLayer() {
  return <TileLayer attribution={OSM_ATTRIBUTION} url={getOsmTileUrl()} />;
}
