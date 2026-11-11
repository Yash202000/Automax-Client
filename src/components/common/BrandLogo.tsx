import { useState } from "react";
import { useAppBranding } from "@/contexts/SettingsContext";
import { publicUrl } from "@/utils/publicUrl";

const FALLBACK_LOGO = publicUrl("epm-logo.png");

interface BrandLogoProps {
  /** "small" = compact nav/sidebar logo, "main" = full logo. */
  variant?: "small" | "main";
  className?: string;
}

/**
 * The application logo from branding settings (uploaded attachment or URL),
 * with the configured alt text. Falls back to the bundled logo when unset or
 * when the configured image fails to load.
 */
export function BrandLogo({ variant = "small", className }: BrandLogoProps) {
  const { mainLogo, smallLogo, logoAlt } = useAppBranding();
  const src = variant === "main" ? mainLogo : smallLogo;
  // Remember which URL failed, so a new URL (e.g. after an upload) gets a
  // fresh chance to load without resetting state in an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <img
      src={failedSrc === src ? FALLBACK_LOGO : src}
      alt={logoAlt}
      className={className}
      onError={() => {
        if (src !== FALLBACK_LOGO) setFailedSrc(src);
      }}
    />
  );
}
