import client from "./client";
import type { ApiResponse } from "../types";
import { toCoordinate } from "../utils/coordinates";

// Where maps open before a point is picked. Stored in the backend configs
// store (module "map", name "default_center") so super admins can change it
// per environment from Settings, instead of an .env value.
export interface MapDefaultCenter {
  latitude: number;
  longitude: number;
  zoom: number;
}

const MODULE = "map";
const NAME = "default_center";

export const MAP_DEFAULT_CENTER_QUERY_KEY = ["configs", MODULE, NAME];

// Used until a value is configured (Riyadh).
export const FALLBACK_MAP_CENTER: MapDefaultCenter = {
  latitude: 24.7136,
  longitude: 46.6753,
  zoom: 10,
};

interface ConfigRow {
  id: string;
  version: number;
  value: unknown;
}

/** Validates a stored value; null if it isn't a usable center. */
export const parseMapCenter = (value: unknown): MapDefaultCenter | null => {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const latitude = toCoordinate(v.latitude);
  const longitude = toCoordinate(v.longitude);
  if (latitude === undefined || longitude === undefined) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const zoom = toCoordinate(v.zoom);
  return {
    latitude,
    longitude,
    zoom:
      zoom !== undefined && zoom >= 1 && zoom <= 20
        ? zoom
        : FALLBACK_MAP_CENTER.zoom,
  };
};

const isNotFound = (err: unknown) =>
  (err as { response?: { status?: number } })?.response?.status === 404;

export const mapConfigApi = {
  // Public read (no login needed, so citizen pages work too). null when the
  // config isn't set yet.
  getDefaultCenter: async (): Promise<MapDefaultCenter | null> => {
    try {
      const response = await client.get<ApiResponse<{ value: unknown }>>(
        `/public/configs/${MODULE}/${NAME}`,
      );
      return parseMapCenter(response.data.data?.value);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  },

  // Admin read, including the row id/version needed to update it.
  getDefaultCenterConfig: async (): Promise<ConfigRow | null> => {
    try {
      const response = await client.get<ApiResponse<ConfigRow>>(
        `/admin/configs/${MODULE}/${NAME}`,
      );
      return response.data.data ?? null;
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  },

  // Creates the config on first save, updates it afterwards.
  saveDefaultCenter: async (
    existing: ConfigRow | null,
    value: MapDefaultCenter,
  ) => {
    if (existing?.id) {
      const response = await client.put<ApiResponse<ConfigRow>>(
        `/admin/configs/${existing.id}`,
        { value },
      );
      return response.data;
    }
    const response = await client.post<ApiResponse<ConfigRow>>(
      "/admin/configs",
      {
        module: MODULE,
        name: NAME,
        value,
        value_type: "json",
        visibility: "public",
        description: "Default map center (latitude, longitude, zoom)",
      },
    );
    return response.data;
  },
};

// GIS (boundary / address lookup via /gis/identify) is on only when ENABLE_GIS
// is "true". Runtime config (window.APP_CONFIG, written by
// docker-entrypoint.sh) wins over the build-time VITE_ value; an empty runtime
// value falls through to the build-time one. Case and whitespace are ignored.
export const isGisEnabled = (): boolean => {
  const runtime = window.APP_CONFIG?.ENABLE_GIS;
  const raw =
    runtime !== undefined && runtime !== null && String(runtime).trim() !== ""
      ? runtime
      : import.meta.env.VITE_ENABLE_GIS;
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase() === "true"
  );
};
