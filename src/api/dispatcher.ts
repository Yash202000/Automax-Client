/**
 * Dispatcher API.
 *
 * Unit types (resource types) use the real `/dispatch/resource-types`
 * endpoints. Units and fire stations are still DUMMY in-memory
 * implementations: no backend endpoints exist yet for them. Replace those
 * bodies with real `apiClient` calls once available; the exported
 * signatures are what the UI depends on.
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
  /** Station status; treated as active when omitted. */
  is_active?: boolean;
  /** Units assigned to this station (unit ids). */
  unit_ids?: string[];
  location_id?: string;
  /** Unique radio id of the station. */
  radio_id?: string;
  /** ISO date until which the station is active. */
  active_till?: string;
  /** Station icon as a data URL. */
  icon?: string;
}

export const DUMMY_FIRE_STATIONS: FireStation[] = [
  {
    id: "fs-001",
    name: "Central Fire Station",
    name_ar: "محطة الإطفاء المركزية",
    location_name: "Downtown",
    address: "King Fahd Rd, Downtown",
    phone: "+966 11 000 0001",
    latitude: 24.7136,
    longitude: 46.6753,
  },
  {
    id: "fs-002",
    name: "North District Fire Station",
    name_ar: "محطة إطفاء الحي الشمالي",
    location_name: "North District",
    address: "Prince Turki Rd, North District",
    phone: "+966 11 000 0002",
    latitude: 24.8247,
    longitude: 46.6381,
  },
  {
    id: "fs-003",
    name: "East Fire Station",
    name_ar: "محطة الإطفاء الشرقية",
    location_name: "East District",
    address: "Imam Saud Rd, East District",
    phone: "+966 11 000 0003",
    latitude: 24.7421,
    longitude: 46.8035,
  },
  {
    id: "fs-004",
    name: "South Fire Station",
    name_ar: "محطة الإطفاء الجنوبية",
    location_name: "South District",
    address: "Makkah Rd, South District",
    phone: "+966 11 000 0004",
    latitude: 24.5864,
    longitude: 46.7219,
  },
  {
    id: "fs-005",
    name: "West Fire Station",
    name_ar: "محطة الإطفاء الغربية",
    location_name: "West District",
    address: "Thumamah Rd, West District",
    phone: "+966 11 000 0005",
    latitude: 24.6902,
    longitude: 46.5498,
  },
  {
    id: "fs-006",
    name: "Industrial Area Fire Station",
    name_ar: "محطة إطفاء المنطقة الصناعية",
    location_name: "Industrial Area",
    address: "2nd Industrial City",
    phone: "+966 11 000 0006",
    latitude: 24.5987,
    longitude: 46.8412,
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const SMS_VIP_COUNT = 10;

export interface UnitGprs {
  enabled: boolean;
  dial_up_number: string;
  apn: string;
  username: string;
  password: string;
  ip_type: string;
  host_ip: string;
  host_port: string;
  sync_interval: string;
  dns_ip: string;
}

export interface UnitSms {
  connect_type: string;
  service_center: string;
  base_number: string;
  csd_base_number: string;
  incoming_command_check: boolean;
}

export interface UnitSim {
  pin_code: string;
  voice_no: string;
  data_no: string;
}

export interface Unit {
  id: string;
  name: string;
  unit_id: string;
  alternate_name?: string;
  plate_number: string;
  unit_type: string;
  radio_id: string;
  /** Assigned driver (user id), location id and classification id. */
  driver_id?: string;
  location_id?: string;
  classification_id?: string;
  description?: string;
  is_active?: boolean;
  /** ISO date until which the unit is active. */
  active_till?: string;
  // Unit driver details
  shift?: string;
  partner_id?: string;
  call_code?: string;
  gprs?: UnitGprs;
  sms?: UnitSms;
  /** Up to SMS_VIP_COUNT VIP numbers. */
  sms_vip?: string[];
  sim?: UnitSim;
  modified_at: string;
}

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

/** Dispatch resource type, as returned by `/dispatch/resource-types`. */
export interface UnitType {
  id: string;
  name: string;
  /** Short code, unique within the department. */
  code: string;
  alt_name?: string | null;
  department_id: string;
  /** Seconds a resource has to accept a dispatched job. */
  acceptance_timeout_seconds?: number;
  /** km/h */
  min_speed?: number;
  max_speed?: number;
  /** kg */
  min_weight?: number;
  max_weight?: number;
  /** YYYY-MM-DD */
  active_till_date?: string | null;
  is_active?: boolean;
  /** Icon path or URL. */
  icon?: string | null;
  /** Map marker colour (hex) per unit status. */
  colors?: Partial<Record<UnitStatusKey, string>>;
  created_at?: string;
  updated_at?: string;
}

export type UnitTypeInput = Omit<UnitType, "id" | "created_at" | "updated_at">;

export interface UnitTypeList {
  data: UnitType[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

export interface UnitTypeListParams {
  page?: number;
  limit?: number;
  search?: string;
  department_id?: string;
  is_active?: boolean;
}

const DUMMY_UNITS: Unit[] = [
  {
    id: "u-001",
    name: "Engine 1",
    unit_id: "E-001",
    alternate_name: "Alpha One",
    plate_number: "ABC 1234",
    unit_type: "Fire Engine",
    radio_id: "R-1001",
    modified_at: "2026-11-02T09:15:00Z",
  },
  {
    id: "u-002",
    name: "Ladder 1",
    unit_id: "L-001",
    alternate_name: "Ladder Alpha",
    plate_number: "DEF 5678",
    unit_type: "Ladder Truck",
    radio_id: "R-1002",
    modified_at: "2026-11-03T11:40:00Z",
  },
  {
    id: "u-003",
    name: "Rescue 1",
    unit_id: "R-001",
    plate_number: "GHI 9012",
    unit_type: "Rescue Vehicle",
    radio_id: "R-1003",
    modified_at: "2026-11-05T14:05:00Z",
  },
  {
    id: "u-004",
    name: "Medic 1",
    unit_id: "M-001",
    alternate_name: "Medic Alpha",
    plate_number: "JKL 3456",
    unit_type: "Ambulance",
    radio_id: "R-1004",
    modified_at: "2026-11-07T08:30:00Z",
  },
  {
    id: "u-005",
    name: "Tanker 1",
    unit_id: "T-001",
    plate_number: "MNO 7890",
    unit_type: "Water Tanker",
    radio_id: "R-1005",
    modified_at: "2026-11-09T16:20:00Z",
  },
];

let units: Unit[] = [...DUMMY_UNITS];
let fireStations: FireStation[] = DUMMY_FIRE_STATIONS.map((fs) => ({
  ...fs,
  is_active: fs.is_active ?? true,
}));

let nextId = 1000;

export const dispatcherApi = {
  /** List fire stations across all locations. */
  getFireStations: async (): Promise<FireStation[]> => {
    await delay(300);
    return [...fireStations];
  },

  saveFireStation: async (
    data: Omit<FireStation, "id"> & { id?: string },
  ): Promise<FireStation> => {
    await delay(300);
    if (data.id) {
      const updated = {
        ...fireStations.find((f) => f.id === data.id)!,
        ...data,
      } as FireStation;
      fireStations = fireStations.map((f) => (f.id === data.id ? updated : f));
      return updated;
    }
    const created = { ...data, id: `fs-${nextId++}` } as FireStation;
    fireStations = [...fireStations, created];
    return created;
  },

  deleteFireStation: async (id: string): Promise<void> => {
    await delay(300);
    fireStations = fireStations.filter((f) => f.id !== id);
  },

  getUnits: async (): Promise<Unit[]> => {
    await delay(300);
    return [...units];
  },

  // ── Unit types (resource types): real API ──
  listUnitTypes: async (
    params: UnitTypeListParams = {},
  ): Promise<UnitTypeList> => {
    const response = await apiClient.get<UnitTypeList>(
      "/dispatch/resource-types",
      { params },
    );
    return response.data;
  },

  /** All unit types (up to 100), for dropdowns. */
  getAllUnitTypes: async (): Promise<UnitType[]> => {
    const response = await apiClient.get<UnitTypeList>(
      "/dispatch/resource-types",
      { params: { limit: 100 } },
    );
    return response.data.data;
  },

  getUnitType: async (id: string): Promise<UnitType> => {
    const response = await apiClient.get<UnitType>(
      `/dispatch/resource-types/${id}`,
    );
    return response.data;
  },

  createUnitType: async (data: UnitTypeInput): Promise<UnitType> => {
    const response = await apiClient.post<UnitType>(
      "/dispatch/resource-types",
      data,
    );
    return response.data;
  },

  updateUnitType: async (
    id: string,
    data: UnitTypeInput,
  ): Promise<UnitType> => {
    const response = await apiClient.put<UnitType>(
      `/dispatch/resource-types/${id}`,
      data,
    );
    return response.data;
  },

  deleteUnitType: async (id: string): Promise<void> => {
    await apiClient.delete(`/dispatch/resource-types/${id}`);
  },

  getUnit: async (id: string): Promise<Unit | undefined> => {
    await delay(200);
    return units.find((u) => u.id === id);
  },

  saveUnit: async (
    data: Omit<Unit, "id" | "modified_at" | "unit_id"> & {
      id?: string;
      unit_id?: string;
    },
  ): Promise<Unit> => {
    await delay(300);
    const modified_at = new Date().toISOString();
    if (data.id) {
      const updated = {
        ...units.find((u) => u.id === data.id)!,
        ...data,
        modified_at,
      } as Unit;
      units = units.map((u) => (u.id === data.id ? updated : u));
      return updated;
    }
    const unit_id =
      data.unit_id || `U-${String(units.length + 1).padStart(3, "0")}`;
    const created = {
      ...data,
      unit_id,
      id: `u-${nextId++}`,
      modified_at,
    } as Unit;
    units = [...units, created];
    return created;
  },

  deleteUnit: async (id: string): Promise<void> => {
    await delay(300);
    units = units.filter((u) => u.id !== id);
  },

  /** Alert the given fire stations. */
  alertFireStations: async (
    fireStationIds: string[],
  ): Promise<{ success: boolean; alerted: string[] }> => {
    await delay(600);
    return { success: true, alerted: fireStationIds };
  },
};
