import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../utils/leafletGlobal";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { attachOsmBaseLayer } from "../../utils/mapProvider";
import MapFallbackNotice from "../maps/MapFallbackNotice";
import {
  DEFAULT_PIN_COLOR,
  FOCUS_PIN_COLOR,
  bindDropTarget,
  playDropAnimation,
  pinHtml,
  pinSize,
  type IncidentMapMarker,
  type IncidentsMapProps,
} from "./incidentMap.types";

const pinIcon = (
  kind: IncidentMapMarker["kind"],
  color: string,
  selected: boolean,
) => {
  const { w, h } = pinSize(kind, selected);
  const circle = kind === "station" || kind === "unit";
  return L.divIcon({
    className: "",
    iconSize: [w, h],
    // Circles are centred on the point; teardrops point with their tip.
    iconAnchor: circle ? [w / 2, h / 2] : [w / 2, h],
    html: pinHtml(kind, color, selected),
  });
};

/** Leaflet + OSM map of incidents, clustered (the Google fallback). */
export default function IncidentsLeafletMap({
  markers,
  selectedId,
  onSelect,
  onDropIncident,
  focusPoint,
}: IncidentsMapProps) {
  const focusMarkerRef = useRef<L.Marker | null>(null);
  const onDropRef = useRef(onDropIncident);
  onDropRef.current = onDropIncident;

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  // Fire stations and units are never clustered.
  const plainRef = useRef<L.LayerGroup | null>(null);
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  // Animate the target pin, then apply the assignment.
  const fireDrop = useRef((incidentId: string, target: IncidentMapMarker) => {
    playDropAnimation(
      markerRefs.current.get(target.id)?.getElement(),
      target.color || DEFAULT_PIN_COLOR,
      () => onDropRef.current?.(incidentId, target),
    );
  });
  const dataRefs = useRef<Map<string, IncidentMapMarker>>(new Map());
  const selectedRef = useRef<string | null>(selectedId);
  const prevSelectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;

  useEffect(() => {
    if (!mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: true }).setView(
      [24.7136, 46.6753],
      10,
    );
    attachOsmBaseLayer(map);
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      showCoverageOnHover: false,
    });
    map.addLayer(cluster);
    clusterRef.current = cluster;
    const plain = L.layerGroup().addTo(map);
    plainRef.current = plain;
    mapRef.current = map;
    const refs = markerRefs.current;
    const data = dataRefs.current;
    const timer = setTimeout(() => map.invalidateSize(), 100);
    // Re-measure when the container resizes (e.g. maximize / restore).
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(mapEl.current);
    return () => {
      clearTimeout(timer);
      resize.disconnect();
      refs.clear();
      data.clear();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      plainRef.current = null;
    };
  }, []);

  // Rebuild the clustered pins when the incident set changes. Selection is
  // handled separately so picking an incident doesn't re-cluster everything.
  useEffect(() => {
    const cluster = clusterRef.current;
    const plain = plainRef.current;
    if (!cluster || !plain) return;
    cluster.clearLayers();
    plain.clearLayers();
    markerRefs.current.clear();
    dataRefs.current.clear();
    const clustered: L.Marker[] = [];
    markers.forEach((m) => {
      const marker = L.marker([m.latitude, m.longitude], {
        icon: pinIcon(
          m.kind,
          m.color || DEFAULT_PIN_COLOR,
          m.id === selectedRef.current,
        ),
        title: m.label,
        // Incident pins can be dragged onto a fire station / unit to assign.
        draggable: m.kind !== "station" && m.kind !== "unit",
      })
        .bindTooltip(m.label)
        .on("click", () => onSelect(m.id));
      marker.on("dragend", () => {
        const map = mapRef.current;
        if (!map) return;
        const p = map.latLngToContainerPoint(marker.getLatLng());
        let hit: IncidentMapMarker | null = null;
        let best = 28; // px
        for (const [id, d] of Array.from(dataRefs.current.entries())) {
          if (d.kind !== "station" && d.kind !== "unit") continue;
          const mk = markerRefs.current.get(id);
          if (!mk) continue;
          const dist = p.distanceTo(map.latLngToContainerPoint(mk.getLatLng()));
          if (dist < best) {
            best = dist;
            hit = d;
          }
        }
        // Pins never move: snap back whether or not it landed on a target.
        marker.setLatLng([m.latitude, m.longitude]);
        if (hit) fireDrop.current(m.id, hit);
      });
      markerRefs.current.set(m.id, marker);
      dataRefs.current.set(m.id, m);
      if (m.kind === "station" || m.kind === "unit") {
        marker.on("add", () => {
          const el = marker.getElement();
          if (el) bindDropTarget(el, (id) => fireDrop.current(id, m));
        });
        plain.addLayer(marker);
      } else clustered.push(marker);
    });
    cluster.addLayers(clustered);
  }, [markers, onSelect]);

  // Fit to all pins only when the set of incidents changes.
  const markerKey = `${markers.length}:${markers[0]?.id ?? ""}:${markers[markers.length - 1]?.id ?? ""}`;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;
    map.fitBounds(
      L.latLngBounds(markers.map((m) => [m.latitude, m.longitude])),
      { padding: [40, 40], maxZoom: 14 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey]);

  // Highlight the selected pin and bring it into view, expanding the cluster
  // it is hiding in if needed.
  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!cluster || !map) return;
    const prev = prevSelectedRef.current;
    if (prev) {
      const pm = markerRefs.current.get(prev);
      const pd = dataRefs.current.get(prev);
      if (pm && pd)
        pm.setIcon(pinIcon(pd.kind, pd.color || DEFAULT_PIN_COLOR, false));
    }
    prevSelectedRef.current = selectedId;
    if (!selectedId) return;
    const marker = markerRefs.current.get(selectedId);
    const data = dataRefs.current.get(selectedId);
    if (!marker || !data) return;
    marker.setIcon(pinIcon(data.kind, data.color || DEFAULT_PIN_COLOR, true));
    if (cluster.hasLayer(marker)) {
      cluster.zoomToShowLayer(marker, () => {
        map.panTo(marker.getLatLng(), { animate: true });
      });
    } else {
      map.panTo(marker.getLatLng(), { animate: true });
    }
  }, [selectedId, markers]);

  // Fly to a searched location and mark it with a temporary pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    focusMarkerRef.current?.remove();
    focusMarkerRef.current = null;
    if (!focusPoint) return;
    const { w, h } = pinSize(undefined, true);
    focusMarkerRef.current = L.marker(
      [focusPoint.latitude, focusPoint.longitude],
      {
        icon: L.divIcon({
          className: "",
          iconSize: [w, h],
          iconAnchor: [w / 2, h],
          html: pinHtml(undefined, FOCUS_PIN_COLOR, true),
        }),
        zIndexOffset: 2000,
      },
    )
      .bindTooltip(focusPoint.label, {
        permanent: true,
        direction: "top",
        offset: [0, -h],
      })
      .addTo(map);
    map.flyTo([focusPoint.latitude, focusPoint.longitude], 15, {
      duration: 1,
    });
  }, [focusPoint]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapEl} className="absolute inset-0 z-0" />
      <MapFallbackNotice className="bottom-7 start-4" />
    </div>
  );
}
