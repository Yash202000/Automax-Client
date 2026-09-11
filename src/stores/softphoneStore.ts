import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SoftphoneState {
  isOpen: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  shouldConnect: boolean;
  openCallerIncidents: boolean;
  incomingCallNumber: string | null;
  incomingCallName: string | null;
  setIncomingCallNumber: (incomingCallNumber: string | null) => void;
  setIncomingCallName: (incomingCallName: string | null) => void;
  setIsOpen: (isOpen: boolean) => void;
  setOpenCallerIncidents: (openCallerIncidents: boolean) => void;
  isCallerIncidentsMinimized: boolean;
  setIsCallerIncidentsMinimized: (minimized: boolean) => void;
  setConnected: (isConnected: boolean) => void;
  setConnecting: (isConnecting: boolean) => void;
  setShouldConnect: (shouldConnect: boolean) => void;
  toggle: () => void;
  reset: () => void;
}

export const useSoftphoneStore = create<SoftphoneState>()(
  persist(
    (set) => ({
      isOpen: false,
      isConnected: false,
      isConnecting: false,
      shouldConnect: false,
      openCallerIncidents: false,
      isCallerIncidentsMinimized: false,
      incomingCallNumber: "",
      incomingCallName: "",
      setIncomingCallNumber: (incomingCallNumber) =>
        set({ incomingCallNumber }),
      setIncomingCallName: (incomingCallName) => set({ incomingCallName }),
      setIsOpen: (isOpen) => set({ isOpen }),
      setOpenCallerIncidents: (openCallerIncidents) =>
        set({ openCallerIncidents }),
      setIsCallerIncidentsMinimized: (isCallerIncidentsMinimized) =>
        set({ isCallerIncidentsMinimized }),
      setConnected: (isConnected) => set({ isConnected }),
      setConnecting: (isConnecting) => set({ isConnecting }),
      setShouldConnect: (shouldConnect) => set({ shouldConnect }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      reset: () =>
        set({
          isOpen: false,
          isConnected: false,
          isConnecting: false,
          shouldConnect: false,
          isCallerIncidentsMinimized: false,
        }),
    }),
    {
      name: "softphone-storage",
      partialize: (state) => ({
        isOpen: state.isOpen,
        shouldConnect: state.shouldConnect,
      }),
    },
  ),
);
