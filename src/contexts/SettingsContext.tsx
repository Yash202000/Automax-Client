import React, { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "../api/settings";
import type { Settings } from "../types";
import { hexToHSL } from "@/lib/utils";
import { publicUrl, resolveBrandingImage } from "../utils/publicUrl";

interface SettingsContextType {
  settings: Settings | null;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const settings = data?.data || null;

  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;

    root.style.setProperty("--primary", hexToHSL(settings.primary_color));
    root.style.setProperty("--secondary", hexToHSL(settings.secondary_color));
    root.style.setProperty("--accent", hexToHSL(settings.accent_color));
  }, [settings]);

  // Favicon from settings (uploaded attachment, file name in public/ or full
  // URL); falls back to the bundled favicon when unset.
  const faviconHref =
    resolveBrandingImage(settings, "favicon_url") ?? publicUrl("favicon.svg");
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.removeAttribute("type");
    link.href = faviconHref;
  }, [faviconHref]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

/** Shared resolved branding URLs and safe application defaults. */
// eslint-disable-next-line react-refresh/only-export-components
export const useAppBranding = () => {
  const { settings } = useSettings();
  return {
    settings,
    mainLogo:
      resolveBrandingImage(settings, "logo_url") ?? publicUrl("epm-logo.png"),
    smallLogo:
      resolveBrandingImage(settings, "logo_small_url") ??
      publicUrl("epm-logo.png"),
    favicon: resolveBrandingImage(settings, "favicon_url"),
    logoAlt: settings?.logo_alt_text || settings?.app_name || "Automax",
  };
};
