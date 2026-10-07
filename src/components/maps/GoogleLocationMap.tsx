import { useEffect, useMemo, useState } from "react";
import { AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import type { Location } from "../../types";
import type { LocationMapProps } from "./LeafletLocationMap";
import GoogleBaseMap from "./google/GoogleBaseMap";

// Same colour-per-type mapping as the Leaflet version.
const getMarkerColor = (type?: string): string => {
  const colorMap: Record<string, string> = {
    country: "#3b82f6",
    state: "#22c55e",
    city: "#f59e0b",
    building: "#ef4444",
    floor: "#8b5cf6",
    room: "#ec4899",
  };
  return colorMap[type?.toLowerCase() || ""] || "#6b7280";
};

interface MarkerGroup {
  key: string;
  lat: number;
  lng: number;
  items: Location[];
}

const MAX_FIT_ZOOM = 15;

// Fits the map to all markers (like Leaflet's fitBounds with maxZoom) and pans
// to the selected location.
function MapController({
  groups,
  selectedId,
}: {
  groups: MarkerGroup[];
  selectedId?: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || groups.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    groups.forEach((g) => bounds.extend({ lat: g.lat, lng: g.lng }));
    map.fitBounds(bounds, 50);
    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 0) > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
    });
    return () => listener.remove();
  }, [map, groups]);

  useEffect(() => {
    if (!map || !selectedId) return;
    const group = groups.find((g) => g.items.some((i) => i.id === selectedId));
    if (group) map.panTo({ lat: group.lat, lng: group.lng });
  }, [map, groups, selectedId]);

  return null;
}

export default function GoogleLocationMap({
  locations,
  selectedId,
  onSelect,
  height = "400px",
  className = "",
  center = [0, 0],
  zoom = 2,
}: LocationMapProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Group locations that share exact coordinates into one marker.
  const groups = useMemo<MarkerGroup[]>(() => {
    const byCoord = new Map<string, Location[]>();
    locations
      .filter((l) => l.latitude !== undefined && l.longitude !== undefined)
      .forEach((l) => {
        const key = `${l.latitude},${l.longitude}`;
        if (!byCoord.has(key)) byCoord.set(key, []);
        byCoord.get(key)!.push(l);
      });
    return Array.from(byCoord.entries()).map(([key, items]) => {
      const [lat, lng] = key.split(",").map(Number);
      return { key, lat, lng, items };
    });
  }, [locations]);

  // A selection from outside (e.g. the list) opens that marker's popup.
  useEffect(() => {
    if (!selectedId) return;
    const group = groups.find((g) => g.items.some((i) => i.id === selectedId));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (group) setOpenKey(group.key);
  }, [groups, selectedId]);

  const openGroup = groups.find((g) => g.key === openKey);
  const viewDetailUrl = (id: string) =>
    `${window.location.origin}${import.meta.env.VITE_BASE_PATH}incidents/${id}`;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
      style={{ height, width: "100%" }}
    >
      <GoogleBaseMap
        defaultCenter={{ lat: center[0], lng: center[1] }}
        defaultZoom={zoom}
        controls
      >
        <MapController groups={groups} selectedId={selectedId} />

        {groups.map((group) => {
          const count = group.items.length;
          const isSelected = group.items.some((i) => i.id === selectedId);
          const size = isSelected ? 32 : 24;
          return (
            <AdvancedMarker
              key={group.key}
              position={{ lat: group.lat, lng: group.lng }}
              zIndex={isSelected ? 500 : 100}
              onClick={() => {
                setOpenKey((k) => (k === group.key ? null : group.key));
                if (onSelect && count === 1) onSelect(group.items[0]);
              }}
            >
              <div
                style={{
                  width: size,
                  height: size,
                  backgroundColor: getMarkerColor(group.items[0].type),
                  border: `${isSelected ? 3 : 2}px solid white`,
                  borderRadius: "50%",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: size * 0.4,
                  transform: isSelected ? "scale(1.2)" : undefined,
                  cursor: "pointer",
                }}
              >
                {count > 1 ? count : ""}
              </div>
            </AdvancedMarker>
          );
        })}

        {openGroup && (
          <InfoWindow
            position={{ lat: openGroup.lat, lng: openGroup.lng }}
            onCloseClick={() => setOpenKey(null)}
          >
            <div
              style={{
                minWidth: 200,
                maxHeight: 300,
                overflowY: "auto",
                paddingRight: 5,
              }}
            >
              {openGroup.items.length > 1 && (
                <h4
                  style={{
                    margin: "0 0 10px 0",
                    borderBottom: "1px solid #eee",
                    paddingBottom: 5,
                    fontWeight: "bold",
                  }}
                >
                  {openGroup.items.length} Incidents
                </h4>
              )}
              {openGroup.items.map((location, idx) => (
                <div
                  key={location.id}
                  style={{
                    marginBottom: 12,
                    paddingBottom: 8,
                    borderBottom:
                      idx < openGroup.items.length - 1
                        ? "1px dashed #eee"
                        : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <strong style={{ fontSize: 14, color: "#1e293b" }}>
                      {location.name}
                    </strong>
                    <span
                      style={{
                        fontSize: 10,
                        background: "#f1f5f9",
                        padding: "1px 4px",
                        borderRadius: 4,
                        color: "#64748b",
                      }}
                    >
                      {location.code}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "4px 0",
                      fontSize: 12,
                      color: "#475569",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {location.description || ""}
                  </p>
                  {location.address && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      {location.address}
                    </div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <a
                      href={viewDetailUrl(location.id)}
                      style={{
                        color: "#3b82f6",
                        fontSize: 12,
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      View Detail →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </InfoWindow>
        )}
      </GoogleBaseMap>
    </div>
  );
}
