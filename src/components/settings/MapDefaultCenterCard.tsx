import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FALLBACK_MAP_CENTER } from "@/api/mapConfig";

// Form state for the default map center; strings so fields can be edited freely.
export interface MapCenterDraft {
  latitude: string;
  longitude: string;
  zoom: string;
}

interface Props {
  value: MapCenterDraft;
  // eslint-disable-next-line no-unused-vars
  onChange: (_value: MapCenterDraft) => void;
  // Shown when no center has been saved yet.
  notConfigured?: boolean;
}

const inputClass =
  "w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-primary focus:border-transparent";

export function MapDefaultCenterCard({
  value,
  onChange,
  notConfigured,
}: Props) {
  const { t } = useTranslation();
  const set =
    (field: keyof MapCenterDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [field]: e.target.value });

  return (
    <div className="bg-[hsl(var(--card))] rounded-xl p-6 shadow-sm border border-[hsl(var(--border))]">
      <div className="flex items-center gap-3 mb-2">
        <MapPin className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
          {t("settings.map.title", "Map default center")}
        </h2>
      </div>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        {t(
          "settings.map.description",
          "Where maps open before a location is picked.",
        )}
        {notConfigured &&
          " " +
            t(
              "settings.map.notConfigured",
              "Not set yet — maps currently open at Riyadh.",
            )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {t("settings.map.latitude", "Latitude")}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={value.latitude}
            onChange={set("latitude")}
            className={inputClass}
            placeholder={String(FALLBACK_MAP_CENTER.latitude)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {t("settings.map.longitude", "Longitude")}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={value.longitude}
            onChange={set("longitude")}
            className={inputClass}
            placeholder={String(FALLBACK_MAP_CENTER.longitude)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {t("settings.map.zoom", "Zoom (1–20)")}
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={value.zoom}
            onChange={set("zoom")}
            className={inputClass}
            placeholder={String(FALLBACK_MAP_CENTER.zoom)}
          />
        </div>
      </div>
    </div>
  );
}
