import { getGoogleMapsApiKey, type MapProvider } from "./mapProvider";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RoadRoute {
  id: string;
  /** Driving distance along the road network, in metres. */
  distanceM: number;
  /** Driving time in seconds (traffic-aware with Google). */
  durationS: number;
}

export type RoutingSource = "google" | "osrm";

export interface RoadRouteResult {
  source: RoutingSource;
  routes: RoadRoute[];
}

export interface RoutePath {
  source: RoutingSource;
  distanceM: number;
  durationS: number;
  /** Road geometry, origin to destination. */
  path: LatLng[];
}

const OSRM_DEFAULT = "https://router.project-osrm.org";
const osrmBase = () =>
  (
    window.APP_CONFIG?.OSRM_URL ||
    import.meta.env.VITE_OSRM_URL ||
    OSRM_DEFAULT
  ).replace(/\/+$/, "");

const lngLat = (p: LatLng) => `${p.longitude},${p.latitude}`;

/** Great-circle distance in km, used only to shortlist candidates. */
export function straightLineKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// ── OSRM ─────────────────────────────────────────────────────────────────────

async function osrmMatrix(
  origin: LatLng,
  dests: { id: string; point: LatLng }[],
): Promise<RoadRoute[]> {
  const coords = [origin, ...dests.map((d) => d.point)].map(lngLat).join(";");
  const destIdx = dests.map((_, i) => i + 1).join(";");
  const res = await fetch(
    `${osrmBase()}/table/v1/driving/${coords}?sources=0&destinations=${destIdx}&annotations=duration,distance`,
  );
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok") throw new Error(`OSRM ${data.code}`);
  const durations: (number | null)[] = data.durations?.[0] ?? [];
  const distances: (number | null)[] = data.distances?.[0] ?? [];
  const out: RoadRoute[] = [];
  dests.forEach((d, i) => {
    // null = no drivable road connection.
    if (durations[i] == null || distances[i] == null) return;
    out.push({
      id: d.id,
      distanceM: distances[i] as number,
      durationS: durations[i] as number,
    });
  });
  return out;
}

async function osrmPath(origin: LatLng, dest: LatLng): Promise<RoutePath> {
  const res = await fetch(
    `${osrmBase()}/route/v1/driving/${lngLat(origin)};${lngLat(dest)}?overview=full&geometries=geojson`,
  );
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) throw new Error(`OSRM ${data.code}`);
  return {
    source: "osrm",
    distanceM: route.distance,
    durationS: route.duration,
    path: (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => ({ latitude: lat, longitude: lng }),
    ),
  };
}

// ── Google Routes API ────────────────────────────────────────────────────────

const GOOGLE_MATRIX_URL =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
const GOOGLE_ROUTES_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

const wp = (p: LatLng) => ({
  location: { latLng: { latitude: p.latitude, longitude: p.longitude } },
});

/** "123.4s" → 123.4 */
const seconds = (d?: string) => (d ? parseFloat(d) : 0);

async function googleMatrix(
  origin: LatLng,
  dests: { id: string; point: LatLng }[],
): Promise<RoadRoute[]> {
  const res = await fetch(GOOGLE_MATRIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGoogleMapsApiKey(),
      "X-Goog-FieldMask":
        "originIndex,destinationIndex,duration,distanceMeters,condition",
    },
    body: JSON.stringify({
      origins: [{ waypoint: wp(origin) }],
      destinations: dests.map((d) => ({ waypoint: wp(d.point) })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }),
  });
  if (!res.ok) throw new Error(`Google Routes ${res.status}`);
  // The matrix comes back as a JSON array of elements.
  const rows: {
    destinationIndex?: number;
    duration?: string;
    distanceMeters?: number;
    condition?: string;
  }[] = await res.json();
  const out: RoadRoute[] = [];
  for (const r of rows) {
    const d = dests[r.destinationIndex ?? 0];
    if (!d || r.condition !== "ROUTE_EXISTS") continue;
    out.push({
      id: d.id,
      distanceM: r.distanceMeters ?? 0,
      durationS: seconds(r.duration),
    });
  }
  return out;
}

/** Decodes a Google encoded polyline (precision 5). */
function decodePolyline(encoded: string): LatLng[] {
  const pts: LatLng[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += next();
    lng += next();
    pts.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return pts;
}

async function googlePath(origin: LatLng, dest: LatLng): Promise<RoutePath> {
  const res = await fetch(GOOGLE_ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGoogleMapsApiKey(),
      "X-Goog-FieldMask":
        "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      origin: wp(origin),
      destination: wp(dest),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }),
  });
  if (!res.ok) throw new Error(`Google Routes ${res.status}`);
  const route = (await res.json()).routes?.[0];
  if (!route?.polyline?.encodedPolyline) throw new Error("No route");
  return {
    source: "google",
    distanceM: route.distanceMeters ?? 0,
    durationS: seconds(route.duration),
    path: decodePolyline(route.polyline.encodedPolyline),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Exact road distance and drive time from `origin` to every destination, in one
 * request. Uses Google's Routes API when the map is Google, otherwise OSRM; if
 * Google fails (key lacks the Routes API, quota…) it falls back to OSRM.
 * Destinations with no drivable route are left out.
 */
export async function getRoadRoutes(
  provider: MapProvider,
  origin: LatLng,
  dests: { id: string; point: LatLng }[],
): Promise<RoadRouteResult> {
  if (dests.length === 0) return { source: "osrm", routes: [] };
  if (provider === "google") {
    try {
      return { source: "google", routes: await googleMatrix(origin, dests) };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Google routing failed, using OSRM instead:", e);
    }
  }
  return { source: "osrm", routes: await osrmMatrix(origin, dests) };
}

/** The drivable route line between two points, for drawing on the map. */
export async function getRoutePath(
  provider: MapProvider,
  origin: LatLng,
  dest: LatLng,
): Promise<RoutePath> {
  if (provider === "google") {
    try {
      return await googlePath(origin, dest);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Google routing failed, using OSRM instead:", e);
    }
  }
  return osrmPath(origin, dest);
}

export const formatDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

export const formatDuration = (s: number) => {
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
};
