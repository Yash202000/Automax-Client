import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AdvancedMarker,
  Circle as GoogleCircle,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  AlertCircle,
  Compass,
  Layers,
  LocateFixed,
  Maximize2,
} from "lucide-react";
import { Modal, ModalBody, ModalHeader, ModalTitle } from "../ui/Modal";
import { incidentApi, type NearbyIncident } from "../../api/admin";
import { getIncidentDistance } from "../../utils/geoDistance";
import {
  localizeNearbyIncident,
  matchesNearbySearch,
} from "../../utils/nearbyIncidentLocale";
import GoogleBaseMap from "../maps/google/GoogleBaseMap";
import NearbyIncidentsSidebar from "./NearbyIncidentsSidebar";

interface NearbyIncidentsMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  incidentNumber?: string;
  latitude: number;
  longitude: number;
  classificationId: string;
  radiusMeters?: number;
}

type LatLng = google.maps.LatLngLiteral;
// eslint-disable-next-line no-unused-vars
type Translate = (key: string, opts?: Record<string, unknown>) => string;

interface MarkerGroup {
  key: string;
  lat: number;
  lng: number;
  items: NearbyIncident[];
  color: string;
}

// Incidents sharing exact coordinates share one marker (and one popup).
function groupByCoord(items: NearbyIncident[]): MarkerGroup[] {
  const byCoord = new Map<string, NearbyIncident[]>();
  items.forEach((item) => {
    const key = `${item.latitude},${item.longitude}`;
    if (!byCoord.has(key)) byCoord.set(key, []);
    byCoord.get(key)!.push(item);
  });
  return Array.from(byCoord.entries()).map(([key, groupItems]) => {
    const [lat, lng] = key.split(",").map(Number);
    return {
      key,
      lat,
      lng,
      items: groupItems,
      color: groupItems[0].status_color || "#3b82f6",
    };
  });
}

const coordKey = (item: NearbyIncident) => `${item.latitude},${item.longitude}`;

// Runs the map commands (fit to markers, fly to a point) triggered from the
// buttons and the list. Must live inside the map to use useMap.
function MapController({
  fitTarget,
  flyTarget,
  onFitDone,
  onFlyDone,
}: {
  fitTarget: { points: LatLng[]; padding: number; maxZoom: number } | null;
  flyTarget: { point: LatLng; zoom: number } | null;
  onFitDone: () => void;
  onFlyDone: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !fitTarget || fitTarget.points.length === 0) return;
    let listener: google.maps.MapsEventListener | null = null;

    const fit = () => {
      const bounds = new google.maps.LatLngBounds();
      fitTarget.points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, fitTarget.padding);
      // fitBounds has no max zoom (Leaflet's does); clamp once it settles.
      listener = google.maps.event.addListenerOnce(map, "idle", () => {
        if ((map.getZoom() ?? 0) > fitTarget.maxZoom) {
          map.setZoom(fitTarget.maxZoom);
        }
      });
      onFitDone();
    };

    // Fitting before Google has sized and rendered the map (the modal is still
    // laying out) zooms in as far as possible, so wait for its first idle.
    let ready: google.maps.MapsEventListener | null = null;
    if (map.getBounds()) {
      fit();
    } else {
      ready = google.maps.event.addListenerOnce(map, "idle", fit);
    }
    return () => {
      ready?.remove();
      listener?.remove();
    };
  }, [map, fitTarget, onFitDone]);

  useEffect(() => {
    if (!map || !flyTarget) return;
    map.panTo(flyTarget.point);
    map.setZoom(flyTarget.zoom);
    onFlyDone();
  }, [map, flyTarget, onFlyDone]);

  return null;
}

function CurrentIncidentMarker({
  position,
  onClick,
}: {
  position: LatLng;
  onClick: () => void;
}) {
  return (
    <AdvancedMarker position={position} zIndex={1000} onClick={onClick}>
      <div
        style={{
          position: "relative",
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.25)",
            animation: "nearby-ping 2s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <div
          style={{
            position: "relative",
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
            border: "3px solid #ffffff",
            boxShadow: "0 4px 12px rgba(37,99,235,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </div>
      </div>
    </AdvancedMarker>
  );
}

function IncidentGroupMarker({
  group,
  isSelected,
  onClick,
}: {
  group: MarkerGroup;
  isSelected: boolean;
  onClick: () => void;
}) {
  const count = group.items.length;
  const size = isSelected ? 36 : count > 1 ? 32 : 28;
  return (
    <AdvancedMarker
      position={{ lat: group.lat, lng: group.lng }}
      zIndex={isSelected ? 500 : 100}
      onClick={onClick}
    >
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: group.color,
          border: `${isSelected ? 3 : 2}px solid white`,
          borderRadius: "50%",
          boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          fontSize: count > 1 ? 12 : 11,
          transform: isSelected ? "scale(1.2)" : "scale(1)",
          transition: "transform 0.2s ease",
          cursor: "pointer",
        }}
      >
        {count > 1 ? (
          count
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        )}
      </div>
    </AdvancedMarker>
  );
}

function GroupPopup({
  group,
  latitude,
  longitude,
  t,
  onClose,
  onNavigate,
}: {
  group: MarkerGroup;
  latitude: number;
  longitude: number;
  t: Translate;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onNavigate: (id: string) => void;
}) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");

  return (
    <InfoWindow
      position={{ lat: group.lat, lng: group.lng }}
      onCloseClick={onClose}
    >
      <div
        style={{
          minWidth: 220,
          maxWidth: 280,
          maxHeight: 320,
          overflowY: "auto",
          padding: 4,
        }}
      >
        {group.items.length > 1 && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1f2937",
              paddingBottom: 6,
              marginBottom: 8,
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {t("incidents.nearby.incidentsAtLocation", {
              count: group.items.length,
            })}
          </div>
        )}
        {group.items.map((item, idx) => {
          const label = localizeNearbyIncident(item, isArabic);
          return (
            <div
              key={item.id}
              style={{
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom:
                  idx < group.items.length - 1 ? "1px dashed #e5e7eb" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span
                  style={{ fontWeight: 700, fontSize: 13, color: "#2563eb" }}
                >
                  {item.incident_number}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 9999,
                    color: "#fff",
                    backgroundColor: item.status_color || "#6b7280",
                  }}
                >
                  {label.status}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#374151",
                  marginTop: 3,
                }}
              >
                {label.classificationName}
              </div>
              {label.locationName && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginTop: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>{"\u{1F4CD}"}</span>
                  <span>{label.locationName}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#059669",
                    fontWeight: 600,
                    background: "#ecfdf5",
                    padding: "1px 6px",
                    borderRadius: 4,
                  }}
                >
                  {t("incidents.nearby.away", {
                    distance: getIncidentDistance(
                      latitude,
                      longitude,
                      item.latitude,
                      item.longitude,
                      item.distance,
                    ),
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  style={{
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: 5,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {t("incidents.nearby.viewDetails") || "View Details"} →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </InfoWindow>
  );
}

export default function GoogleNearbyIncidentsMapModal({
  isOpen,
  onClose,
  incidentId,
  incidentNumber,
  latitude,
  longitude,
  classificationId,
  radiusMeters = 5000,
}: NearbyIncidentsMapModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [currentPopupOpen, setCurrentPopupOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [showRadiusCircle, setShowRadiusCircle] = useState(true);
  const [fitTarget, setFitTarget] = useState<{
    points: LatLng[];
    padding: number;
    maxZoom: number;
  } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{
    point: LatLng;
    zoom: number;
  } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["incident", incidentId, "nearby-all-map"],
    queryFn: () =>
      incidentApi.searchNearby({
        incidentId,
        latitude,
        longitude,
        classificationId,
        page: 1,
        limit: 100,
      }),
    enabled:
      isOpen && !!classificationId && latitude != null && longitude != null,
  });

  const nearbyItems = useMemo(() => data?.data ?? [], [data]);

  const itemsWithCoords = useMemo(
    () =>
      nearbyItems.filter(
        (item) =>
          item.latitude != null &&
          item.longitude != null &&
          !isNaN(item.latitude) &&
          !isNaN(item.longitude),
      ),
    [nearbyItems],
  );

  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return itemsWithCoords;
    const q = searchFilter.toLowerCase().trim();
    return itemsWithCoords.filter((item) => matchesNearbySearch(item, q));
  }, [itemsWithCoords, searchFilter]);

  const markerGroups = useMemo(
    () => groupByCoord(itemsWithCoords),
    [itemsWithCoords],
  );

  const allPoints = useMemo<LatLng[]>(
    () => [
      { lat: latitude, lng: longitude },
      ...itemsWithCoords.map((i) => ({
        lat: i.latitude as number,
        lng: i.longitude as number,
      })),
    ],
    [itemsWithCoords, latitude, longitude],
  );

  // Show the current incident and everything nearby once they load.
  useEffect(() => {
    if (!isOpen || itemsWithCoords.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFitTarget({ points: allPoints, padding: 50, maxZoom: 15 });
  }, [isOpen, itemsWithCoords, allPoints]);

  const handleCenterCurrent = useCallback(() => {
    setFlyTarget({ point: { lat: latitude, lng: longitude }, zoom: 15 });
    setCurrentPopupOpen(true);
  }, [latitude, longitude]);

  // Fit all markers and the radius circle (approximated as a bounding box).
  const handleFitAll = useCallback(() => {
    const dLat = radiusMeters / 111320;
    const dLng = radiusMeters / (111320 * Math.cos((latitude * Math.PI) / 180));
    setFitTarget({
      points: [
        ...allPoints,
        { lat: latitude + dLat, lng: longitude + dLng },
        { lat: latitude - dLat, lng: longitude - dLng },
      ],
      padding: 40,
      maxZoom: 16,
    });
  }, [allPoints, latitude, longitude, radiusMeters]);

  const handleSelectIncident = useCallback((item: NearbyIncident) => {
    setSelectedIncidentId(item.id);
    if (item.latitude == null || item.longitude == null) return;
    setFlyTarget({
      point: { lat: item.latitude, lng: item.longitude },
      zoom: 16,
    });
    setOpenGroupKey(coordKey(item));
  }, []);

  const handleNavigate = useCallback(
    (id: string) => {
      onClose();
      navigate(`/incidents/${id}`);
    },
    [onClose, navigate],
  );

  const radiusKm = (radiusMeters / 1000).toFixed(0);
  const openGroup = markerGroups.find((g) => g.key === openGroupKey);
  const translate = t as Translate;

  return (
    <>
      <style>{`
        @keyframes nearby-ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="full"
        className="max-h-[92vh] max-w-6xl flex flex-col overflow-hidden"
      >
        <ModalHeader className="flex items-center justify-between py-3.5 px-6 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
              <LocateFixed className="w-5 h-5" />
            </div>
            <div>
              <ModalTitle className="text-base font-semibold text-[hsl(var(--foreground))]">
                {t("incidents.nearby.mapModalTitle") || "Nearby Incidents Map"}
              </ModalTitle>
              <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                <span>
                  {t("incidents.nearby.withinRadius", { radius: radiusKm }) ||
                    `Within ${radiusKm}km radius`}
                </span>
                <span>•</span>
                <span className="font-medium text-[hsl(var(--primary))]">
                  {itemsWithCoords.length}{" "}
                  {itemsWithCoords.length === 1
                    ? t("incidents.nearby.oneIncidentCount") ||
                      "nearby incident"
                    : t("incidents.nearby.incidentsCount", {
                        count: itemsWithCoords.length,
                      }) || "nearby incidents"}
                </span>
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="p-0 flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-[500px]">
          {/* Main Map View */}
          <div className="relative flex-1 h-[55vh] md:h-[calc(92vh-130px)] min-h-[380px] bg-[hsl(var(--muted)/0.2)]">
            <GoogleBaseMap
              defaultCenter={{ lat: latitude, lng: longitude }}
              defaultZoom={14}
              controls
            >
              <MapController
                fitTarget={fitTarget}
                flyTarget={flyTarget}
                onFitDone={() => setFitTarget(null)}
                onFlyDone={() => setFlyTarget(null)}
              />

              {showRadiusCircle && (
                <GoogleCircle
                  center={{ lat: latitude, lng: longitude }}
                  radius={radiusMeters}
                  strokeColor="#2563eb"
                  strokeOpacity={0.7}
                  strokeWeight={1.5}
                  fillColor="#3b82f6"
                  fillOpacity={0.08}
                />
              )}

              <CurrentIncidentMarker
                position={{ lat: latitude, lng: longitude }}
                onClick={() => setCurrentPopupOpen((open) => !open)}
              />
              {currentPopupOpen && (
                <InfoWindow
                  position={{ lat: latitude, lng: longitude }}
                  onCloseClick={() => setCurrentPopupOpen(false)}
                >
                  <div style={{ minWidth: 190, padding: 2 }}>
                    <div style={{ marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          background: "#dbeafe",
                          color: "#1e40af",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {t("incidents.nearby.currentIncident") ||
                          "Current Incident"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#111827",
                        marginBottom: 2,
                      }}
                    >
                      {incidentNumber || incidentId}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: "#3b82f6",
                        fontWeight: 500,
                      }}
                    >
                      {"\u{1F4CD}"}{" "}
                      {t("incidents.nearby.withinRadius", {
                        radius: radiusKm,
                      }) || `Within ${radiusKm}km radius`}
                    </div>
                  </div>
                </InfoWindow>
              )}

              {markerGroups.map((group) => (
                <IncidentGroupMarker
                  key={group.key}
                  group={group}
                  isSelected={group.items.some(
                    (i) => i.id === selectedIncidentId,
                  )}
                  onClick={() => {
                    setSelectedIncidentId(group.items[0].id);
                    setOpenGroupKey((key) =>
                      key === group.key ? null : group.key,
                    );
                  }}
                />
              ))}
              {openGroup && (
                <GroupPopup
                  group={openGroup}
                  latitude={latitude}
                  longitude={longitude}
                  t={translate}
                  onClose={() => setOpenGroupKey(null)}
                  onNavigate={handleNavigate}
                />
              )}
            </GoogleBaseMap>

            {/* Quick Floating Map Actions */}
            <div className="absolute top-4 start-4 z-[400] flex flex-wrap gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={handleCenterCurrent}
                title={
                  t("incidents.nearby.centerCurrent") || "Center on Current"
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {t("incidents.nearby.centerCurrent") || "Current Incident"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleFitAll}
                title={t("incidents.nearby.fitAll") || "Fit All Markers"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                <span>{t("incidents.nearby.fitAll") || "Fit All"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRadiusCircle((prev) => !prev)}
                title="Toggle Radius"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-md text-xs font-medium transition-colors ${
                  showRadiusCircle
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300"
                    : "bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{radiusKm}km Circle</span>
              </button>
            </div>

            {/* Map Loading State */}
            {isLoading && (
              <div className="absolute inset-0 z-[500] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                    {t("common.loading") || "Loading nearby data..."}
                  </span>
                </div>
              </div>
            )}

            {/* Map Error State */}
            {isError && (
              <div className="absolute top-16 start-4 end-4 md:end-auto z-[500] p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{t("incidents.nearby.error")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="underline font-semibold hover:text-red-900"
                >
                  {t("common.retry") || "Retry"}
                </button>
              </div>
            )}
          </div>

          <NearbyIncidentsSidebar
            incidentId={incidentId}
            incidentNumber={incidentNumber}
            latitude={latitude}
            longitude={longitude}
            searchFilter={searchFilter}
            onSearchFilterChange={setSearchFilter}
            filteredItems={filteredItems}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={handleSelectIncident}
            onCenterCurrent={handleCenterCurrent}
            onViewIncident={handleNavigate}
          />
        </ModalBody>
      </Modal>
    </>
  );
}
