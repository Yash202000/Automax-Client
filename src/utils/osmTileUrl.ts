export function getOsmTileUrl(): string {
  const apiUrl = window.APP_CONFIG?.API_URL || import.meta.env.VITE_API_URL;
  const baseUrl = (apiUrl || "").split("/api/v1")[0];
  return `${baseUrl}/osm-tiles/{z}/{x}/{y}.png`;
}
