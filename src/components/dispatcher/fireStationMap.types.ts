import type { FireStation } from "../../api/dispatcher";

export interface FireStationMapProps {
  stations: FireStation[];
  selectedIds: string[];
  // eslint-disable-next-line no-unused-vars
  onToggle: (id: string) => void;
  /** Pan/zoom to a station. `nonce` re-triggers when the same id is picked again. */
  focus: { id: string; nonce: number } | null;
  // eslint-disable-next-line no-unused-vars
  getName: (station: FireStation) => string;
}
