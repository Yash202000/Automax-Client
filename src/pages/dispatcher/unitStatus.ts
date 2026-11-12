import type { UnitStatusKey } from "../../api/dispatcher";

/** [translation key, default label] for each unit status. */
export const STATUS_LABELS: Record<UnitStatusKey, [string, string]> = {
  available: ["unitManagement.statusAvailable", "Available"],
  busy: ["unitManagement.statusBusy", "Busy"],
  moving_vehicle: ["unitManagement.statusMovingVehicle", "Moving Vehicle"],
  offline: ["unitManagement.statusOffline", "Offline"],
  ignition_on: ["unitManagement.statusIgnitionOn", "Ignition On"],
  ignition_off: ["unitManagement.statusIgnitionOff", "Ignition Off"],
  over_speed: ["unitManagement.statusOverSpeed", "Over Speed"],
  stop_over_20_min: ["unitManagement.statusStepOver20", "Step Over 20 Min"],
};
