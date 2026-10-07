import L from "leaflet";
import { useSyncExternalStore } from "react";
import { getOsmTileUrl } from "./osmTileUrl";

// Which map a deployment uses is decided by whether a Google Maps API key is
// configured: key present → native Google Maps, otherwise Leaflet + OSM (tiles
// proxied through our backend). Runtime config (window.APP_CONFIG, set by
// docker-entrypoint.sh) wins over the build-time VITE_ value, like every other
// flag in this app.
export const getGoogleMapsApiKey = (): string =>
  window.APP_CONFIG?.GOOGLE_MAPS_API_KEY ||
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  "";

// Advanced markers (used by the Google maps) require a Map ID. Google's demo
// ID works for development; production should set a real one.
export const getGoogleMapId = (): string =>
  window.APP_CONFIG?.GOOGLE_MAPS_MAP_ID ||
  import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ||
  "DEMO_MAP_ID";

export const isGoogleMapsConfigured = (): boolean => !!getGoogleMapsApiKey();

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Adds the OSM basemap to an imperatively-built Leaflet map. */
export const attachOsmBaseLayer = (map: L.Map): L.TileLayer =>
  L.tileLayer(getOsmTileUrl(), { attribution: OSM_ATTRIBUTION }).addTo(map);

// ── Google health ────────────────────────────────────────────────────────────
// If Google can't be used (key rejected, script blocked, quota…) every map
// switches to its Leaflet/OSM version for the rest of the page session and
// shows why. Google offers no API for reading the specific error, so the
// console line it prints is captured too.

interface GoogleState {
  failed: boolean;
  reason: string | null;
}

let state: GoogleState = { failed: false, reason: null };
const listeners = new Set<() => void>();

const setState = (next: GoogleState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

interface GoogleErrorInfo {
  code: string;
  authorizeUrl?: string;
}
let lastGoogleError: GoogleErrorInfo | null = null;
let consoleHooked = false;

// Google reports most key problems only as a console.error line such as
// "Google Maps JavaScript API error: RefererNotAllowedMapError ... Your site
// URL to be authorized: <url>". Capture it (always passing it through).
export function captureGoogleConsoleErrors() {
  if (consoleHooked) return;
  consoleHooked = true;
  // eslint-disable-next-line no-console
  const original = console.error.bind(console);
  // eslint-disable-next-line no-console
  console.error = (...args: unknown[]) => {
    const text = args.filter((a) => typeof a === "string").join(" ");
    const code = text.match(
      /Google Maps JavaScript API (?:error|warning): (\w+)/,
    )?.[1];
    if (code) {
      lastGoogleError = {
        code,
        authorizeUrl: text.match(/URL to be authorized: (\S+)/)?.[1],
      };
    }
    original(...args);
  };
}

const describeFailure = (fallback: string): string => {
  if (lastGoogleError) {
    return lastGoogleError.authorizeUrl
      ? `${lastGoogleError.code} — authorize: ${lastGoogleError.authorizeUrl}`
      : lastGoogleError.code;
  }
  return fallback;
};

export function reportGoogleFailure(fallbackReason = "Google Maps failed") {
  if (state.failed) return;
  // Google logs the specific error just before reporting the failure; defer a
  // tick so the captured message is in place.
  setTimeout(() => {
    if (state.failed) return;
    // eslint-disable-next-line no-console
    console.warn("Google Maps unavailable, using OpenStreetMap instead.");
    setState({ failed: true, reason: describeFailure(fallbackReason) });
  }, 0);
}

// Google calls this global when the key is rejected (bad key, referrer not
// allowed, API not enabled, billing off).
window.gm_authFailure = () => reportGoogleFailure("API key rejected");

export type MapProvider = "google" | "osm";

export function useMapProvider(): {
  provider: MapProvider;
  googleError: string | null;
} {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
  );
  const configured = isGoogleMapsConfigured();
  return {
    provider: configured && !current.failed ? "google" : "osm",
    googleError: configured ? current.reason : null,
  };
}

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}
