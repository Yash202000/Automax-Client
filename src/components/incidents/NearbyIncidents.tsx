import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  X,
  MapPin,
} from "lucide-react";
import { incidentApi } from "../../api/admin";
import NearbyIncidentsMapModal from "./NearbyIncidentsMapModal";
import { getIncidentDistance } from "../../utils/geoDistance";

const PAGE_SIZE = 5;

// Mirrors the backend's NEARBY_INCIDENT_RADIUS_METERS config — if whoever
// deployed this instance hasn't set a radius there, there's nothing for this
// feature to search within, so the button shouldn't show at all.
const configuredNearbyRadiusMeters =
  window.APP_CONFIG?.NEARBY_INCIDENT_RADIUS_METERS ||
  import.meta.env.VITE_NEARBY_INCIDENT_RADIUS_METERS;
const NEARBY_FEATURE_ENABLED = !!configuredNearbyRadiusMeters;
const NEARBY_RADIUS_METERS = Number(configuredNearbyRadiusMeters || 500);

interface Props {
  incidentId: string;
  latitude?: number | null;
  longitude?: number | null;
  classificationId?: string | null;
  incidentNumber?: string;
}

const NearbyIncidents = ({
  incidentId,
  latitude,
  longitude,
  classificationId,
  incidentNumber,
}: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    setOpen(false);
    setPage(1);
  }, [incidentId]);

  const enabled =
    NEARBY_FEATURE_ENABLED &&
    latitude != null &&
    longitude != null &&
    !!classificationId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["incident", incidentId, "nearby", page],
    queryFn: () =>
      incidentApi.searchNearby({
        incidentId,
        latitude: latitude as number,
        longitude: longitude as number,
        classificationId: classificationId as string,
        page,
        limit: PAGE_SIZE,
        radius: NEARBY_RADIUS_METERS,
      }),
    enabled,
    placeholderData: (prev) => prev,
  });

  if (!enabled) return null;

  const total = data?.total_items ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const items = data?.data ?? [];
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + items.length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[hsl(var(--border))] text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
      >
        <LocateFixed className="w-4 h-4 text-[hsl(var(--primary))]" />
        {t("incidents.nearby.button")}
        <span className="px-1.5 rounded-full text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
          {total}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {open && (
        <div className="absolute start-0 top-full z-20 mt-2 w-80 lg:w-1/2 lg:max-w-md rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
            <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {t("incidents.nearby.title")}(
              {t("incidents.nearby.within_km", {
                value: (NEARBY_RADIUS_METERS / 1000).toFixed(2),
              })}
              )
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
            >
              <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>

          {isLoading ? (
            <p className="p-4 text-sm text-[hsl(var(--muted-foreground))]">
              {t("common.loading")}
            </p>
          ) : isError ? (
            <p className="p-4 text-sm text-red-500">
              {t("incidents.nearby.error")}
            </p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-[hsl(var(--muted-foreground))]">
              {t("incidents.nearby.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-[hsl(var(--border))]">
              {items.map((n) => {
                const distanceStr = getIncidentDistance(
                  latitude,
                  longitude,
                  n.latitude,
                  n.longitude,
                  n.distance,
                );

                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/incidents/${n.id}`)}
                      className="w-full text-start px-4 py-3 hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                            {n.incident_number}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{
                              backgroundColor: n.status_color || "#6b7280",
                            }}
                          >
                            {n.status}
                          </span>
                        </div>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div>
                          <div className="text-sm text-[hsl(var(--foreground))]">
                            {n.classification_name}
                          </div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            {t("incidents.nearby.location")}:{" "}
                            {n.location_name || "-"}
                          </div>
                        </div>
                        {distanceStr && (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded shrink-0">
                            {distanceStr} away
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
              <span>{t("incidents.nearby.showing", { from, to, total })}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.2)]">
            <button
              type="button"
              onClick={() => {
                setIsMapModalOpen(true);
                setOpen(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--primary))] font-semibold hover:underline focus:outline-none transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {t("incidents.nearby.viewAllOnMap") || "View all on map"}
              </span>
            </button>
          </div>
        </div>
      )}

      {isMapModalOpen &&
        latitude != null &&
        longitude != null &&
        classificationId && (
          <NearbyIncidentsMapModal
            isOpen={isMapModalOpen}
            onClose={() => setIsMapModalOpen(false)}
            incidentId={incidentId}
            incidentNumber={incidentNumber}
            latitude={latitude}
            longitude={longitude}
            classificationId={classificationId}
            radiusMeters={NEARBY_RADIUS_METERS}
          />
        )}
    </div>
  );
};

export default NearbyIncidents;
