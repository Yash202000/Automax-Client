import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import GoogleBaseMap from "../maps/google/GoogleBaseMap";
import {
  DEFAULT_PIN_COLOR,
  bindDropTarget,
  pinHtml,
  type IncidentMapMarker,
  type IncidentsMapProps,
} from "./incidentMap.types";

function styledPin(
  kind: IncidentMapMarker["kind"],
  color: string,
  selected: boolean,
): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = pinHtml(kind, color, selected);
  el.style.lineHeight = "0";
  // Advanced markers anchor at the bottom centre: right for the teardrop tip,
  // so centre the round station/unit icons on their point instead.
  if (kind === "station" || kind === "unit")
    el.style.transform = "translateY(50%)";
  return el;
}

/** Clustered pins for the whole incident set. */
function ClusteredMarkers({
  markers,
  selectedId,
  onSelect,
  onDropIncident,
}: IncidentsMapProps) {
  const map = useMap();
  const onDropRef = useRef(onDropIncident);
  onDropRef.current = onDropIncident;
  const markerLib = useMapsLibrary("marker");
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const elementsRef = useRef<
    Map<
      string,
      {
        marker: google.maps.marker.AdvancedMarkerElement;
        data: IncidentMapMarker;
      }
    >
  >(new Map());
  const selectedRef = useRef<string | null>(selectedId);
  const prevSelectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const markerKey = `${markers.length}:${markers[0]?.id ?? ""}:${markers[markers.length - 1]?.id ?? ""}`;

  // Build the clustered markers when the incident set changes.
  useEffect(() => {
    if (!map || !markerLib) return;
    const elements = elementsRef.current;
    elements.clear();
    const clustered: google.maps.marker.AdvancedMarkerElement[] = [];
    const plain: google.maps.marker.AdvancedMarkerElement[] = [];
    markers.forEach((m) => {
      const marker = new markerLib.AdvancedMarkerElement({
        position: { lat: m.latitude, lng: m.longitude },
        title: m.label,
        content: styledPin(
          m.kind,
          m.color || DEFAULT_PIN_COLOR,
          m.id === selectedRef.current,
        ),
      });
      marker.addListener("click", () => onSelect(m.id));
      elements.set(m.id, { marker, data: m });
      // Fire stations and units are never clustered.
      if (m.kind === "station" || m.kind === "unit") {
        bindDropTarget(marker.content as HTMLElement, (id) =>
          onDropRef.current?.(id, m),
        );
        marker.map = map;
        plain.push(marker);
      } else clustered.push(marker);
    });
    const clusterer = new MarkerClusterer({ map, markers: clustered });
    clustererRef.current = clusterer;

    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) =>
        bounds.extend({ lat: m.latitude, lng: m.longitude }),
      );
      const fit = () => {
        map.fitBounds(bounds, 40);
        google.maps.event.addListenerOnce(map, "idle", () => {
          if ((map.getZoom() ?? 0) > 14) map.setZoom(14);
        });
      };
      if (map.getBounds()) fit();
      else google.maps.event.addListenerOnce(map, "idle", fit);
    }

    return () => {
      clusterer.clearMarkers();
      clusterer.setMap(null);
      plain.forEach((p) => (p.map = null));
      clustererRef.current = null;
      elements.clear();
    };
    // Markers are rebuilt only when the set changes, not on every selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markerLib, markerKey]);

  // Highlight the selected pin and pan to it (zooming in if it sits in a cluster).
  useEffect(() => {
    if (!map) return;
    const prev = prevSelectedRef.current;
    if (prev) {
      const p = elementsRef.current.get(prev);
      if (p)
        p.marker.content = styledPin(
          p.data.kind,
          p.data.color || DEFAULT_PIN_COLOR,
          false,
        );
    }
    prevSelectedRef.current = selectedId;
    if (!selectedId) return;
    const cur = elementsRef.current.get(selectedId);
    if (!cur) return;
    cur.marker.content = styledPin(
      cur.data.kind,
      cur.data.color || DEFAULT_PIN_COLOR,
      true,
    );
    cur.marker.zIndex = 1000;
    const pos = { lat: cur.data.latitude, lng: cur.data.longitude };
    map.panTo(pos);
    if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
  }, [map, selectedId, markerKey]);

  return null;
}

/** Native Google Maps version of the incidents map, clustered. */
export default function IncidentsGoogleMap(props: IncidentsMapProps) {
  return (
    <GoogleBaseMap
      defaultCenter={{ lat: 24.7136, lng: 46.6753 }}
      defaultZoom={10}
      controls
    >
      <ClusteredMarkers {...props} />
    </GoogleBaseMap>
  );
}
