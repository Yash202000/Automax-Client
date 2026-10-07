import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMapProvider } from "../../utils/mapProvider";

// Corner notice for the Leaflet/OSM maps explaining why Google Maps isn't being
// used. Renders nothing unless a configured Google Maps setup actually failed.
// The parent must be `position: relative`.
export default function MapFallbackNotice({
  className = "bottom-7 start-2",
}: {
  // Position classes, for maps with their own corner controls.
  className?: string;
}) {
  const { t } = useTranslation();
  const { googleError } = useMapProvider();
  const [dismissed, setDismissed] = useState(false);

  if (!googleError || dismissed) return null;

  return (
    <div
      className={`absolute ${className} z-[1000] max-w-[300px] rounded-lg border border-orange-300 bg-orange-50 py-2 ps-2.5 pe-7 text-xs leading-snug text-orange-800 shadow`}
    >
      <div className="font-semibold">
        {t("maps.googleUnavailable", {
          defaultValue: "Google Maps unavailable — showing OpenStreetMap",
        })}
      </div>
      <div className="break-all">{googleError}</div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("common.close", { defaultValue: "Close" })}
        className="absolute end-1.5 top-0.5 text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}
