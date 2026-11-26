/**
 * Dispatcher API.
 *
 * Unit types, fire stations (service points) and units (resources) use the
 * real `/dispatch/*` endpoints of Automax-Backend. Successful responses wrap
 * the payload in `data`; list responses add `page`, `limit`, `total_items`
 * and `total_pages` next to it.
 *
 * `FireStation` is the dispatcher map's view of a service point.
 */
import { apiClient } from "./client";

export interface FireStation {
  id: string;
  name: string;
  name_ar?: string;
  location_name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

/** One entry of an incident's dispatch audit trail (`GET /dispatch/logs`). */
export interface DispatchLog {
  id: string;
  assignment_id: string;
  incident_id: string;
  resource_id: string;
  role: string;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  fire_station_id?: string | null;
  fire_station_name?: string | null;
  accepted_by_id?: string | null;
  accepted_by_name?: string | null;
  created_at: string;
}

export const dispatcherApi = {
  /** Dispatch logs of an incident, as returned by the API (list envelope). */
  listLogs: async (incidentId: string): Promise<DispatchLog[]> => {
    const { data } = await apiClient.get<
      { data: DispatchLog[] } | DispatchLog[]
    >("/dispatch/logs", { params: { incident_id: incidentId } });
    return Array.isArray(data) ? data : (data.data ?? []);
  },

  /**
   * Checks the incident can still be assigned to the station. Resolves on 200;
   * rejects with an HTTP 409 when it is already assigned to that station.
   */
  assertIncidentNotAssigned: async (
    incidentId: string,
    departmentId: string,
    servicePointId: string,
  ): Promise<void> => {
    await apiClient.post(
      `/dispatch/incidents/${incidentId}/fire-station-alerts`,
      {
        department_id: departmentId,
        service_point_ids: [servicePointId],
        all: false,
      },
    );
  },

  /** Push-notify a fire station about an incident (incident dropped on it). */
  pushToFireStation: async (
    serviceId: string,
    incidentId: string,
  ): Promise<void> => {
    await apiClient.post("/dispatch/fcm/push", {
      service_id: serviceId,
      incident_id: incidentId,
    });
  },

  /** Alert the selected fire stations (service points). */
  alertFireStations: async (servicePointIds: string[]): Promise<void> => {
    await apiClient.post("/dispatch/fire-station-alerts", {
      service_point_ids: servicePointIds,
      all: false,
    });
  },
};

// ───────────────────────────── shared ─────────────────────────────

export const UNIT_STATUS_KEYS = [
  "available",
  "busy",
  "moving_vehicle",
  "offline",
  "ignition_on",
  "ignition_off",
  "over_speed",
  "stop_over_20_min",
] as const;
export type UnitStatusKey = (typeof UNIT_STATUS_KEYS)[number];

export const DEFAULT_UNIT_STATUS_COLORS: Record<UnitStatusKey, string> = {
  available: "#16a34a",
  busy: "#dc2626",
  moving_vehicle: "#e0a800",
  offline: "#555555",
  ignition_on: "#8b27c9",
  ignition_off: "#2551d6",
  over_speed: "#c026a8",
  stop_over_20_min: "#3b0f7a",
};

interface Envelope<T> {
  data: T;
  message?: string;
}

/** List response: `data` plus pagination fields (present when `page` is sent). */
export interface PagedList<T> {
  data: T[];
  page?: number;
  limit?: number;
  total_items?: number;
  total_pages?: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

/** Largest page size the API accepts (it rejects `limit` above 100). */
export const LOOKUP_LIMIT = 100;

/** Pages through a list endpoint until every row is loaded (for dropdowns). */
async function fetchAllPages<T>(
  path: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const { data } = await apiClient.get<PagedList<T>>(path, {
      params: { ...params, page, limit: LOOKUP_LIMIT },
    });
    rows.push(...data.data);
    if (page >= (data.total_pages ?? 1) || data.data.length === 0) break;
  }
  return rows;
}

// ───────────────────────────── icons ─────────────────────────────

export interface DispatchIcon {
  id: string;
  /** Save this as `icon` on a unit type or fire station. */
  path: string;
}

export const iconApi = {
  /** PNG, JPG or SVG, max 2 MB. */
  upload: async (file: File): Promise<DispatchIcon> => {
    const body = new FormData();
    body.append("file", file);
    const response = await apiClient.post<Envelope<DispatchIcon>>(
      "/dispatch/icons",
      body,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data.data;
  },

  /** Raw file bytes (needs the bearer token, so it can't be a plain <img src>). */
  download: async (id: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`/dispatch/icons/${id}`, {
      responseType: "blob",
    });
    return response.data;
  },
};

// ─────────────────────── unit types (resource types) ───────────────────────

export interface UnitType {
  id: string;
  name: string;
  /** Unique inside the department. */
  code?: string | null;
  alt_name?: string | null;
  department_id: string;
  /** Seconds a resource has to accept a dispatched job. */
  acceptance_timeout_seconds?: number;
  min_speed?: number;
  max_speed?: number;
  min_weight?: number;
  max_weight?: number;
  /** YYYY-MM-DD */
  active_till_date?: string | null;
  is_active?: boolean;
  /** Icon path returned by icon upload. */
  icon?: string | null;
  colors?: Partial<Record<UnitStatusKey, string>>;
  created_at?: string;
  updated_at?: string;
}

export type UnitTypeInput = Omit<UnitType, "id" | "created_at" | "updated_at">;

export interface UnitTypeListParams extends ListParams {
  department_id?: string;
}

export const unitTypeApi = {
  list: async (params: UnitTypeListParams = {}): Promise<PagedList<UnitType>> =>
    (
      await apiClient.get<PagedList<UnitType>>("/dispatch/resource-types", {
        params,
      })
    ).data,

  /** All unit types, for dropdowns. */
  all: async (): Promise<UnitType[]> =>
    fetchAllPages<UnitType>("/dispatch/resource-types"),

  get: async (id: string): Promise<UnitType> =>
    (await apiClient.get<Envelope<UnitType>>(`/dispatch/resource-types/${id}`))
      .data.data,

  create: async (body: UnitTypeInput): Promise<UnitType> =>
    (await apiClient.post<Envelope<UnitType>>("/dispatch/resource-types", body))
      .data.data,

  update: async (id: string, body: UnitTypeInput): Promise<UnitType> =>
    (
      await apiClient.put<Envelope<UnitType>>(
        `/dispatch/resource-types/${id}`,
        body,
      )
    ).data.data,

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/dispatch/resource-types/${id}`);
  },
};

// ───────────────────── fire stations (service points) ─────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ServicePoint {
  id: string;
  name: string;
  alt_name?: string | null;
  department_id: string;
  /** Unique inside the department. */
  radio_id?: string | null;
  /** Locations-tree id. */
  location_id?: string | null;
  location_name?: string | null;
  location: GeoPoint;
  active_till_date?: string | null;
  is_active?: boolean;
  icon?: string | null;
  /** Units whose home station is this one. */
  resource_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export type ServicePointInput = Omit<
  ServicePoint,
  "id" | "created_at" | "updated_at"
>;

export interface ServicePointListParams extends ListParams {
  department_id?: string;
}

export const servicePointApi = {
  list: async (
    params: ServicePointListParams = {},
  ): Promise<PagedList<ServicePoint>> =>
    (
      await apiClient.get<PagedList<ServicePoint>>("/dispatch/service-points", {
        params,
      })
    ).data,

  all: async (): Promise<ServicePoint[]> =>
    fetchAllPages<ServicePoint>("/dispatch/service-points"),

  get: async (id: string): Promise<ServicePoint> =>
    (
      await apiClient.get<Envelope<ServicePoint>>(
        `/dispatch/service-points/${id}`,
      )
    ).data.data,

  create: async (body: ServicePointInput): Promise<ServicePoint> =>
    (
      await apiClient.post<Envelope<ServicePoint>>(
        "/dispatch/service-points",
        body,
      )
    ).data.data,

  /** `resource_ids`, when sent, replaces the station's units (`[]` detaches all). */
  update: async (id: string, body: ServicePointInput): Promise<ServicePoint> =>
    (
      await apiClient.put<Envelope<ServicePoint>>(
        `/dispatch/service-points/${id}`,
        body,
      )
    ).data.data,

  /** `force` detaches every unit first; without it a station in use returns 409. */
  remove: async (id: string, force = false): Promise<void> => {
    await apiClient.delete(`/dispatch/service-points/${id}`, {
      params: force ? { force: true } : undefined,
    });
  },
};

// ───────────────────────── units (resources) ─────────────────────────

export type ResourceStatus =
  | "available"
  | "offered"
  | "dispatched"
  | "maintenance";
export const RESOURCE_STATUSES: ResourceStatus[] = [
  "available",
  "offered",
  "dispatched",
  "maintenance",
];

export interface Resource {
  id: string;
  /** Required when `thing_id` is omitted (the registry creates the vehicle). */
  name: string;
  thing_id?: string | null;
  resource_type_id: string;
  /** Home fire station. */
  service_point_id?: string | null;
  /** The "Unique ID" on the form (e.g. DEV952250); unique when set. */
  unique_id?: string | null;
  plate_number?: string | null;
  chassis_number?: string | null;
  alternate_name?: string | null;
  radio_id?: string | null;
  call_code?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  classification_ids?: string[];
  classification?: string[];
  gprs?: string | null;
  sms?: string | null;
  sms_vip?: string | null;
  sim?: string | null;
  /** Required when `partner_user_id` is sent. */
  driver_user_id?: string | null;
  partner_user_id?: string | null;
  active_till_date?: string | null;
  status?: ResourceStatus;
  description?: string | null;
  is_active?: boolean;
  /** Incident this unit is currently assigned to (read-only). */
  incident_id?: string | null;
  /** Last known position (read-only; comes from the linked registry thing). */
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type ResourceInput = Omit<
  Resource,
  "id" | "created_at" | "updated_at" | "latitude" | "longitude" | "incident_id"
>;

export interface ResourceListParams extends ListParams {
  resource_type_id?: string;
  service_point_id?: string;
  status?: ResourceStatus;
  driver_user_id?: string;
  location_id?: string;
  classification_id?: string;
  active_till_date?: string;
}

export const resourceApi = {
  list: async (params: ResourceListParams = {}): Promise<PagedList<Resource>> =>
    (
      await apiClient.get<PagedList<Resource>>("/dispatch/resources", {
        params,
      })
    ).data,

  all: async (): Promise<Resource[]> =>
    fetchAllPages<Resource>("/dispatch/resources"),

  get: async (id: string): Promise<Resource> =>
    (await apiClient.get<Envelope<Resource>>(`/dispatch/resources/${id}`)).data
      .data,

  create: async (body: ResourceInput): Promise<Resource> =>
    (await apiClient.post<Envelope<Resource>>("/dispatch/resources", body)).data
      .data,

  update: async (id: string, body: ResourceInput): Promise<Resource> =>
    (await apiClient.put<Envelope<Resource>>(`/dispatch/resources/${id}`, body))
      .data.data,

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/dispatch/resources/${id}`);
  },
};
