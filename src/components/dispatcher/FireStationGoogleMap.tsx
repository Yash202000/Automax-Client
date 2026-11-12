import { useEffect } from "react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import GoogleBaseMap from "../maps/google/GoogleBaseMap";
import type { FireStationMapProps } from "./fireStationMap.types";

function StationPin({ selected }: { selected: boolean }) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        border: "3px solid #fff",
        boxShadow: "0 2px 8px rgba(0,0,0,.4)",
        background: selected ? "#16a34a" : "#dc2626",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.4-1.8-1-2.6C16.6 9.5 19 11.5 19 15a7 7 0 0 1-14 0c0-6 6-8 7-13z" />
      </svg>
    </div>
  );
}

function MapController({
  stations,
  focus,
}: Pick<FireStationMapProps, "stations" | "focus">) {
  const map = useMap();

  // Fit to the visible stations when the set changes. Wait for the map's first
  // idle so the (still laying out) modal doesn't make it zoom in too far.
  useEffect(() => {
    if (!map || stations.length === 0) return;
    let ready: google.maps.MapsEventListener | null = null;
    let settled: google.maps.MapsEventListener | null = null;
    const fit = () => {
      const bounds = new google.maps.LatLngBounds();
      stations.forEach((s) =>
        bounds.extend({ lat: s.latitude, lng: s.longitude }),
      );
      map.fitBounds(bounds, 40);
      settled = google.maps.event.addListenerOnce(map, "idle", () => {
        if ((map.getZoom() ?? 0) > 13) map.setZoom(13);
      });
    };
    if (map.getBounds()) fit();
    else ready = google.maps.event.addListenerOnce(map, "idle", fit);
    return () => {
      ready?.remove();
      settled?.remove();
    };
  }, [map, stations]);

  useEffect(() => {
    if (!map || !focus) return;
    const s = stations.find((x) => x.id === focus.id);
    if (!s) return;
    map.panTo({ lat: s.latitude, lng: s.longitude });
    map.setZoom(14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus]);

  return null;
}

/** Native Google Maps version of the fire station map. */
export default function FireStationGoogleMap({
  stations,
  selectedIds,
  onToggle,
  focus,
  getName,
}: FireStationMapProps) {
  return (
    <GoogleBaseMap
      defaultCenter={{ lat: 24.7136, lng: 46.6753 }}
      defaultZoom={10}
      controls
    >
      <MapController stations={stations} focus={focus} />
      {stations.map((s) => (
        <AdvancedMarker
          key={s.id}
          position={{ lat: s.latitude, lng: s.longitude }}
          title={getName(s)}
          onClick={() => onToggle(s.id)}
        >
          <StationPin selected={selectedIds.includes(s.id)} />
        </AdvancedMarker>
      ))}
    </GoogleBaseMap>
  );
}
