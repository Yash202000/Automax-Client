import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { Icon } from "leaflet";
import { MapContainer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { publicUrl } from "../../utils/publicUrl";
import MapSwitch from "./MapSwitch";
import BaseMapLayer from "./BaseMapLayer";
import MapFallbackNotice from "./MapFallbackNotice";
import GoogleBaseMap from "./google/GoogleBaseMap";

interface SingleLocationMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  // Scroll-wheel zoom (off for the small preview maps embedded in pages).
  scrollWheelZoom?: boolean;
  // Map-type and Street View controls (Google only; for larger maps).
  showMapControls?: boolean;
}

const leafletMarkerIcon = new Icon({
  iconUrl: publicUrl("images/leaflet/marker-icon.png"),
  iconRetinaUrl: publicUrl("images/leaflet/marker-icon-2x.png"),
  shadowUrl: publicUrl("images/leaflet/marker-shadow.png"),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// A read-only map with one marker. Native Google Maps when a key is configured
// (and working), Leaflet + OSM otherwise. Fills its (positioned) parent.
export default function SingleLocationMap({
  latitude,
  longitude,
  zoom = 15,
  scrollWheelZoom = false,
  showMapControls = false,
}: SingleLocationMapProps) {
  return (
    <MapSwitch
      google={
        <GoogleBaseMap
          defaultCenter={{ lat: latitude, lng: longitude }}
          defaultZoom={zoom}
          scrollwheel={scrollWheelZoom}
          gestureHandling={scrollWheelZoom ? "greedy" : "cooperative"}
          controls={showMapControls}
        >
          <AdvancedMarker position={{ lat: latitude, lng: longitude }} />
        </GoogleBaseMap>
      }
      osm={
        <div className="relative h-full w-full">
          <MapContainer
            center={[latitude, longitude]}
            zoom={zoom}
            className="h-full w-full z-0"
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={scrollWheelZoom}
          >
            <BaseMapLayer />
            <Marker position={[latitude, longitude]} icon={leafletMarkerIcon} />
          </MapContainer>
          <MapFallbackNotice />
        </div>
      }
    />
  );
}
