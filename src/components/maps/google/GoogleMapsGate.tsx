import { useEffect, type ReactNode } from "react";
import {
  APILoadingStatus,
  APIProvider,
  useApiLoadingStatus,
} from "@vis.gl/react-google-maps";
import { getCurrentLanguage } from "../../../i18n";
import {
  captureGoogleConsoleErrors,
  getGoogleMapsApiKey,
  isGoogleMapsConfigured,
  reportGoogleFailure,
} from "../../../utils/mapProvider";

// Only deployments that actually use Google need Google's console errors
// captured (they're shown on the map when falling back to OSM).
if (isGoogleMapsConfigured()) captureGoogleConsoleErrors();

function StatusWatcher() {
  const status = useApiLoadingStatus();
  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE) {
      reportGoogleFailure("API key rejected");
    } else if (status === APILoadingStatus.FAILED) {
      reportGoogleFailure("Failed to load the Google Maps JavaScript API");
    }
  }, [status]);
  return null;
}

// Loads the Google Maps JavaScript API for everything inside it and reports a
// failure to mapProvider, which makes every map fall back to Leaflet + OSM.
export default function GoogleMapsGate({ children }: { children: ReactNode }) {
  return (
    <APIProvider
      apiKey={getGoogleMapsApiKey()}
      language={getCurrentLanguage()}
      onError={() =>
        reportGoogleFailure("Failed to load the Google Maps JavaScript API")
      }
    >
      <StatusWatcher />
      {children}
    </APIProvider>
  );
}
