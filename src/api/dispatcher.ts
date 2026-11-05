/**
 * Dispatcher API.
 *
 * DUMMY implementation: no backend endpoints exist yet. Replace the bodies
 * with real `client` calls once the endpoints are available; the exported
 * signatures are what the UI depends on.
 */

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

export const dispatcherApi = {
  /** List fire stations across all locations. */
  getFireStations: async (): Promise<FireStation[]> => {
    await delay(300);
    return DUMMY_FIRE_STATIONS;
  },

  /** Alert the given fire stations. */
  alertFireStations: async (
    fireStationIds: string[],
  ): Promise<{ success: boolean; alerted: string[] }> => {
    await delay(600);
    return { success: true, alerted: fireStationIds };
  },
};
