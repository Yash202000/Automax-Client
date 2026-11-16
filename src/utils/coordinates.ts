// Coordinates from the API (or form state) sometimes arrive as strings, e.g.
// decimals serialized as "26.3078". Google Maps rejects anything that isn't a
// real number, so every coordinate handed to a map goes through here first.

/** Convert a coordinate-like value to a finite number, or undefined. */
export function toCoordinate(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const normalized = typeof value === "number" ? value : String(value).trim();
  if (normalized === "") return undefined;
  const n = typeof normalized === "number" ? normalized : Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

/** Like toCoordinate, but falls back to 0 so it can be passed straight to a map. */
export function toCoordinateOr(value: unknown, fallback = 0): number {
  return toCoordinate(value) ?? fallback;
}
