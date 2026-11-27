import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import GoogleBaseMap from "../maps/google/GoogleBaseMap";
import GoogleDefaultView from "../maps/google/GoogleDefaultView";
import { useMapDefaultCenter } from "../../hooks/useMapConfig";
import {
  DEFAULT_PIN_COLOR,
  FOCUS_PIN_COLOR,
  LINK_COLOR,
  ROUTE_COLOR,
  GLIDE_MS,
  TRAIL_POINTS,
  type FocusPoint,
  bindDropTarget,
  isUnitMarker,
  staticMarkerKey,
  playDropAnimation,
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

/**
 * Display positions for incident pins that share (almost) the same
 * coordinate: each gets a spot on a small ring around it, so every pin can be
 * seen and dragged. Real coordinates are untouched.
 */
function spreadOverlapping(
  list: IncidentMapMarker[],
): Map<string, google.maps.LatLngLiteral> {
  const groups = new Map<string, IncidentMapMarker[]>();
  for (const m of list) {
    if (m.kind === "station" || m.kind === "unit") continue;
    const key = `${m.latitude.toFixed(5)},${m.longitude.toFixed(5)}`;
    const g = groups.get(key);
    if (g) g.push(m);
    else groups.set(key, [m]);
  }
  const out = new Map<string, google.maps.LatLngLiteral>();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    // ~6 m per pin of ring radius, at least 8 m.
    const radiusM = Math.max(8, g.length * 3);
    g.forEach((m, i) => {
      const angle = (2 * Math.PI * i) / g.length;
      const dLat = (radiusM * Math.cos(angle)) / 111_320;
      const dLng =
        (radiusM * Math.sin(angle)) /
        (111_320 * Math.cos((m.latitude * Math.PI) / 180));
      out.set(m.id, { lat: m.latitude + dLat, lng: m.longitude + dLng });
    });
  }
  return out;
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
  const onSelectRef = useRef(onSelect);
  const markersRef = useRef(markers);
  const staticRef = useRef<IncidentMapMarker[]>([]);
  const selectedRef = useRef<string | null>(selectedId);
  // Keep the latest props available to effects and event handlers. Declared
  // first so it runs before the effects below.
  useEffect(() => {
    onDropRef.current = onDropIncident;
    onSelectRef.current = onSelect;
    markersRef.current = markers;
    staticRef.current = markers.filter((m) => !isUnitMarker(m));
    selectedRef.current = selectedId;
  });
  const staticKey = staticMarkerKey(markers);
  // Units glide between fixes and leave a short trail.
  const unitsRef = useRef<
    Map<
      string,
      {
        trail: google.maps.Polyline;
        history: google.maps.LatLngLiteral[];
        pos: google.maps.LatLngLiteral;
        target: google.maps.LatLngLiteral;
        raf: number;
      }
    >
  >(new Map());
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
  // Animate the target pin, then apply the assignment.
  const fireDrop = (incidentId: string, target: IncidentMapMarker) =>
    playDropAnimation(
      elementsRef.current.get(target.id)?.marker.content as HTMLElement,
      target.color || DEFAULT_PIN_COLOR,
      () => onDropRef.current?.(incidentId, target),
    );
  // Where each pin rests (its ring slot), or its fanned-out spot while a
  // cluster is open; a dragged pin snaps back here.
  const restRef = useRef<Map<string, google.maps.LatLngLiteral>>(new Map());
  const prevSelectedRef = useRef<string | null>(null);
  const markerKey = `${markers.length}:${markers[0]?.id ?? ""}:${markers[markers.length - 1]?.id ?? ""}`;

  // Build the clustered markers when the incident set changes (units are
  // handled separately so their movement never rebuilds these).
  useEffect(() => {
    if (!map || !markerLib) return;
    const elements = elementsRef.current;
    const dropStatic = () =>
      Array.from(elements.entries()).forEach(([id, e]) => {
        if (!isUnitMarker(e.data)) elements.delete(id);
      });
    dropStatic();
    const home = new Map<
      google.maps.marker.AdvancedMarkerElement,
      { id: string; at: google.maps.LatLngLiteral }
    >();
    const clustered: google.maps.marker.AdvancedMarkerElement[] = [];
    const plain: google.maps.marker.AdvancedMarkerElement[] = [];
    // Incidents sharing one coordinate would sit exactly on top of each other
    // (and could never be picked apart), so fan them out on a small ring.
    const shown = spreadOverlapping(staticRef.current);
    staticRef.current.forEach((m) => {
      const at = shown.get(m.id) ?? { lat: m.latitude, lng: m.longitude };
      const marker = new markerLib.AdvancedMarkerElement({
        position: at,
        title: m.label,
        content: styledPin(
          m.kind,
          m.color || DEFAULT_PIN_COLOR,
          m.id === selectedRef.current,
        ),
      });
      marker.addListener("click", () => onSelectRef.current(m.id));
      if (m.kind !== "station" && m.kind !== "unit") {
        // Drag an incident pin onto a fire station to alert it.
        marker.gmpDraggable = true;
        marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
          const to = e.latLng;
          const zoom = map.getZoom() ?? 10;
          const pxPerDegLng = (256 * 2 ** zoom) / 360;
          let hit: IncidentMapMarker | null = null;
          let best = 28; // px
          if (to) {
            for (const d of Array.from(elements.values()).map((x) => x.data)) {
              if (d.kind !== "station") continue;
              const dx = (d.longitude - to.lng()) * pxPerDegLng;
              const dy =
                ((d.latitude - to.lat()) * pxPerDegLng) /
                Math.cos((to.lat() * Math.PI) / 180);
              const dist = Math.hypot(dx, dy);
              if (dist < best) {
                best = dist;
                hit = d;
              }
            }
          }
          marker.position = restRef.current.get(m.id) ?? at;
          if (hit) fireDrop(m.id, hit);
        });
      }
      restRef.current.set(m.id, at);
      home.set(marker, { id: m.id, at });
      elements.set(m.id, { marker, data: m });
      // Fire stations and units are never clustered.
      if (m.kind === "station" || m.kind === "unit") {
        bindDropTarget(marker.content as HTMLElement, (id) => fireDrop(id, m));
        marker.map = map;
        plain.push(marker);
      } else clustered.push(marker);
    });
    // Open cluster ("spiderfy"): the pins fan out on a screen-space ring
    // around the cluster at the CURRENT zoom (no zooming in, so nearby fire
    // stations stay visible as drop targets), joined to the centre by legs.
    let open: {
      pins: google.maps.marker.AdvancedMarkerElement[];
      legs: google.maps.Polyline[];
    } | null = null;
    const collapse = () => {
      if (!open) return;
      const { pins, legs } = open;
      open = null;
      legs.forEach((l) => l.setMap(null));
      pins.forEach((pin) => {
        const h = home.get(pin);
        pin.map = null;
        if (h) {
          pin.position = h.at;
          restRef.current.set(h.id, h.at);
        }
      });
      clusterer.addMarkers(pins);
    };
    const expand = (
      pins: google.maps.marker.AdvancedMarkerElement[],
      center: google.maps.LatLng,
    ) => {
      const proj = map.getProjection();
      if (!proj) return;
      collapse();
      clusterer.removeMarkers(pins);
      const scale = 2 ** (map.getZoom() ?? 10);
      const c = proj.fromLatLngToPoint(center);
      if (!c) return;
      const radius = Math.max(50, (pins.length * 38) / (2 * Math.PI));
      const legs: google.maps.Polyline[] = [];
      pins.forEach((pin, i) => {
        const angle = (2 * Math.PI * i) / pins.length - Math.PI / 2;
        const ll = proj.fromPointToLatLng(
          new google.maps.Point(
            c.x + (radius * Math.cos(angle)) / scale,
            c.y + (radius * Math.sin(angle)) / scale,
          ),
        );
        if (!ll) return;
        const pos = { lat: ll.lat(), lng: ll.lng() };
        pin.position = pos;
        pin.map = map;
        const h = home.get(pin);
        if (h) restRef.current.set(h.id, pos);
        legs.push(
          new google.maps.Polyline({
            map,
            path: [center.toJSON(), pos],
            strokeColor: "#475569",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            zIndex: 1,
          }),
        );
      });
      open = { pins, legs };
    };
    const clusterer: MarkerClusterer = new MarkerClusterer({
      map,
      markers: clustered,
      onClusterClick: (_event, cluster, m) => {
        const bounds = cluster.bounds;
        const span = bounds?.toSpan();
        const pins = (cluster.markers ??
          []) as google.maps.marker.AdvancedMarkerElement[];
        if (
          bounds &&
          span &&
          span.lat() < 0.0006 &&
          span.lng() < 0.0006 &&
          pins.length > 1
        ) {
          // Co-located incidents: fan out in place, like the OSM map.
          expand(pins, new google.maps.LatLng(cluster.position));
        } else {
          collapse();
          if (bounds) m.fitBounds(bounds, 60);
        }
      },
    });
    const collapseListeners = [
      map.addListener("click", collapse),
      map.addListener("zoom_changed", collapse),
    ];
    clustererRef.current = clusterer;

    return () => {
      collapseListeners.forEach((l) => l.remove());
      open?.legs.forEach((l) => l.setMap(null));
      open = null;
      clusterer.clearMarkers();
      clusterer.setMap(null);
      plain.forEach((p) => (p.map = null));
      clustererRef.current = null;
      dropStatic();
    };
    // Rebuilt only when the non-unit pins change, not on selection or movement.
  }, [map, markerLib, staticKey]);

  // Fit to all pins (units included) when the set of pins changes.
  useEffect(() => {
    if (!map) return;
    const list = markersRef.current;
    if (list.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    list.forEach((m) => bounds.extend({ lat: m.latitude, lng: m.longitude }));
    const fit = () => {
      map.fitBounds(bounds, 40);
      google.maps.event.addListenerOnce(map, "idle", () => {
        if ((map.getZoom() ?? 0) > 14) map.setZoom(14);
      });
    };
    if (map.getBounds()) fit();
    else google.maps.event.addListenerOnce(map, "idle", fit);
  }, [map, markerKey]);

  // Add, glide and trail the unit pins.
  useEffect(() => {
    if (!map || !markerLib) return;
    const elements = elementsRef.current;
    const live = unitsRef.current;
    const seen = new Set<string>();
    markers.filter(isUnitMarker).forEach((m) => {
      seen.add(m.id);
      const to = { lat: m.latitude, lng: m.longitude };
      const color = m.color || DEFAULT_PIN_COLOR;
      const existing = elements.get(m.id);
      const u = live.get(m.id);
      if (!existing || !u) {
        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position: to,
          title: m.label,
          content: styledPin("unit", color, m.id === selectedRef.current),
        });
        marker.addListener("click", () => onSelectRef.current(m.id));
        bindDropTarget(marker.content as HTMLElement, (id) =>
          fireDrop(id, elements.get(m.id)?.data ?? m),
        );
        const trail = new google.maps.Polyline({
          map,
          path: [],
          clickable: false,
          strokeColor: color,
          strokeOpacity: 0.55,
          strokeWeight: 3,
        });
        elements.set(m.id, { marker, data: m });
        live.set(m.id, { trail, history: [], pos: to, target: to, raf: 0 });
        return;
      }
      existing.data = m;
      existing.marker.title = m.label;
      if (u.target.lat === to.lat && u.target.lng === to.lng) return;
      cancelAnimationFrame(u.raf);
      const from = u.pos;
      u.target = to;
      u.history = [...u.history, from].slice(-TRAIL_POINTS);
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / GLIDE_MS);
        u.pos = {
          lat: from.lat + (to.lat - from.lat) * k,
          lng: from.lng + (to.lng - from.lng) * k,
        };
        existing.marker.position = u.pos;
        u.trail.setPath([...u.history, u.pos]);
        if (k < 1) u.raf = requestAnimationFrame(tick);
      };
      u.raf = requestAnimationFrame(tick);
    });
    // Units that left the map.
    Array.from(live.entries()).forEach(([id, u]) => {
      if (seen.has(id)) return;
      cancelAnimationFrame(u.raf);
      u.trail.setMap(null);
      const e = elements.get(id);
      if (e) e.marker.map = null;
      live.delete(id);
      elements.delete(id);
    });
  }, [map, markerLib, markers]);

  // Tear the units down with the map.
  useEffect(() => {
    const live = unitsRef.current;
    const elements = elementsRef.current;
    return () => {
      live.forEach((u, id) => {
        cancelAnimationFrame(u.raf);
        u.trail.setMap(null);
        const e = elements.get(id);
        if (e) e.marker.map = null;
        elements.delete(id);
      });
      live.clear();
    };
  }, [map, markerLib]);

  // Highlight the selected pin and pan to it (zooming in if it sits in a cluster).
  useEffect(() => {
    if (!map) return;
    // Swapping a pin's content (on selection) replaces its element, so the
    // station/unit drop binding is redone afterwards.
    const bindTarget = (id: string) => {
      const e = elementsRef.current.get(id);
      if (!e || (e.data.kind !== "station" && e.data.kind !== "unit")) return;
      bindDropTarget(e.marker.content as HTMLElement, (incidentId) =>
        fireDrop(incidentId, elementsRef.current.get(id)?.data ?? e.data),
      );
    };
    const prev = prevSelectedRef.current;
    if (prev) {
      const p = elementsRef.current.get(prev);
      if (p)
        p.marker.content = styledPin(
          p.data.kind,
          p.data.color || DEFAULT_PIN_COLOR,
          false,
        );
      bindTarget(prev);
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
    bindTarget(selectedId);
    cur.marker.zIndex = 1000;
    const pos = { lat: cur.data.latitude, lng: cur.data.longitude };
    map.panTo(pos);
    if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
  }, [map, selectedId, markerKey]);

  return null;
}

/** Pans to a searched location and shows a temporary pin there. */
function FocusPin({ point }: { point?: FocusPoint | null }) {
  const map = useMap();
  const markerLib = useMapsLibrary("marker");
  useEffect(() => {
    if (!map || !markerLib || !point) return;
    const el = document.createElement("div");
    el.style.cssText = "display:flex;flex-direction:column;align-items:center";
    el.innerHTML = `<div style="background:#fff;color:#111;font:600 12px sans-serif;padding:2px 8px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.4);margin-bottom:2px;white-space:nowrap">${point.label.replace(/</g, "&lt;")}</div>${pinHtml(undefined, FOCUS_PIN_COLOR, true)}`;
    const marker = new markerLib.AdvancedMarkerElement({
      map,
      position: { lat: point.latitude, lng: point.longitude },
      content: el,
      zIndex: 2000,
    });
    map.panTo({ lat: point.latitude, lng: point.longitude });
    map.setZoom(15);
    return () => {
      marker.map = null;
    };
  }, [map, markerLib, point]);
  return null;
}

/** Draws a road route and fits the map to it. */
function RouteLine({ path }: { path?: IncidentsMapProps["routePath"] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !path || path.length < 2) return;
    const latLngs = path.map((p) => ({ lat: p.latitude, lng: p.longitude }));
    const casing = new google.maps.Polyline({
      map,
      path: latLngs,
      strokeColor: "#ffffff",
      strokeOpacity: 1,
      strokeWeight: 9,
      zIndex: 10,
    });
    const line = new google.maps.Polyline({
      map,
      path: latLngs,
      strokeColor: ROUTE_COLOR,
      strokeOpacity: 1,
      strokeWeight: 5,
      zIndex: 11,
    });
    const bounds = new google.maps.LatLngBounds();
    latLngs.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
    return () => {
      casing.setMap(null);
      line.setMap(null);
    };
  }, [map, path]);
  return null;
}

/** Unit → incident road lines: solid, with a white casing for contrast. */
function LinkLines({ links }: { links?: IncidentsMapProps["links"] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !links?.length) return;
    const lines = links.flatMap((l) => {
      const path = (l.path ?? [l.from, l.to]).map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
      }));
      return [
        new google.maps.Polyline({
          map,
          path,
          strokeColor: "#ffffff",
          strokeOpacity: 0.9,
          strokeWeight: 7,
          zIndex: 8,
        }),
        new google.maps.Polyline({
          map,
          path,
          strokeColor: LINK_COLOR,
          strokeOpacity: 1,
          strokeWeight: 4,
          zIndex: 9,
        }),
      ];
    });
    return () => lines.forEach((p) => p.setMap(null));
  }, [map, links]);
  return null;
}

/** Right-click reports the point so the host can offer "create incident". */
function ContextPoint({
  onContext,
}: {
  onContext?: IncidentsMapProps["onContextPoint"];
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !onContext) return;
    const l = map.addListener("rightclick", (e: google.maps.MapMouseEvent) => {
      const dom = e.domEvent as MouseEvent | undefined;
      if (!e.latLng || !dom) return;
      onContext({
        latitude: e.latLng.lat(),
        longitude: e.latLng.lng(),
        clientX: dom.clientX,
        clientY: dom.clientY,
      });
    });
    return () => l.remove();
  }, [map, onContext]);
  return null;
}

/** Native Google Maps version of the incidents map, clustered. */
export default function IncidentsGoogleMap(props: IncidentsMapProps) {
  const center = useMapDefaultCenter();
  return (
    <GoogleBaseMap
      defaultCenter={{ lat: center.latitude, lng: center.longitude }}
      defaultZoom={center.zoom}
      controls
    >
      <GoogleDefaultView center={center} enabled={props.markers.length === 0} />
      <ClusteredMarkers {...props} />
      <FocusPin point={props.focusPoint} />
      <RouteLine path={props.routePath} />
      <LinkLines links={props.links} />
      <ContextPoint onContext={props.onContextPoint} />
    </GoogleBaseMap>
  );
}
