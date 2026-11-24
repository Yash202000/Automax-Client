import client from "./client";
import type { ApiResponse } from "../types";
import { toCoordinate } from "../utils/coordinates";

// Map settings, stored as a single row in the backend configs store
// (module "map", name "map_config") so super admins can change them per
// environment from Settings → Map configuration:
//   {
//     "default_center": { "latitude": 24.71, "longitude": 46.67, "zoom": 10 },
//     "search_enabled": true
//   }
export interface MapDefaultCenter {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface MapConfig {
  // Where maps open before a point is picked; null until it's set.
  default_center: MapDefaultCenter | null;
  // Whether maps show the address search box (location picker, dispatcher).
  search_enabled: boolean;
}

const MODULE = "map";
const NAME = "map_config";

export const MAP_CONFIG_QUERY_KEY = ["configs", MODULE, NAME];

// Used until a center is configured (Riyadh).
export const FALLBACK_MAP_CENTER: MapDefaultCenter = {
  latitude: 24.7136,
  longitude: 46.6753,
  zoom: 10,
};

// Used for anything not configured yet; search stays on so nothing changes
// until an admin turns it off.
export const DEFAULT_MAP_CONFIG: MapConfig = {
  default_center: null,
  search_enabled: true,
};

export interface MapConfigRow {
  id: string;
  version: number;
  value: unknown;
}

/** Validates a stored center; null if it isn't a usable center. */
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

/** Reads a stored map config, using the defaults for missing/invalid parts. */
export const parseMapConfig = (value: unknown): MapConfig => {
  if (!value || typeof value !== "object") return DEFAULT_MAP_CONFIG;
  const v = value as Record<string, unknown>;
  return {
    default_center: parseMapCenter(v.default_center),
    search_enabled:
      typeof v.search_enabled === "boolean"
        ? v.search_enabled
        : DEFAULT_MAP_CONFIG.search_enabled,
  };
};

const isNotFound = (err: unknown) =>
  (err as { response?: { status?: number } })?.response?.status === 404;

// What the config is set to when it doesn't exist yet.
export const INITIAL_MAP_CONFIG: MapConfig = {
  default_center: FALLBACK_MAP_CENTER,
  search_enabled: true,
};

// Admin read; null when the row doesn't exist.
const fetchRow = async (): Promise<MapConfigRow | null> => {
  try {
    const response = await client.get<ApiResponse<MapConfigRow>>(
      `/admin/configs/${MODULE}/${NAME}`,
    );
    return response.data.data ?? null;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
};

const createRow = async (value: MapConfig) => {
  const response = await client.post<ApiResponse<MapConfigRow>>(
    "/admin/configs",
    {
      module: MODULE,
      name: NAME,
      value,
      value_type: "json",
      visibility: "public",
      description: "Map settings (default center, address search)",
    },
  );
  return response.data;
};

let creatingRow: Promise<MapConfigRow | null> | null = null;
const createInitialRow = () => {
  creatingRow ??= (async () => {
    try {
      const created = await createRow(INITIAL_MAP_CONFIG);
      return created.data?.id ? created.data : await fetchRow();
    } catch (err) {
      const existing = await fetchRow().catch(() => null);
      if (existing) return existing;
      throw err;
    }
  })().finally(() => {
    creatingRow = null;
  });
  return creatingRow;
};

export const mapConfigApi = {
  get: async (): Promise<MapConfig> => {
    try {
      const response = await client.get<ApiResponse<{ value: unknown }>>(
        `/public/configs/${MODULE}/${NAME}`,
      );
      return parseMapConfig(response.data.data?.value);
    } catch (err) {
      if (isNotFound(err)) return DEFAULT_MAP_CONFIG;
      throw err;
    }
  },

  getRow: async (): Promise<MapConfigRow | null> =>
    (await fetchRow()) ?? createInitialRow(),

  // Updates the config (creates it if it still doesn't exist).
  save: async (existing: MapConfigRow | null, value: MapConfig) => {
    if (existing?.id) {
      const response = await client.put<ApiResponse<MapConfigRow>>(
        `/admin/configs/${existing.id}`,
        { value },
      );
      return response.data;
    }
    return createRow(value);
  },
};

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
