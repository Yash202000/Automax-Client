import { create } from 'zustand';
import type { LicenseInfo } from '../api/license';

interface LicenseState {
  info: LicenseInfo | null;
  isLoaded: boolean;
  setInfo: (info: LicenseInfo) => void;
  clear: () => void;
}

export const useLicenseStore = create<LicenseState>()((set) => ({
  info: null,
  isLoaded: false,
  setInfo: (info) => set({ info, isLoaded: true }),
  clear: () => set({ info: null, isLoaded: false }),
}));
