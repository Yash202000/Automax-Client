export interface IncidentMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  /** Short label shown on hover (e.g. the incident number). */
  label: string;
  /** Pin colour, usually the incident's workflow-state colour. */
  color?: string;
  /** Pin shape: incident = circle, station = square, unit = diamond. */
  kind?: "incident" | "station" | "unit";
}

export interface IncidentsMapProps {
  markers: IncidentMapMarker[];
  selectedId: string | null;
  // eslint-disable-next-line no-unused-vars
  onSelect: (id: string) => void;
  /** An incident dragged from the list was dropped on a station/unit pin. */
  // eslint-disable-next-line no-unused-vars
  onDropIncident?: (incidentId: string, target: IncidentMapMarker) => void;
  /** Searched location: the map flies there and shows a temporary pin. */
  focusPoint?: FocusPoint | null;
}

export interface FocusPoint {
  latitude: number;
  longitude: number;
  label: string;
  /** Changes on every search so re-picking the same place flies again. */
  nonce: number;
}

export const FOCUS_PIN_COLOR = "#7c3aed";

/** dataTransfer type carrying the id of an incident dragged from the list. */
export const INCIDENT_DRAG_TYPE = "application/x-incident-id";

/**
 * Make a pin element accept incident drops (HTML5 drag & drop), scaling the
 * pin up while an incident is dragged over it.
 */
export function bindDropTarget(
  el: HTMLElement,
  // eslint-disable-next-line no-unused-vars
  onDrop: (incidentId: string) => void,
): void {
  if (el.dataset.dropBound) return;
  el.dataset.dropBound = "1";
  // Keep drag events on the pin element itself rather than its SVG children.
  el.querySelectorAll<HTMLElement | SVGElement>("*").forEach((c) => {
    c.style.pointerEvents = "none";
  });
  const inner = el.firstElementChild as HTMLElement | null;
  const highlight = (on: boolean) => {
    if (!inner) return;
    inner.style.transition = "transform .12s";
    inner.style.transform = on ? "scale(1.4)" : "";
  };
  el.addEventListener("dragover", (e) => {
    if (!e.dataTransfer?.types.includes(INCIDENT_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    highlight(true);
  });
  el.addEventListener("dragleave", () => highlight(false));
  el.addEventListener("drop", (e) => {
    const id = e.dataTransfer?.getData(INCIDENT_DRAG_TYPE);
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    highlight(false);
    onDrop(id);
  });
}

export const DEFAULT_PIN_COLOR = "#dc2626";

/** Full HTML for a pin: an SVG fire station for stations, a CSS shape otherwise. */
export function pinHtml(
  kind: IncidentMapMarker["kind"],
  color: string,
  selected: boolean,
): string {
  if (kind !== "station" && kind !== "unit") {
    // Incident: teardrop map pin with an exclamation mark.
    const { w, h } = pinSize(kind, selected);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 40" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">
<path d="M16 38.5S3 24.5 3 15.5a13 13 0 0 1 26 0c0 9-13 23-13 23z" fill="${color}" stroke="#fff" stroke-width="2"/>
<circle cx="16" cy="15.5" r="8" fill="#fff"/>
<rect x="14.8" y="10.5" width="2.4" height="6" rx="1.2" fill="${color}"/>
<circle cx="16" cy="19.6" r="1.4" fill="${color}"/>
</svg>`;
  }
  const size = selected ? 40 : 32;
  if (kind === "unit") {
    // Fire truck, side view.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))">
<circle cx="16" cy="16" r="13" fill="${color}" stroke="#fff" stroke-width="2"/>
<rect x="6.5" y="12" width="12" height="7" rx="1" fill="#fff"/>
<path d="M19.5 14h3.2l2.3 2.6V19h-5.5z" fill="#fff"/>
<rect x="8" y="10.4" width="8" height="1.2" rx=".6" fill="#fff"/>
<rect x="9" y="13.2" width="2.6" height="2.4" fill="${color}"/>
<rect x="13" y="13.2" width="2.6" height="2.4" fill="${color}"/>
<circle cx="10.5" cy="20" r="2" fill="#fff" stroke="${color}" stroke-width="1.2"/>
<circle cx="21.5" cy="20" r="2" fill="#fff" stroke="${color}" stroke-width="1.2"/>
</svg>`;
  }
  const ring = selected
    ? `<circle cx="16" cy="16" r="15" fill="none" stroke="${color}" stroke-width="2"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))">
<circle cx="16" cy="16" r="13" fill="${color}" stroke="#fff" stroke-width="2"/>${ring}
<path d="M7.5 23.5V13.2L16 8.5l8.5 4.7v10.3z" fill="#fff"/>
<rect x="12" y="16" width="8" height="7.5" rx="1" fill="${color}"/>
<path d="M16 17.2c1.2.8 1.9 1.7 1.9 2.9a1.9 1.9 0 0 1-3.8 0c0-.6.3-1.2.6-1.5.2.4.5.6.8.6-.2-.8 0-1.4.5-2z" fill="#fff"/>
<circle cx="16" cy="12.6" r="1.1" fill="${color}"/>
</svg>`;
}

/** Rendered pin size in px. Incident pins are teardrops anchored at the tip. */
export function pinSize(
  kind: IncidentMapMarker["kind"],
  selected: boolean,
): { w: number; h: number } {
  if (kind === "station" || kind === "unit") {
    const n = selected ? 40 : 32;
    return { w: n, h: n };
  }
  return selected ? { w: 36, h: 45 } : { w: 28, h: 35 };
}

/**
 * Drop animation on a station/unit pin: the pin bounces and a ring ripples
 * out. `onDone` runs when it finishes (the assignment is applied then, since
 * it rebuilds the markers and would cut the animation short).
 */
export function playDropAnimation(
  el: HTMLElement | null | undefined,
  color: string,
  onDone: () => void,
): void {
  if (!el || typeof el.animate !== "function") {
    onDone();
    return;
  }
  const inner = el.firstElementChild as HTMLElement | null;
  if (inner) inner.style.transform = "";
  inner?.animate(
    [
      { transform: "scale(1.5)" },
      { transform: "scale(0.85)", offset: 0.45 },
      { transform: "scale(1.15)", offset: 0.7 },
      { transform: "scale(1)" },
    ],
    { duration: 520, easing: "ease-out" },
  );
  if (getComputedStyle(el).position === "static")
    el.style.position = "relative";
  const ring = document.createElement("div");
  ring.style.cssText = `position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;border:3px solid ${color};pointer-events:none`;
  el.appendChild(ring);
  const anim = ring.animate(
    [
      { transform: "scale(0.6)", opacity: 0.9 },
      { transform: "scale(2.6)", opacity: 0 },
    ],
    { duration: 600, easing: "ease-out" },
  );
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    ring.remove();
    onDone();
  };
  anim.onfinish = finish;
  setTimeout(finish, 800);
}
