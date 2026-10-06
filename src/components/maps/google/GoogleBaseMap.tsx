import { Map as GoogleMap, type MapProps } from "@vis.gl/react-google-maps";
import { getGoogleMapId } from "../../../utils/mapProvider";
import GoogleMapsGate from "./GoogleMapsGate";

interface GoogleBaseMapProps extends MapProps {
  // Map-type (roadmap/satellite/…) and Street View controls. Off for the small
  // preview maps, on for anything big enough to use them.
  controls?: boolean;
}

// The app's standard native Google map: API loading + failure reporting, the
// Map ID advanced markers need, and consistent defaults.
export default function GoogleBaseMap({
  controls = false,
  children,
  ...props
}: GoogleBaseMapProps) {
  return (
    <GoogleMapsGate>
      <GoogleMap
        mapId={getGoogleMapId()}
        style={{ width: "100%", height: "100%" }}
        gestureHandling="greedy"
        zoomControl
        mapTypeControl={controls}
        streetViewControl={controls}
        fullscreenControl={false}
        {...props}
      >
        {children}
      </GoogleMap>
    </GoogleMapsGate>
  );
}
