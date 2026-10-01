import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Search,
  Maximize2,
  LocateFixed,
  ExternalLink,
  Layers,
  ChevronRight,
  Compass,
  AlertCircle,
  X,
} from "lucide-react";
import { Modal, ModalBody, ModalHeader, ModalTitle } from "../ui/Modal";
import { incidentApi, type NearbyIncident } from "../../api/admin";
import { getOsmTileUrl } from "../../utils/osmTileUrl";
import { getIncidentDistance } from "../../utils/geoDistance";

// Fix default marker icon issue with bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

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

// Create custom animated icon for the current reference incident
function createCurrentIncidentIcon(incidentNumber?: string): L.DivIcon {
  return L.divIcon({
    className: "current-incident-marker",
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.25);
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
            <line x1="12" y1="2" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
}

// Create custom marker for nearby incidents
function createNearbyIncidentIcon(
  color: string,
  isSelected: boolean = false,
  count: number = 1,
): L.DivIcon {
  const size = isSelected ? 36 : count > 1 ? 32 : 28;
  const borderWidth = isSelected ? 3 : 2;

  return L.divIcon({
    className: "nearby-incident-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: ${borderWidth}px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: ${count > 1 ? "12px" : "11px"};
        transform: ${isSelected ? "scale(1.2)" : "scale(1)"};
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      ">
        ${
          count > 1
            ? count
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
        }
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function NearbyIncidentsMapModal({
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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [searchFilter, setSearchFilter] = useState("");
  const [showRadiusCircle, setShowRadiusCircle] = useState(true);

  // Fetch all nearby incidents for the map (limit 100)
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

  // Filter items with valid coordinates
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

  // Filter list by user search
  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return itemsWithCoords;
    const q = searchFilter.toLowerCase().trim();
    return itemsWithCoords.filter(
      (item) =>
        item.incident_number?.toLowerCase().includes(q) ||
        item.location_name?.toLowerCase().includes(q) ||
        item.status?.toLowerCase().includes(q) ||
        item.classification_name?.toLowerCase().includes(q),
    );
  }, [itemsWithCoords, searchFilter]);

  // Handle delegated navigation from Leaflet popups
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handleContainerClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-view-incident-id]",
      );
      if (btn) {
        const id = btn.getAttribute("data-view-incident-id");
        if (id) {
          onClose();
          navigate(`/incidents/${id}`);
        }
      }
    };

    container.addEventListener("click", handleContainerClick);
    return () => container.removeEventListener("click", handleContainerClick);
  }, [navigate, onClose]);

  // Center on current incident
  const handleCenterCurrent = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([latitude, longitude], 15, {
      duration: 0.8,
    });
    if (currentMarkerRef.current) {
      currentMarkerRef.current.openPopup();
    }
  }, [latitude, longitude]);

  // Fit all markers and radius
  const handleFitAll = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = L.latLngBounds([[latitude, longitude]]);

    itemsWithCoords.forEach((item) => {
      bounds.extend([item.latitude as number, item.longitude as number]);
    });

    if (radiusCircleRef.current) {
      bounds.extend(radiusCircleRef.current.getBounds());
    }

    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [latitude, longitude, itemsWithCoords]);

  // Select an incident from list
  const handleSelectIncident = useCallback((item: NearbyIncident) => {
    setSelectedIncidentId(item.id);
    if (!mapRef.current || item.latitude == null || item.longitude == null)
      return;

    mapRef.current.flyTo([item.latitude, item.longitude], 16, {
      duration: 0.8,
    });

    const marker = markersRef.current.get(item.id);
    if (marker) {
      marker.openPopup();
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Small delay to ensure modal DOM layout has rendered
    const initTimer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([latitude, longitude], 14);

      mapRef.current = map;

      // Add Zoom Control at top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Add Tile Layer
      L.tileLayer(getOsmTileUrl(), {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Add Radius Circle
      const circle = L.circle([latitude, longitude], {
        radius: radiusMeters,
        color: "#2563eb",
        weight: 1.5,
        dashArray: "6, 6",
        fillColor: "#3b82f6",
        fillOpacity: 0.08,
      }).addTo(map);
      radiusCircleRef.current = circle;

      // Add Current Incident Marker
      const currentIcon = createCurrentIncidentIcon(incidentNumber);
      const currentMarker = L.marker([latitude, longitude], {
        icon: currentIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      const currentPopup = `
        <div style="min-width: 190px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px;">
              ${t("incidents.nearby.currentIncident") || "Current Incident"}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 14px; color: #111827; margin-bottom: 2px;">
            ${incidentNumber || incidentId}
          </div>
          <div style="font-size: 11px; color: #6b7280;">
            ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
          </div>
          <div style="margin-top: 6px; font-size: 11px; color: #3b82f6; font-weight: 500;">
            📍 ${t("incidents.nearby.withinRadius", { radius: (radiusMeters / 1000).toFixed(0) }) || `Within ${(radiusMeters / 1000).toFixed(0)}km radius`}
          </div>
        </div>
      `;
      currentMarker.bindPopup(currentPopup);
      currentMarkerRef.current = currentMarker;

      map.invalidateSize();
    }, 50);

    return () => {
      clearTimeout(initTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        radiusCircleRef.current = null;
        currentMarkerRef.current = null;
        markersRef.current.clear();
      }
    };
  }, [
    isOpen,
    latitude,
    longitude,
    radiusMeters,
    incidentNumber,
    incidentId,
    t,
  ]);

  // Handle map invalidateSize on modal render & resizing
  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    const timers = [
      setTimeout(() => mapRef.current?.invalidateSize(), 150),
      setTimeout(() => mapRef.current?.invalidateSize(), 350),
      setTimeout(() => mapRef.current?.invalidateSize(), 600),
    ];

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        mapRef.current?.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      resizeObserver?.disconnect();
    };
  }, [isOpen]);

  // Update radius circle visibility
  useEffect(() => {
    if (!mapRef.current || !radiusCircleRef.current) return;
    if (showRadiusCircle) {
      if (!mapRef.current.hasLayer(radiusCircleRef.current)) {
        radiusCircleRef.current.addTo(mapRef.current);
      }
    } else {
      if (mapRef.current.hasLayer(radiusCircleRef.current)) {
        radiusCircleRef.current.remove();
      }
    }
  }, [showRadiusCircle]);

  // Plot Nearby Incidents Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing nearby markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    if (itemsWithCoords.length === 0) return;

    // Group incidents by exact coordinates
    const groups = new Map<string, NearbyIncident[]>();
    itemsWithCoords.forEach((item) => {
      const key = `${item.latitude},${item.longitude}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    const bounds = L.latLngBounds([[latitude, longitude]]);

    groups.forEach((groupItems, coords) => {
      const [lat, lng] = coords.split(",").map(Number);
      const isSelected = groupItems.some(
        (item) => item.id === selectedIncidentId,
      );
      const count = groupItems.length;
      const color = groupItems[0].status_color || "#3b82f6";

      const icon = createNearbyIncidentIcon(color, isSelected, count);
      const marker = L.marker([lat, lng], { icon }).addTo(mapRef.current!);

      // Construct popup HTML
      const isMultiple = count > 1;
      const popupHtml = `
        <div style="min-width: 220px; max-width: 280px; max-height: 320px; overflow-y: auto; padding: 4px;">
          ${
            isMultiple
              ? `<div style="font-size: 12px; font-weight: 700; color: #1f2937; padding-bottom: 6px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
                  ${count} Incidents at this location
                </div>`
              : ""
          }
          ${groupItems
            .map((item, idx) => {
              const distStr = getIncidentDistance(
                latitude,
                longitude,
                item.latitude,
                item.longitude,
                item.distance,
              );

              return `
              <div style="margin-bottom: 10px; padding-bottom: 8px; ${idx < groupItems.length - 1 ? "border-bottom: 1px dashed #e5e7eb;" : ""}">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                  <span style="font-weight: 700; font-size: 13px; color: #2563eb;">
                    ${item.incident_number}
                  </span>
                  <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 9999px; color: #ffffff; background-color: ${item.status_color || "#6b7280"};">
                    ${item.status}
                  </span>
                </div>

                <div style="font-size: 12px; font-weight: 500; color: #374151; margin-top: 3px;">
                  ${item.classification_name}
                </div>

                ${
                  item.location_name
                    ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                        <span>📍</span><span>${item.location_name}</span>
                       </div>`
                    : ""
                }

                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
                  <span style="font-size: 11px; color: #059669; font-weight: 600; background: #ecfdf5; padding: 1px 6px; border-radius: 4px;">
                    ${distStr} away
                  </span>
                  <button
                    type="button"
                    data-view-incident-id="${item.id}"
                    style="
                      background: #2563eb;
                      color: white;
                      border: none;
                      padding: 4px 8px;
                      border-radius: 5px;
                      font-size: 11px;
                      font-weight: 500;
                      cursor: pointer;
                    "
                  >
                    ${t("incidents.nearby.viewDetails") || "View Details"} →
                  </button>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;

      marker.bindPopup(popupHtml);

      groupItems.forEach((item) => {
        markersRef.current.set(item.id, marker);
      });

      bounds.extend([lat, lng]);
    });

    // Auto-fit to show both current and nearby incidents
    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [itemsWithCoords, selectedIncidentId, latitude, longitude, t]);

  const radiusKm = (radiusMeters / 1000).toFixed(0);

  return (
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
                  ? t("incidents.nearby.oneIncidentCount") || "nearby incident"
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
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Quick Floating Map Actions */}
          <div className="absolute top-4 start-4 z-[400] flex flex-wrap gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={handleCenterCurrent}
              title={t("incidents.nearby.centerCurrent") || "Center on Current"}
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

        {/* Incidents Sidebar List */}
        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-s border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col h-[40vh] md:h-[calc(92vh-130px)]">
          {/* Sidebar Search Bar */}
          <div className="p-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={
                  t("incidents.nearby.filterPlaceholder") ||
                  "Filter by number, status, location..."
                }
                className="w-full ps-9 pe-8 py-1.5 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
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
                onClick={handleCenterCurrent}
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

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectIncident(item)}
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
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-1 text-xs font-medium text-[hsl(var(--foreground))] line-clamp-1">
                      {item.classification_name}
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                      <div className="flex items-center gap-1 truncate max-w-[170px]">
                        <MapPin className="w-3 h-3 shrink-0 text-[hsl(var(--muted-foreground))]" />
                        <span className="truncate">
                          {item.location_name || "-"}
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
                          onClose();
                          navigate(`/incidents/${item.id}`);
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
      </ModalBody>
    </Modal>
  );
}

export default NearbyIncidentsMapModal;
