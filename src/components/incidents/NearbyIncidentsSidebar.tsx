import { ExternalLink, MapPin, Compass, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NearbyIncident } from "../../api/admin";
import { getIncidentDistance } from "../../utils/geoDistance";
import { localizeNearbyIncident } from "../../utils/nearbyIncidentLocale";

interface NearbyIncidentsSidebarProps {
  incidentId: string;
  incidentNumber?: string;
  latitude: number;
  longitude: number;
  searchFilter: string;
  // eslint-disable-next-line no-unused-vars
  onSearchFilterChange: (value: string) => void;
  filteredItems: NearbyIncident[];
  selectedIncidentId: string | null;
  // eslint-disable-next-line no-unused-vars
  onSelectIncident: (item: NearbyIncident) => void;
  onCenterCurrent: () => void;
  // Closes the modal and opens the incident.
  // eslint-disable-next-line no-unused-vars
  onViewIncident: (id: string) => void;
}

// The filter box, current-incident card and list of nearby incidents beside the
// map. Shared by the Leaflet and Google versions of the Nearby incidents map.
export default function NearbyIncidentsSidebar({
  incidentId,
  incidentNumber,
  latitude,
  longitude,
  searchFilter,
  onSearchFilterChange,
  filteredItems,
  selectedIncidentId,
  onSelectIncident,
  onCenterCurrent,
  onViewIncident,
}: NearbyIncidentsSidebarProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");

  return (
    <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-s border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col h-[40vh] md:h-[calc(92vh-130px)]">
      {/* Sidebar Search Bar */}
      <div className="p-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchFilterChange(e.target.value)}
            placeholder={
              t("incidents.nearby.filterPlaceholder") ||
              "Filter by number, status, location..."
            }
            className="w-full ps-9 pe-8 py-1.5 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => onSearchFilterChange("")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Reference Incident Highlight Card */}
      <div className="p-3 border-b border-[hsl(var(--border))] bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300 dark:ring-blue-800 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                  {incidentNumber || incidentId}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                  {t("incidents.nearby.currentIncident") || "Current"}
                </span>
              </div>
              <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCenterCurrent}
            className="p-1.5 text-xs text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors"
            title="Pan to current incident"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List of Nearby Incidents */}
      <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))]">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
            {searchFilter ? (
              <span>No incidents match "{searchFilter}"</span>
            ) : (
              <span>{t("incidents.nearby.empty")}</span>
            )}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedIncidentId === item.id;
            const distFormatted = getIncidentDistance(
              latitude,
              longitude,
              item.latitude,
              item.longitude,
              item.distance,
            );

            const label = localizeNearbyIncident(item, isArabic);
            return (
              <div
                key={item.id}
                onClick={() => onSelectIncident(item)}
                className={`p-3 cursor-pointer transition-colors text-start hover:bg-[hsl(var(--muted)/0.5)] ${
                  isSelected
                    ? "bg-[hsl(var(--primary)/0.08)] border-s-4 border-s-[hsl(var(--primary))]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[hsl(var(--primary))] hover:underline">
                    {item.incident_number}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{
                      backgroundColor: item.status_color || "#6b7280",
                    }}
                  >
                    {label.status}
                  </span>
                </div>

                <div className="mt-1 text-xs font-medium text-[hsl(var(--foreground))] line-clamp-1">
                  {label.classificationName}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                  <div className="flex items-center gap-1 truncate max-w-[170px]">
                    <MapPin className="w-3 h-3 shrink-0 text-[hsl(var(--muted-foreground))]" />
                    <span className="truncate">
                      {label.locationName || "-"}
                    </span>
                  </div>
                  {distFormatted && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {distFormatted}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/0.5)] text-[11px]">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewIncident(item.id);
                    }}
                    className="inline-flex items-center gap-1 text-[hsl(var(--primary))] font-semibold hover:underline"
                  >
                    <span>
                      {t("incidents.nearby.viewDetails") || "View Details"}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
