import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  setAuth: (
    user: User,
    token: string,
    refreshToken?: string,
    rememberMe?: boolean,
  ) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      rememberMe: false,
      setAuth: (user, token, refreshToken, rememberMe = false) => {
        localStorage.setItem("token", token);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        localStorage.setItem("rememberMe", rememberMe.toString());
        set({
          user,
          token,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
          rememberMe,
        });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        // Clear all auth-related localStorage items
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("auth-storage"); // Clear zustand persisted state
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          rememberMe: false,
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
      }),
    },
  ),
);
