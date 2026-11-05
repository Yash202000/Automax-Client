import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { attachOsmBaseLayer } from "../../utils/mapProvider";
import MapFallbackNotice from "../maps/MapFallbackNotice";
import type { FireStationMapProps } from "./fireStationMap.types";

const stationIcon = (selected: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);background:${
      selected ? "#16a34a" : "#dc2626"
    }"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.4-1.8-1-2.6C16.6 9.5 19 11.5 19 15a7 7 0 0 1-14 0c0-6 6-8 7-13z"/></svg></div>`,
  });

/** Leaflet + OSM version of the fire station map (the Google fallback). */
export default function FireStationLeafletMap({
  stations,
  selectedIds,
  onToggle,
  focus,
  getName,
}: FireStationMapProps) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: true }).setView(
      [24.7136, 46.6753],
      10,
    );
    attachOsmBaseLayer(map);
    mapRef.current = map;
    const markers = markersRef.current;
    // The modal lays out after mount.
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => {
      clearTimeout(timer);
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    stations.forEach((s) => {
      const marker = L.marker([s.latitude, s.longitude], {
        icon: stationIcon(selectedIds.includes(s.id)),
        title: getName(s),
      })
        .addTo(map)
        .bindTooltip(getName(s))
        .on("click", () => onToggle(s.id));
      markersRef.current.set(s.id, marker);
    });
  }, [stations, selectedIds, onToggle, getName]);

  // Fit to the visible stations when the set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || stations.length === 0) return;
    map.fitBounds(
      L.latLngBounds(stations.map((s) => [s.latitude, s.longitude])),
      { padding: [40, 40], maxZoom: 13 },
    );
  }, [stations]);

  useEffect(() => {
    if (!focus) return;
    const s = stations.find((x) => x.id === focus.id);
    if (s)
      mapRef.current?.flyTo([s.latitude, s.longitude], 14, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapEl} className="absolute inset-0 z-0" />
      <MapFallbackNotice className="bottom-7 start-4" />
    </div>
  );
}
