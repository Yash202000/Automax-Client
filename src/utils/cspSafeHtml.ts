/**
 * Turns an HTML string that contains inline `style="..."` attributes into a DOM
 * element without violating a strict `style-src` CSP.
 *
 * Inline style attributes are blocked by CSP when they are parsed from markup
 * inside the page (innerHTML, Leaflet's divIcon/bindPopup string content). The
 * CSSOM (`el.style.cssText`) is allowed, so the markup is parsed in an inert
 * DOMParser document and each style attribute is moved onto the CSSOM.
 */
export function cspSafeHtml(html: string): HTMLElement {
  const doc = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    "text/html",
  );
  const root = doc.body;

  root.querySelectorAll<HTMLElement | SVGElement>("[style]").forEach((el) => {
    const css = el.getAttribute("style") ?? "";
    el.removeAttribute("style");
    el.style.cssText = css;
  });

  const wrapper = document.createElement("div");
  while (root.firstChild) {
    wrapper.appendChild(document.adoptNode(root.firstChild));
  }
  return wrapper;
}

/** Escapes text for safe interpolation into an HTML string (content or quoted attribute). */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
