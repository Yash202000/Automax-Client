import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SoftphoneState {
  isOpen: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  shouldConnect: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setConnected: (isConnected: boolean) => void;
  setConnecting: (isConnecting: boolean) => void;
  setShouldConnect: (shouldConnect: boolean) => void;
  toggle: () => void;
}

export const useSoftphoneStore = create<SoftphoneState>()(
  persist(
    (set) => ({
      isOpen: false,
      isConnected: false,
      isConnecting: false,
      shouldConnect: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      setConnected: (isConnected) => set({ isConnected }),
      setConnecting: (isConnecting) => set({ isConnecting }),
      setShouldConnect: (shouldConnect) => set({ shouldConnect }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
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
