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
  // Everything is read-only while the saved config is still loading.
  disabled?: boolean;
  // Address search box on maps.
  searchEnabled: boolean;
  // eslint-disable-next-line no-unused-vars
  onSearchEnabledChange: (_enabled: boolean) => void;
}

const inputClass =
  "w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-primary focus:border-transparent";

export function MapConfigCard({
  value,
  onChange,
  notConfigured,
  disabled,
  searchEnabled,
  onSearchEnabledChange,
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
          {t("settings.map.title", "Map configuration")}
        </h2>
      </div>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        {t("settings.map.description", "How maps behave across the app.")}
      </p>

      <div className="flex items-center justify-between gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg mb-6">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {t("settings.map.search", "Map search")}
          </h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            {t(
              "settings.map.searchDesc",
              "Show the address search box on maps (location picker and dispatcher map).",
            )}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={searchEnabled}
          aria-label={t("settings.map.search", "Map search")}
          disabled={disabled}
          onClick={() => onSearchEnabledChange(!searchEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
            searchEnabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              searchEnabled
                ? "translate-x-6 rtl:-translate-x-6"
                : "translate-x-1 rtl:-translate-x-1"
            }`}
          />
        </button>
      </div>

      <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
        {t("settings.map.defaultCenter", "Default center")}
      </h3>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-4">
        {t(
          "settings.map.defaultCenterDesc",
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
            disabled={disabled}
            className={`${inputClass} disabled:opacity-60`}
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
            disabled={disabled}
            className={`${inputClass} disabled:opacity-60`}
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
            disabled={disabled}
            className={`${inputClass} disabled:opacity-60`}
            placeholder={String(FALLBACK_MAP_CENTER.zoom)}
          />
        </div>
      </div>
    </div>
  );
}
